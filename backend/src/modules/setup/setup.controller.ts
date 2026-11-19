import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { SetupService } from './setup.service';

@ApiTags('setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get()
  @ApiOperation({
    summary: 'Inspect setup status, entity counts, and seeding progress (Public)',
  })
  @ApiResponse({
    status: 200,
    description: 'Current database seed state and target cluster status',
  })
  async getStatus() {
    return this.setupService.getStatus();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bootstrap and seed the database with authentic Ariana municipal records (Public)',
  })
  @ApiQuery({
    name: 'clean',
    required: false,
    type: Boolean,
    description: 'Set to true to wipe existing incident data before re-seeding',
  })
  @ApiResponse({
    status: 200,
    description: 'Database seeded successfully with all users and incidents',
  })
  async seedDatabase(
    @Query('clean') queryClean?: string,
    @Body('clean') bodyClean?: boolean,
  ) {
    const isClean = queryClean === 'true' || bodyClean === true;
    return this.setupService.seed({ clean: isClean });
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Alias to seed the database (Public)',
  })
  async seedAlias(
    @Query('clean') queryClean?: string,
    @Body('clean') bodyClean?: boolean,
  ) {
    const isClean = queryClean === 'true' || bodyClean === true;
    return this.setupService.seed({ clean: isClean });
  }
}
