#!/usr/bin/env python3
"""
==============================================================================
FixMyCity — AWS Variable Retrieval & ECR Deployment Pipeline
==============================================================================
Retrieves production infrastructure variables from AWS (SSM Parameter Store,
Secrets Manager, RDS, S3, SNS, and ALB) using boto3, injects them into
production .env files, builds container images with build arguments, tags
them for Amazon Elastic Container Registry (ECR), and pushes them to AWS.

Usage:
  ./scripts/deploy-images.py [OPTIONS]

Examples:
  ./scripts/deploy-images.py --version 1.0.0
  ./scripts/deploy-images.py --version 1.0.0 --region us-east-1
  ./scripts/deploy-images.py --dry-run
  ./scripts/deploy-images.py --backend-only --version 1.0.1
==============================================================================
"""

import argparse
import base64
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:
    print(
        "\033[0;31m[ERROR] 'boto3' is required to run this script. Install it with:\n"
        "  pip install boto3\033[0m",
        file=sys.stderr,
    )
    sys.exit(1)

# ANSI Colors
RED = "\033[0;31m"
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
BLUE = "\033[0;34m"
CYAN = "\033[0;36m"
BOLD = "\033[1m"
NC = "\033[0m"

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
BACKEND_ENV_FILE = BACKEND_DIR / ".env.prod"
FRONTEND_ENV_FILE = FRONTEND_DIR / ".env.prod"

BACKEND_REPO_NAME = "fixmycity-backend"
FRONTEND_REPO_NAME = "fixmycity-frontend"


def log_info(msg: str) -> None:
    print(f"{BLUE}[INFO]{NC} {msg}")


def log_success(msg: str) -> None:
    print(f"{GREEN}✓{NC} {msg}")


def log_warning(msg: str) -> None:
    print(f"{YELLOW}[WARNING]{NC} {msg}")


def log_error(msg: str) -> None:
    print(f"{RED}[ERROR]{NC} {msg}", file=sys.stderr)


