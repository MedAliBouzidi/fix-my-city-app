import { ConfigService } from '@nestjs/config';

export interface AwsConfig {
  region: string;
  s3BucketName: string;
  snsTopicArn?: string;
}

export const getAwsConfig = (configService: ConfigService): AwsConfig => ({
  region: configService.get<string>('AWS_REGION', 'us-east-1'),
  s3BucketName: configService.get<string>(
    'AWS_S3_BUCKET_NAME',
    'fixmycity-media-storage-production',
  ),
  snsTopicArn: configService.get<string>('AWS_SNS_TOPIC_ARN'),
});
