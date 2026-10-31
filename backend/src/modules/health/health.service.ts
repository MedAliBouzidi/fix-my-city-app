import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { S3Service } from '../media/s3.service';

export interface HealthResponse {
  status: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface DeepHealthResponse {
  status: string;
  database: string;
  storage: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private simulatedFailureActive = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly s3Service: S3Service,
  ) {}

  toggleSimulatedFailure(): {
    message: string;
    simulatedFailureActive: boolean;
  } {
    this.simulatedFailureActive = !this.simulatedFailureActive;
    this.logger.warn(
      `Simulated failure mode toggled: active = ${this.simulatedFailureActive}`,
    );
    return {
      message: 'Simulated failure mode toggled',
      simulatedFailureActive: this.simulatedFailureActive,
    };
  }

  isFailureActive(): boolean {
    return this.simulatedFailureActive;
  }

  getHealth(): HealthResponse {
    if (this.simulatedFailureActive) {
      throw new InternalServerErrorException(
        'Simulated health failure mode active',
      );
    }

    return {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  async getDeepHealth(): Promise<DeepHealthResponse> {
    if (this.simulatedFailureActive) {
      throw new InternalServerErrorException(
        'Simulated health failure mode active',
      );
    }

    let databaseStatus = 'CONNECTED';
    try {
      await this.dataSource.query('SELECT 1');
    } catch (err) {
      this.logger.error(`Database health check failed: ${err.message}`);
      databaseStatus = 'DISCONNECTED';
    }

    let storageStatus = 'REACHABLE';
    try {
      const isReachable = await this.s3Service.checkBucketReachable();
      storageStatus = isReachable ? 'REACHABLE' : 'UNREACHABLE';
    } catch {
      storageStatus = 'UNREACHABLE';
    }

    const isHealthy =
      databaseStatus === 'CONNECTED' && storageStatus !== 'DISCONNECTED';

    if (!isHealthy || databaseStatus === 'DISCONNECTED') {
      throw new ServiceUnavailableException({
        status: 'DOWN',
        database: databaseStatus,
        storage: storageStatus,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'UP',
      database: databaseStatus,
      storage: storageStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
