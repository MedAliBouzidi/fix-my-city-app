import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bucketName = this.configService.get<string>(
      'AWS_S3_BUCKET_NAME',
      'fixmycity-media-storage-production',
    );

    // Build S3Client config — supports both EC2 instance roles (AWS) and
    // explicit credentials (local dev / CI). An optional AWS_ENDPOINT_URL
    // allows routing to LocalStack or any S3-compatible service locally.
    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region: this.region,
    };

    const endpointUrl = this.configService.get<string>('AWS_ENDPOINT_URL');
    if (endpointUrl) {
      clientConfig.endpoint = endpointUrl;
      clientConfig.forcePathStyle = true; // required for LocalStack / MinIO
      this.logger.log(`S3 using custom endpoint: ${endpointUrl}`);
    }

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = { accessKeyId, secretAccessKey };
    }

    this.s3Client = new S3Client(clientConfig);
  }

  async getSignedDownloadUrl(
    s3Key: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });
      return await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to generate pre-signed GET URL for key ${s3Key}: ${error.message}`,
      );
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
    }
  }

  async getSignedUploadUrl(
    s3Key: string,
    contentType: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async checkBucketReachable(): Promise<boolean> {
    try {
      const command = new HeadBucketCommand({ Bucket: this.bucketName });
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      this.logger.warn(`S3 health check failed: ${error.message}`);
      return false;
    }
  }
}
