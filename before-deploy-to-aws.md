# FixMyCity — AWS Pre-Deployment Checklist & Guide

Here is the complete guide of everything you need to change and prepare before deploying **FixMyCity** to AWS.

---

### 1. Frontend Build-Time Configuration (Most Critical)

In Next.js, variables prefixed with `NEXT_PUBLIC_*` are **baked directly into the compiled JavaScript bundle at build time**. They cannot simply be changed at container runtime.

- **File**: `frontend/.env.prod` (or passed as `--build-arg NEXT_PUBLIC_API_URL=...` during image build)
- **What to change**:

  ```env
  # CURRENT (local):
  NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

  # CHANGE TO (your public AWS domain or ALB DNS):
  NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
  # OR if not using a custom domain yet:
  # NEXT_PUBLIC_API_URL=http://<YOUR-ALB-DNS-NAME>/api/v1
  ```

  > [!IMPORTANT]
  > You **must rebuild the frontend container image** after setting this URL so the browser client knows where to send API calls from public users' devices.

---

### 2. Backend Environment Variables (`backend/.env.prod` / AWS Parameter Store / Secrets Manager)

| Variable                    | Current (Local)                | What to Change for AWS                                           | Reason / Details                                                                                           |
| :-------------------------- | :----------------------------- | :--------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| **`DATABASE_HOST`**         | `app_mysql_1` (or `localhost`) | `fixmycity-prod.xxxxxx.us-east-1.rds.amazonaws.com`              | Your AWS RDS MySQL endpoint.                                                                               |
| **`DATABASE_USER`**         | `appuser`                      | Master or dedicated RDS user (e.g. `admin` / `appuser`)          | Must match your RDS instance configuration.                                                                |
| **`DATABASE_PASSWORD`**     | `passuser`                     | Strong RDS password                                              | Store in AWS Secrets Manager or Parameter Store.                                                           |
| **`DATABASE_SYNCHRONIZE`**  | `false`                        | `false`                                                          | **Keep `false`** to avoid accidental data loss. Run migrations instead.                                    |
| **`CORS_ORIGIN`**           | `http://localhost:3000`        | `https://yourdomain.com,https://www.yourdomain.com` (or ALB URL) | Whitelists the frontend domain so browsers can make API calls. Multiple origins can be comma-separated.    |
| **`AWS_REGION`**            | `us-east-1`                    | Your target region (e.g. `us-east-1`, `eu-west-1`)               | Where S3, SNS, and RDS are hosted.                                                                         |
| **`AWS_S3_BUCKET_NAME`**    | `fixmycity-media-env`          | Your production S3 bucket name (e.g. `fixmycity-media-prod`)     | Must match the actual AWS S3 bucket created.                                                               |
| **`AWS_SNS_TOPIC_ARN`**     | `""`                           | `arn:aws:sns:us-east-1:123456789012:fixmycity-alerts`            | Enables alerts to technicians/agents when new incidents are created.                                       |
| **`AWS_ALB_DNS_NAME`**      | `""`                           | Your ALB DNS or domain name                                      | E.g. `fixmycity-alb-123456789.us-east-1.elb.amazonaws.com`.                                                |
| **`AWS_ACCESS_KEY_ID`**     | (dev credentials)              | **LEAVE BLANK**                                                  | AWS best practice: ECS Task Roles or EC2 Instance Profiles automatically provide rotating IAM credentials. |
| **`AWS_SECRET_ACCESS_KEY`** | (dev credentials)              | **LEAVE BLANK**                                                  | Do not store static credentials inside container envs on AWS.                                              |
| **`AWS_ENDPOINT_URL`**      | (optional LocalStack)          | **LEAVE BLANK**                                                  | Allows AWS SDK to talk to real AWS S3 and SNS endpoints directly.                                          |
| **`JWT_SECRET`**            | Dev secret                     | High-entropy 256-bit random string                               | Protects authentication tokens in production.                                                              |

---

### 3. S3 Bucket CORS Configuration

