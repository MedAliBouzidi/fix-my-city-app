import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { GetUsersFilterDto } from './dto/get-users-filter.dto';
import { UsersService, UserSummary } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'List staff users (agents or technicians) — ADMIN only',
  })
  @ApiResponse({
    status: 200,
    description: 'List of staff users without sensitive credentials',
    schema: {
      example: [
        {
          id: '6c4591a2-6eb6-4dae-a4b5-fcfbfadcb882',
          firstName: 'Sarah',
          lastName: 'Mansour',
          email: 'agent@fixmycity.local',
          role: 'AGENT',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admin role required)' })
  async getUsers(
    @Query() filterDto: GetUsersFilterDto,
  ): Promise<UserSummary[]> {
    return this.usersService.findStaffUsers(filterDto.role);
  }
}
