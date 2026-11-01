import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Primary ALB target group health check endpoint (Public)',
  })
  @ApiResponse({
    status: 200,
    description: 'System is healthy',
    schema: {
      example: {
        status: 'UP',
        uptimeSeconds: 1420,
        timestamp: '2026-10-19T01:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Returned when simulated failure mode is active',
  })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('deep')
  @ApiOperation({
    summary:
      'Active verification of database connectivity and S3 storage accessibility',
  })
  @ApiResponse({
    status: 200,
    description: 'Database and S3 storage reachable',
    schema: {
      example: {
        status: 'UP',
        database: 'CONNECTED',
        storage: 'REACHABLE',
        timestamp: '2026-10-19T01:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Database disconnected or service degraded',
  })
  async getDeepHealth() {
    return this.healthService.getDeepHealth();
  }

  @Post('simulate-fail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Toggle in-memory simulated failure mode for ALB chaos testing (ADMIN only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Simulated failure state toggled',
    schema: {
      example: {
        message: 'Simulated failure mode toggled',
        simulatedFailureActive: true,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admin role required)' })
  toggleSimulatedFailure() {
    return this.healthService.toggleSimulatedFailure();
  }
}
