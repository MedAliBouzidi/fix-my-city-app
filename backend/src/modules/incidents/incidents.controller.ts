import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AssignAgentDto } from './dto/assign-agent.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { ProgressIncidentDto } from './dto/progress-incident.dto';
import { PublicIncidentsQueryDto } from './dto/public-incidents-query.dto';
import { QueryIncidentsDto } from './dto/query-incidents.dto';
import { ValidateIncidentDto } from './dto/validate-incident.dto';
import { IncidentsService } from './incidents.service';

@ApiTags('incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get('public/resolved')
  @ApiOperation({
    summary: 'Public list of resolved incidents with sanitized data',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of resolved incidents',
  })
  async getPublicResolved(@Query() query: PublicIncidentsQueryDto) {
    return this.incidentsService.findPublicResolved(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CITIZEN, Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a new incident report' })
  @ApiResponse({
    status: 201,
    description: 'Incident created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() dto: CreateIncidentDto,
    @CurrentUser('id') callerId: string,
  ) {
    return this.incidentsService.create(dto, callerId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.AGENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List and filter incident reports (Admin / Agent)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated incident reports list',
  })
  async findAll(@Query() query: QueryIncidentsDto) {
    return this.incidentsService.findAll(query);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CITIZEN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve incidents submitted by current citizen' })
  @ApiResponse({
    status: 200,
    description: 'List of citizen submitted incidents',
  })
  async findMy(@CurrentUser('id') callerId: string) {
    return this.incidentsService.findMyIncidents(callerId);
  }

  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.TECHNICIAN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retrieve incidents assigned to the current agent or technician',
  })
  @ApiResponse({
    status: 200,
    description: 'List of incidents assigned to caller',
  })
  async findAssigned(@CurrentUser() caller: { id: string; role: Role }) {
    return this.incidentsService.findAssigned(caller);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Detailed incident report with photos and notes (with ownership checks)',
  })
  @ApiResponse({
    status: 200,
    description: 'Incident detail report',
  })
  @ApiResponse({ status: 403, description: 'Forbidden (Ownership violation)' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() caller: { id: string; role: Role },
  ) {
    return this.incidentsService.findOne(id, caller);
  }

  @Patch(':id/assign-agent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign an inspection agent to an incident report' })
  @ApiResponse({
    status: 200,
    description: 'Status updated to PENDING_VALIDATION',
  })
  @ApiResponse({ status: 400, description: 'Invalid transition or user not an agent' })
  async assignAgent(
    @Param('id') id: string,
    @Body() dto: AssignAgentDto,
  ) {
    return this.incidentsService.assignAgent(id, dto);
  }

  @Patch(':id/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Field agent validation result (VALIDATED or REJECTED)',
  })
  @ApiResponse({
    status: 200,
    description: 'Status updated to VALIDATED or REJECTED',
  })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiResponse({ status: 403, description: 'Forbidden: not assigned to agent' })
  async validate(
    @Param('id') id: string,
    @Body() dto: ValidateIncidentDto,
    @CurrentUser('id') callerId: string,
  ) {
    return this.incidentsService.validate(id, dto, callerId);
  }

  @Patch(':id/assign-technician')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a repair technician to a validated incident' })
  @ApiResponse({
    status: 200,
    description: 'Status updated to ASSIGNED',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transition or user not a technician',
  })
  async assignTechnician(
    @Param('id') id: string,
    @Body() dto: AssignTechnicianDto,
  ) {
    return this.incidentsService.assignTechnician(id, dto);
  }

  @Patch(':id/progress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TECHNICIAN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update repair progress to IN_PROGRESS or RESOLVED',
  })
  @ApiResponse({
    status: 200,
    description: 'Status updated to IN_PROGRESS or RESOLVED',
  })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: not assigned to technician',
  })
  async progress(
    @Param('id') id: string,
    @Body() dto: ProgressIncidentDto,
    @CurrentUser('id') callerId: string,
  ) {
    return this.incidentsService.progress(id, dto, callerId);
  }
}
