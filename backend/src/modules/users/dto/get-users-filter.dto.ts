import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class GetUsersFilterDto {
  @ApiPropertyOptional({
    enum: [Role.AGENT, Role.TECHNICIAN],
    description: 'Filter users by staff role',
  })
  @IsOptional()
  @IsIn([Role.AGENT, Role.TECHNICIAN], {
    message: 'Role query parameter must be either AGENT or TECHNICIAN',
  })
  role?: Role;
}