Citizens upload photos directly from their web browsers to S3 using pre-signed PUT URLs. S3 will block the browser unless S3 CORS is enabled for your AWS domain.

- **File**: `scripts/s3-cors.json`
- **What to change in `AllowedOrigins`**:
  ```json
  {
    "CORSRules": [
      {
        "ID": "fixmycity-browser-upload",
        "AllowedOrigins": [
          "https://yourdomain.com",
          "https://www.yourdomain.com",
          "http://<your-frontend-alb-dns>"
        ],
        "AllowedMethods": ["PUT", "GET", "HEAD"],
        "AllowedHeaders": ["Content-Type", "Content-Length", "Content-MD5"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3600
      }
    ]
  }
  ```
- **Command to apply**:
  ```bash
  aws s3api put-bucket-cors --bucket <your-s3-bucket-name> --cors-configuration file://scripts/s3-cors.json
  ```

---

### 4. AWS IAM Roles & Permissions (Least Privilege)

Your backend container running on ECS (Task Role) or EC2 (Instance Profile) needs an IAM policy attached with:

- **S3 Permissions**:
  ```json
  {
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:HeadBucket"],
    "Resource": "arn:aws:s3:::<your-s3-bucket-name>/*"
  }
  ```
- **SNS Permissions**:
  ```json
  {
    "Effect": "Allow",
    "Action": "sns:Publish",
    "Resource": "arn:aws:sns:<region>:<account-id>:<topic-name>"
  }
  ```

---

### 5. AWS VPC & Security Groups

Ensure traffic is locked down properly:

```
[Internet]
    │ (Ports 80 / 443)
    ▼
[Application Load Balancer (ALB)]
    │
    ├─► Port 3000 ──► [Frontend Container (ECS / EC2)]
    │
    └─► Port 4000 ──► [Backend Container (ECS / EC2)]
                            │
                            ▼ (Port 3306)
                      [RDS MySQL (Private Subnet Only)]
```

- **ALB Security Group**:
  - Inbound: HTTP (`80`) and HTTPS (`443`) from `0.0.0.0/0`.
- **Frontend Security Group**:
  - Inbound: Port `3000` **only** from the ALB Security Group.
- **Backend Security Group**:
  - Inbound: Port `4000` **only** from the ALB Security Group.
- **RDS MySQL Security Group**:
  - Inbound: Port `3306` **only** from the Backend Security Group.
  - _Never make RDS publicly accessible._

---

### 6. Health Checks Configuration on AWS ALB

Set your ALB Target Groups to use the built-in health routes:

- **Backend Target Group**:
  - Protocol / Port: `HTTP:4000`
  - Health Check Path: `/api/v1/health`
  - Expected HTTP Status: `200`
- **Frontend Target Group**:
  - Protocol / Port: `HTTP:3000`
  - Health Check Path: `/`
  - Expected HTTP Status: `200`

---

### 7. Container Images & Deployment Workflow

1. **Build images** targeting production:

   ```bash
   # Build backend
   ./scripts/build-images.sh 1.0.0 --backend-only

   # Build frontend (baking your AWS API URL)
   NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api/v1" ./scripts/build-images.sh 1.0.0 --frontend-only
   ```

2. **Push to Amazon ECR (Elastic Container Registry)**:
   ```bash
   aws ecr get-login-password --region <region> | podman login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
   podman tag fixmycity-backend:1.0.0 <account-id>.dkr.ecr.<region>.amazonaws.com/fixmycity-backend:1.0.0
   podman tag fixmycity-frontend:1.0.0 <account-id>.dkr.ecr.<region>.amazonaws.com/fixmycity-frontend:1.0.0
   podman push <account-id>.dkr.ecr.<region>.amazonaws.com/fixmycity-backend:1.0.0
   podman push <account-id>.dkr.ecr.<region>.amazonaws.com/fixmycity-frontend:1.0.0
   ```
3. **Database Migration / Seed (One-time setup on RDS)**:
   Run the TypeORM migrations or schema initialization and seed default admin/agents before public launch:
   ```bash
   npm run migration:run
   npm run seed
   ```