def detect_container_cli(preference: str = "auto") -> str:
    """Detect available container engine: prioritizing podman over docker."""
    env_cli = os.getenv("CONTAINER_CLI", "").strip().lower()
    if preference != "auto":
        candidates = [preference]
    elif env_cli:
        candidates = [env_cli]
    else:
        # Prioritize podman over docker
        candidates = ["podman", "docker"]

    for cli in candidates:
        if shutil.which(cli):
            # Check if engine daemon/socket responds
            try:
                subprocess.run(
                    [cli, "info"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=True,
                )
                return cli
            except Exception:
                continue

    # Fallback to binary check if daemon check failed
    for cli in candidates:
        if shutil.which(cli):
            return cli

    log_error("Neither 'podman' nor 'docker' CLI found or functioning.")
    sys.exit(1)


def parse_env_file(path: Path) -> Dict[str, str]:
    """Parse existing key-value pairs from an .env file."""
    env: Dict[str, str] = {}
    if not path.is_file():
        return env

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                env[key] = val
    return env


def write_env_file(path: Path, new_values: Dict[str, str]) -> None:
    """
    Safely update or create an .env file preserving existing keys and comments,
    and backing up the previous version.
    """
    if path.is_file():
        backup_path = path.with_suffix(".prod.bak")
        shutil.copyfile(path, backup_path)
        log_info(f"Backed up {path.name} to {backup_path.name}")

    existing_lines = []
    keys_updated = set()

    if path.is_file():
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if stripped and not stripped.startswith("#") and "=" in stripped:
                    key = stripped.split("=", 1)[0].strip()
                    if key in new_values:
                        existing_lines.append(f"{key}={new_values[key]}\n")
                        keys_updated.add(key)
                        continue
                existing_lines.append(line)
    else:
        existing_lines.append(f"# FixMyCity Auto-Generated Environment for AWS\n")

    # Append any brand new keys not already in file
    for key, val in new_values.items():
        if key not in keys_updated:
            existing_lines.append(f"{key}={val}\n")

    with open(path, "w", encoding="utf-8") as f:
        f.writelines(existing_lines)

    log_success(f"Updated environment configuration: {path}")


class AWSConfigDiscoverer:
    """Discovers configuration from AWS services via boto3."""

    def __init__(
        self,
        session: boto3.Session,
        ssm_prefix: str,
        secret_name: str,
        endpoint_url: Optional[str] = None,
    ):
        self.session = session
        self.region = session.region_name or "us-east-1"
        self.ssm_prefix = ssm_prefix.rstrip("/") + "/"
        self.secret_name = secret_name
        self.endpoint_url = endpoint_url
        self.discovered: Dict[str, str] = {}

    def _client(self, service_name: str):
        kwargs = {"region_name": self.region}
        if self.endpoint_url:
            kwargs["endpoint_url"] = self.endpoint_url
        return self.session.client(service_name, **kwargs)

    def discover_all(self) -> Dict[str, str]:
        print(f"\n{BOLD}{CYAN}── Discovering AWS Infrastructure in region '{self.region}' ──{NC}")
        self._discover_from_secrets_manager()
        self._discover_from_ssm()
        self._discover_rds()
        self._discover_s3()
        self._discover_sns()
        self._discover_alb()
        return self.discovered

    def _discover_from_secrets_manager(self) -> None:
        """Fetch credentials or secrets stored in AWS Secrets Manager."""
        if not self.secret_name:
            return
        try:
            sm = self._client("secretsmanager")
            resp = sm.get_secret_value(SecretId=self.secret_name)
            secret_str = resp.get("SecretString")
            if secret_str:
                import json
                try:
                    data = json.loads(secret_str)
                    for k, v in data.items():
                        self.discovered[k] = str(v)
                    log_success(f"Loaded secrets from Secrets Manager: {self.secret_name}")
                except json.JSONDecodeError:
                    self.discovered["DATABASE_PASSWORD"] = secret_str
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code in ("ResourceNotFoundException", "AccessDeniedException"):
                log_info(f"Secrets Manager secret '{self.secret_name}' not found or access denied ({code}). Skipping.")
            else:
                log_warning(f"Secrets Manager query failed: {e}")
        except Exception as e:
            log_warning(f"Secrets Manager exception: {e}")

    def _discover_from_ssm(self) -> None:
        """Fetch parameters from SSM Parameter Store under prefix."""
        try:
            ssm = self._client("ssm")
            paginator = ssm.get_paginator("get_parameters_by_path")
            found = 0
            for page in paginator.paginate(
                Path=self.ssm_prefix,
                Recursive=True,
                WithDecryption=True,
            ):
                for param in page.get("Parameters", []):
                    name = param["Name"]
                    # Extract parameter key name relative to prefix
                    key = name[len(self.ssm_prefix):].replace("/", "_").upper()
                    self.discovered[key] = param["Value"]
                    found += 1
            if found > 0:
                log_success(f"Discovered {found} parameters from SSM path {self.ssm_prefix}")
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            log_info(f"SSM Parameter Store prefix '{self.ssm_prefix}' skipped ({code or e}).")
        except Exception as e:
            log_warning(f"SSM discovery exception: {e}")

    def _discover_rds(self) -> None:
        """Find RDS MySQL instance for FixMyCity."""
        if "DATABASE_HOST" in self.discovered:
            return
        try:
            rds = self._client("rds")
            instances = rds.describe_db_instances().get("DBInstances", [])
            for db in instances:
                db_id = db.get("DBInstanceIdentifier", "")
                if "fixmycity" in db_id.lower() or "fix-my-city" in db_id.lower():
                    endpoint = db.get("Endpoint", {})
                    host = endpoint.get("Address")
                    port = endpoint.get("Port", 3306)
                    if host:
                        self.discovered["DATABASE_HOST"] = host
                        self.discovered["DATABASE_PORT"] = str(port)
                        log_success(f"Discovered RDS Endpoint: {host}:{port} ({db_id})")
                        break
        except Exception as e:
            log_info(f"RDS auto-discovery skipped: {e}")

    def _discover_s3(self) -> None:
        """Find S3 media storage bucket."""
        if "AWS_S3_BUCKET_NAME" in self.discovered:
            return
        try:
            s3 = self._client("s3")
            buckets = s3.list_buckets().get("Buckets", [])
            for b in buckets:
                name = b.get("Name", "")
                if "fixmycity" in name.lower() and ("media" in name.lower() or "storage" in name.lower()):
                    self.discovered["AWS_S3_BUCKET_NAME"] = name
                    log_success(f"Discovered S3 Bucket: {name}")
                    break
        except Exception as e:
            log_info(f"S3 auto-discovery skipped: {e}")

    def _discover_sns(self) -> None:
        """Find SNS alert topic ARN."""
        if "AWS_SNS_TOPIC_ARN" in self.discovered:
            return
        try:
            sns = self._client("sns")
            topics = sns.list_topics().get("Topics", [])
            for t in topics:
                arn = t.get("TopicArn", "")
                if "fixmycity" in arn.lower():
                    self.discovered["AWS_SNS_TOPIC_ARN"] = arn
                    log_success(f"Discovered SNS Topic: {arn}")
                    break
        except Exception as e:
            log_info(f"SNS auto-discovery skipped: {e}")

    def _discover_alb(self) -> None:
        """Find Application Load Balancer DNS name."""
        if "AWS_ALB_DNS_NAME" in self.discovered:
            return
        try:
            elbv2 = self._client("elbv2")
            lbs = elbv2.describe_load_balancers().get("LoadBalancers", [])
            for lb in lbs:
                name = lb.get("LoadBalancerName", "")
                if "fixmycity" in name.lower() or "fix-my-city" in name.lower():
                    dns = lb.get("DNSName")
                    if dns:
                        self.discovered["AWS_ALB_DNS_NAME"] = dns
                        log_success(f"Discovered ALB DNS Name: {dns} ({name})")
                        break
        except Exception as e:
            log_info(f"ALB auto-discovery skipped: {e}")


def ensure_ecr_repository(ecr_client: Any, repo_name: str) -> str:
    """Ensure ECR repository exists and return its repository URI."""
    try:
        resp = ecr_client.describe_repositories(repositoryNames=[repo_name])
        uri = resp["repositories"][0]["repositoryUri"]
        log_info(f"ECR repository '{repo_name}' already exists: {uri}")
        return uri
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code == "RepositoryNotFoundException":
            log_info(f"ECR repository '{repo_name}' not found. Creating it...")
            create_resp = ecr_client.create_repository(
                repositoryName=repo_name,
                imageScanningConfiguration={"scanOnPush": True},
                imageTagMutability="MUTABLE",
            )
            uri = create_resp["repository"]["repositoryUri"]
            log_success(f"Created ECR repository: {uri}")
            return uri
        raise


def ecr_login(
    cli: str,
    session: boto3.Session,
    region: str,
    endpoint_url: Optional[str] = None,
) -> str:
    """Authenticate container engine (docker/podman) with Amazon ECR."""
    kwargs = {"region_name": region}
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url
    ecr = session.client("ecr", **kwargs)
    resp = ecr.get_authorization_token()
    auth_data = resp["authorizationData"][0]
    token = auth_data["authorizationToken"]
    proxy_endpoint = auth_data["proxyEndpoint"]

    decoded = base64.b64decode(token).decode("utf-8")
    username, password = decoded.split(":", 1)

    log_info(f"Authenticating {cli} with Amazon ECR registry: {proxy_endpoint}")
    cmd = [cli, "login", "-u", username, "--password-stdin", proxy_endpoint]
    proc = subprocess.run(
        cmd,
        input=password.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        log_error(f"ECR login failed:\n{proc.stderr.decode('utf-8')}")
        sys.exit(proc.returncode)

    log_success(f"Successfully authenticated {cli} with Amazon ECR!")
    return proxy_endpoint.replace("https://", "")


def run_command(cmd: list, cwd: Optional[Path] = None, env: Optional[Dict[str, str]] = None) -> None:
    """Run shell command with streaming output."""
    cmd_str = " ".join(cmd)
    log_info(f"Executing: {cmd_str}")
    proc = subprocess.run(cmd, cwd=cwd, env=env)
    if proc.returncode != 0:
        log_error(f"Command failed with exit code {proc.returncode}: {cmd_str}")
        sys.exit(proc.returncode)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="FixMyCity AWS Variable Retrieval & ECR Deployment Tool",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--version", default="0.1.0", help="Version tag to apply to built images")
    parser.add_argument("--region", default=os.getenv("AWS_REGION", "us-east-1"), help="Target AWS region")
    parser.add_argument("--profile", default=os.getenv("AWS_PROFILE"), help="AWS CLI profile to use")
    parser.add_argument("--endpoint-url", default=os.getenv("AWS_ENDPOINT_URL"), help="Custom AWS endpoint URL (e.g. for LocalStack or custom proxy)")
    parser.add_argument("--cli", choices=["auto", "podman", "docker"], default="auto", help="Container CLI engine (defaults to podman if available)")
    parser.add_argument("--ssm-prefix", default="/fixmycity/prod/", help="SSM Parameter Store prefix")
    parser.add_argument("--secret-name", default="fixmycity/production", help="AWS Secrets Manager secret name")
    parser.add_argument("--api-url", help="Override public backend API URL baked into frontend (e.g. https://api.domain.com/api/v1)")
    parser.add_argument("--cors-origin", help="Override backend CORS allowed origin")
    parser.add_argument("--backend-only", action="store_true", help="Build and push backend image only")
    parser.add_argument("--frontend-only", action="store_true", help="Build and push frontend image only")
    parser.add_argument("--no-cache", action="store_true", help="Build images without using cache")
    parser.add_argument("--dry-run", action="store_true", help="Retrieve variables and update .env files without building or pushing")

    args = parser.parse_args()

    print(f"\n{BOLD}{BLUE}================================================================{NC}")
    print(f"{BOLD}{BLUE}   FixMyCity — AWS Variable Retrieval & ECR Pipeline            {NC}")
    print(f"{BOLD}{BLUE}================================================================{NC}")
    print(f"  Target Version:      {BOLD}{args.version}{NC}")
    print(f"  AWS Region:          {BOLD}{args.region}{NC}")
    if args.profile:
        print(f"  AWS Profile:         {BOLD}{args.profile}{NC}")
    if args.endpoint_url:
        print(f"  Custom Endpoint:     {BOLD}{args.endpoint_url}{NC}")
    print(f"  Mode:                {'DRY RUN (No build/push)' if args.dry_run else 'Full Build & Deploy'}")
    print("----------------------------------------------------------------")

    # 1. Initialize AWS Session and Validate Identity
    session_kwargs = {"region_name": args.region}
    if args.profile:
        session_kwargs["profile_name"] = args.profile

    try:
        session = boto3.Session(**session_kwargs)
        client_kwargs = {}
        if args.endpoint_url:
            client_kwargs["endpoint_url"] = args.endpoint_url

        sts = session.client("sts", **client_kwargs)
        identity = sts.get_caller_identity()
        account_id = identity["Account"]
        arn = identity["Arn"]
        log_success(f"AWS Authenticated: Account {BOLD}{account_id}{NC} ({arn})")
    except (BotoCoreError, ClientError) as e:
        log_error(f"AWS Authentication failed: {e}")
        log_error("Make sure your AWS credentials (AWS_ACCESS_KEY_ID or aws configure) are valid.")
        sys.exit(1)

    # 2. Discover AWS Infrastructure Variables
    discoverer = AWSConfigDiscoverer(
        session,
        ssm_prefix=args.ssm_prefix,
        secret_name=args.secret_name,
        endpoint_url=args.endpoint_url,
    )
    aws_vars = discoverer.discover_all()

    # 3. Read existing .env.prod configs
    existing_backend = parse_env_file(BACKEND_ENV_FILE)
    existing_frontend = parse_env_file(FRONTEND_ENV_FILE)

    # 4. Synthesize Production Backend Variables
    db_host = aws_vars.get("DATABASE_HOST") or existing_backend.get("DATABASE_HOST", "localhost")
    db_port = aws_vars.get("DATABASE_PORT") or existing_backend.get("DATABASE_PORT", "3306")
    db_user = aws_vars.get("DATABASE_USER") or existing_backend.get("DATABASE_USER", "appuser")
    db_pass = aws_vars.get("DATABASE_PASSWORD") or existing_backend.get("DATABASE_PASSWORD", "passuser")
    db_name = aws_vars.get("DATABASE_NAME") or existing_backend.get("DATABASE_NAME", "fixmycity")
    s3_bucket = aws_vars.get("AWS_S3_BUCKET_NAME") or existing_backend.get("AWS_S3_BUCKET_NAME", "fixmycity-media-storage-production")
    sns_arn = aws_vars.get("AWS_SNS_TOPIC_ARN") or existing_backend.get("AWS_SNS_TOPIC_ARN", "")
    alb_dns = aws_vars.get("AWS_ALB_DNS_NAME") or existing_backend.get("AWS_ALB_DNS_NAME", "")
    jwt_secret = aws_vars.get("JWT_SECRET") or existing_backend.get("JWT_SECRET", "production-secret-change-me")

    # Determine CORS Origin: user override -> AWS vars -> ALB -> existing -> fallback
    cors_origin = args.cors_origin or aws_vars.get("CORS_ORIGIN")
    if not cors_origin and alb_dns:
        cors_origin = f"http://{alb_dns}"
    if not cors_origin:
        cors_origin = existing_backend.get("CORS_ORIGIN", "http://localhost:3000")

    backend_payload = {
        "PORT": "4000",
        "NODE_ENV": "production",
        "CORS_ORIGIN": cors_origin,
        "DATABASE_HOST": db_host,
        "DATABASE_PORT": db_port,
        "DATABASE_USER": db_user,
        "DATABASE_PASSWORD": db_pass,
        "DATABASE_NAME": db_name,
        "DATABASE_SYNCHRONIZE": "false",
        "DATABASE_LOGGING": "false",
        "JWT_SECRET": jwt_secret,
        "JWT_EXPIRATION": existing_backend.get("JWT_EXPIRATION", "3600s"),
        "AWS_REGION": args.region,
        "AWS_S3_BUCKET_NAME": s3_bucket,
        "AWS_SNS_TOPIC_ARN": sns_arn,
        "AWS_ALB_DNS_NAME": alb_dns,
        # Blank for AWS EC2/ECS IAM Task Role
        "AWS_ACCESS_KEY_ID": "",
        "AWS_SECRET_ACCESS_KEY": "",
        "AWS_ENDPOINT_URL": "",
    }

    # 5. Synthesize Production Frontend Variables
    if args.api_url:
        api_url = args.api_url.rstrip("/")
    elif alb_dns:
        api_url = f"http://{alb_dns}/api/v1"
    else:
        api_url = existing_frontend.get("NEXT_PUBLIC_API_URL", "http://localhost:4000/api/v1")

    frontend_payload = {
        "NEXT_PUBLIC_API_URL": api_url,
        "PORT": "3000",
    }

    print(f"\n{BOLD}{CYAN}── Production Environment Injection ──{NC}")
    print(f"  Backend DATABASE_HOST:     {BOLD}{db_host}{NC}")
    print(f"  Backend S3 Bucket:         {BOLD}{s3_bucket}{NC}")
    print(f"  Backend SNS Topic:         {BOLD}{sns_arn or '(none)'}{NC}")
    print(f"  Backend ALB DNS:           {BOLD}{alb_dns or '(none)'}{NC}")
    print(f"  Backend CORS Origin:       {BOLD}{cors_origin}{NC}")
    print(f"  Frontend NEXT_PUBLIC_API_URL: {BOLD}{api_url}{NC}")

    # Write files
    write_env_file(BACKEND_ENV_FILE, backend_payload)
    write_env_file(FRONTEND_ENV_FILE, frontend_payload)

    if args.dry_run:
        print(f"\n{GREEN}{BOLD}✓ Dry run complete. Environment files prepared successfully.{NC}\n")
        return

    # 6. Container Engine Detection & ECR Setup
    cli = detect_container_cli(args.cli)
    log_info(f"Using container engine: {BOLD}{cli}{NC}")

    registry_host = ecr_login(cli, session, args.region, endpoint_url=args.endpoint_url)
    ecr_kwargs = {"region_name": args.region}
    if args.endpoint_url:
        ecr_kwargs["endpoint_url"] = args.endpoint_url
    ecr = session.client("ecr", **ecr_kwargs)

    build_backend = not args.frontend_only
    build_frontend = not args.backend_only

    deployed_images = []

    # 7. Build, Tag & Push Backend
    if build_backend:
        print(f"\n{BOLD}{YELLOW}[BUILD & DEPLOY] Backend Container{NC}")
        repo_uri = ensure_ecr_repository(ecr, BACKEND_REPO_NAME)
        tag_version = f"{repo_uri}:{args.version}"
        tag_latest = f"{repo_uri}:latest"

        build_cmd = [cli, "build", "-t", BACKEND_REPO_NAME, "-t", tag_version, "-t", tag_latest]
        if args.no_cache:
            build_cmd.append("--no-cache")
        build_cmd.append(str(BACKEND_DIR))

        run_command(build_cmd)

        log_info(f"Pushing {tag_version} to ECR...")
        run_command([cli, "push", tag_version])
        log_info(f"Pushing {tag_latest} to ECR...")
        run_command([cli, "push", tag_latest])

        log_success(f"Backend image pushed successfully: {tag_version}")
        deployed_images.append(tag_version)
        deployed_images.append(tag_latest)

    # 8. Build, Tag & Push Frontend
    if build_frontend:
        print(f"\n{BOLD}{YELLOW}[BUILD & DEPLOY] Frontend Container{NC}")
        repo_uri = ensure_ecr_repository(ecr, FRONTEND_REPO_NAME)
        tag_version = f"{repo_uri}:{args.version}"
        tag_latest = f"{repo_uri}:latest"

        build_cmd = [
            cli,
            "build",
            "--build-arg",
            f"NEXT_PUBLIC_API_URL={api_url}",
            "-t",
            FRONTEND_REPO_NAME,
            "-t",
            tag_version,
            "-t",
            tag_latest,
        ]
        if args.no_cache:
            build_cmd.append("--no-cache")
        build_cmd.append(str(FRONTEND_DIR))

        run_command(build_cmd)

        log_info(f"Pushing {tag_version} to ECR...")
        run_command([cli, "push", tag_version])
        log_info(f"Pushing {tag_latest} to ECR...")
        run_command([cli, "push", tag_latest])

        log_success(f"Frontend image pushed successfully: {tag_version}")
        deployed_images.append(tag_version)
        deployed_images.append(tag_latest)

    # 9. Summary
    print(f"\n{BLUE}{BOLD}================================================================{NC}")
    print(f"{GREEN}{BOLD}   Deployment to Amazon ECR Completed Successfully!             {NC}")
    print(f"{BLUE}{BOLD}================================================================{NC}")
    print("Pushed Images:")
    for img in deployed_images:
        print(f"  • {BOLD}{img}{NC}")
    print("\nNext Steps:")
    print("  • Update ECS Task Definition or Kubernetes Deployment with the ECR image URI.")
    print(f"  • Verify health check at: {api_url}/health")
    print(f"{BLUE}{BOLD}================================================================{NC}\n")


if __name__ == "__main__":
    main()
