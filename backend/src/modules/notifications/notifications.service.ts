import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly snsClient: SNSClient | null = null;
  private readonly topicArn?: string;

  constructor(private readonly configService: ConfigService) {
    this.topicArn = this.configService.get<string>('AWS_SNS_TOPIC_ARN');
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');

    if (this.topicArn && this.topicArn.trim() !== '') {
      try {
        // Support explicit credentials for local dev / CI; falls back to
        // EC2 instance role automatically when these env vars are absent.
        const clientConfig: ConstructorParameters<typeof SNSClient>[0] = {
          region,
        };

        const endpointUrl = this.configService.get<string>('AWS_ENDPOINT_URL');
        if (endpointUrl) {
          clientConfig.endpoint = endpointUrl;
        }

        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        );
        if (accessKeyId && secretAccessKey) {
          clientConfig.credentials = { accessKeyId, secretAccessKey };
        }

        this.snsClient = new SNSClient(clientConfig);
        this.logger.log(`SNS Client configured for topic: ${this.topicArn}`);
      } catch (err) {
        this.logger.warn(`Failed to initialize SNS client: ${err.message}`);
      }
    } else {
      this.logger.log(
        'AWS_SNS_TOPIC_ARN is unset; SNS alerts will be skipped (local dev mode)',
      );
    }
  }

  async checkAndAlertStreetIncidents(
    streetAddress: string,
    incidentCount: number,
  ): Promise<void> {
    if (incidentCount <= 10) {
      return;
    }

    if (!this.topicArn || !this.snsClient) {
      this.logger.log(
        `High incident volume alert triggered for street "${streetAddress}" (${incidentCount} incidents), but SNS topic is not configured. Skipping publish.`,
      );
      return;
    }

    try {
      const subject = `FixMyCity Alert: High Incident Density on ${streetAddress}`;
      const message = JSON.stringify({
        alert: 'HIGH_INCIDENT_DENSITY',
        streetAddress,
        incidentCount,
        threshold: 10,
        timestamp: new Date().toISOString(),
      });

      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Subject: subject,
        Message: message,
      });

      await this.snsClient.send(command);
      this.logger.log(
        `SNS alert published successfully for street "${streetAddress}" (${incidentCount} incidents)`,
      );
    } catch (error) {
      // Fail-safe: never throw or break incident creation
      this.logger.error(
        `Failed to publish SNS alert for street "${streetAddress}": ${error.message}`,
        error.stack,
      );
    }
  }
}
