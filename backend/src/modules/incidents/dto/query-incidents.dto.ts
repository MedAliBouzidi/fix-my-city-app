import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { IncidentCategory } from '../../../common/enums/incident-category.enum';
import { IncidentStatus } from '../../../common/enums/incident-status.enum';

export class QueryIncidentsDto {
  @ApiPropertyOptional({ enum: IncidentStatus })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({ enum: IncidentCategory })
  @IsOptional()
  @IsEnum(IncidentCategory)
  category?: IncidentCategory;

  @ApiPropertyOptional({ example: 'Avenue Habib Bourguiba' })
  @IsOptional()
  @IsString()
  streetAddress?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
