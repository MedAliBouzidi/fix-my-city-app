import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'AWS_REGION') return 'us-east-1';
              if (key === 'AWS_SNS_TOPIC_ARN') return 'arn:aws:sns:us-east-1:12345:fixmycity-alerts';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should do nothing if incident count is <= 10', async () => {
    const sendSpy = jest.fn();
    (service as any).snsClient = { send: sendSpy };

    await service.checkAndAlertStreetIncidents('Main Street', 10);
    expect(sendSpy).not.toHaveBeenCalled();

    await service.checkAndAlertStreetIncidents('Main Street', 5);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('should skip publish gracefully if AWS_SNS_TOPIC_ARN is unset', async () => {
    (service as any).topicArn = undefined;
    (service as any).snsClient = null;

    await expect(
      service.checkAndAlertStreetIncidents('Main Street', 15),
    ).resolves.toBeUndefined();
  });

  it('should send SNS notification when count > 10 and topic is configured', async () => {
    const sendSpy = jest.fn().mockResolvedValue({});
    (service as any).snsClient = { send: sendSpy };

    await service.checkAndAlertStreetIncidents('Avenue Habib Bourguiba', 11);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const command = sendSpy.mock.calls[0][0];
    expect(command.input.TopicArn).toBe('arn:aws:sns:us-east-1:12345:fixmycity-alerts');
    expect(command.input.Subject).toContain('Avenue Habib Bourguiba');
    expect(command.input.Message).toContain('HIGH_INCIDENT_DENSITY');
  });

  it('should fail-safely catch SNS client errors without throwing', async () => {
    const sendSpy = jest.fn().mockRejectedValue(new Error('Network failure'));
    (service as any).snsClient = { send: sendSpy };

    await expect(
      service.checkAndAlertStreetIncidents('Avenue Habib Bourguiba', 15),
    ).resolves.toBeUndefined();
  });
});
