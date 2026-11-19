import { Test, TestingModule } from '@nestjs/testing';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

describe('SetupController', () => {
  let controller: SetupController;
  let service: SetupService;

  const mockSetupService = {
    getStatus: jest.fn().mockResolvedValue({
      status: 'READY',
      counts: { users: 21, incidents: 26, photos: 26, notes: 41 },
      isSeeded: true,
      targetCluster: {
        streetAddress: 'Avenue Habib Bourguiba, Ariana',
        currentReportCount: 9,
        primaryReportNumber: 1001,
      },
    }),
    seed: jest.fn().mockResolvedValue({
      success: true,
      message: 'FixMyCity database seeded successfully',
      summary: { usersCount: 21, incidentsCount: 26, commonPassword: 'password' },
      targetIncidentCluster: {
        streetAddress: 'Avenue Habib Bourguiba, Ariana',
        primaryReportNumber: 1001,
        currentReportsOnStreet: 9,
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetupController],
      providers: [
        {
          provide: SetupService,
          useValue: mockSetupService,
        },
      ],
    }).compile();

    controller = module.get<SetupController>(SetupController);
    service = module.get<SetupService>(SetupService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return setup status from GET /setup', async () => {
    const result = await controller.getStatus();
    expect(result).toHaveProperty('status', 'READY');
    expect(result).toHaveProperty('isSeeded', true);
    expect(service.getStatus).toHaveBeenCalled();
  });

  it('should trigger seed from POST /setup', async () => {
    const result = await controller.seedDatabase('false');
    expect(result).toHaveProperty('success', true);
    expect(service.seed).toHaveBeenCalledWith({ clean: false });
  });

  it('should trigger clean seed when clean=true', async () => {
    const result = await controller.seedDatabase('true');
    expect(result).toHaveProperty('success', true);
    expect(service.seed).toHaveBeenCalledWith({ clean: true });
  });

  it('should trigger seed from POST /setup/seed alias', async () => {
    const result = await controller.seedAlias(undefined, true);
    expect(result).toHaveProperty('success', true);
    expect(service.seed).toHaveBeenCalledWith({ clean: true });
  });
});
