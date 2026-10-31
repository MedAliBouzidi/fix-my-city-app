import {
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { S3Service } from '../media/s3.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let dataSource: any;
  let s3Service: any;

  beforeEach(async () => {
    dataSource = {
      query: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    s3Service = {
      checkBucketReachable: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: S3Service,
          useValue: s3Service,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  describe('getHealth', () => {
    it('should return UP and uptime when healthy', () => {
      const result = service.getHealth();
      expect(result.status).toBe('UP');
      expect(typeof result.uptimeSeconds).toBe('number');
      expect(result.timestamp).toBeDefined();
    });

    it('should throw InternalServerErrorException when simulated failure is active', () => {
      service.toggleSimulatedFailure(); // active = true
      expect(() => service.getHealth()).toThrow(InternalServerErrorException);

      service.toggleSimulatedFailure(); // active = false
      expect(service.getHealth().status).toBe('UP');
    });
  });

  describe('getDeepHealth', () => {
    it('should verify database and storage when all dependencies are healthy', async () => {
      const result = await service.getDeepHealth();
      expect(result.status).toBe('UP');
      expect(result.database).toBe('CONNECTED');
      expect(result.storage).toBe('REACHABLE');
      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
      expect(s3Service.checkBucketReachable).toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException if database fails', async () => {
      dataSource.query.mockRejectedValue(new Error('Connection timeout'));
      await expect(service.getDeepHealth()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw InternalServerErrorException if simulated failure is active', async () => {
      service.toggleSimulatedFailure();
      await expect(service.getDeepHealth()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
