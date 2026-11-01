import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { IncidentPriority } from '../../../common/enums/incident-priority.enum';

export class ValidateIncidentDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  isValid: boolean;

  @ApiProperty({ enum: IncidentPriority, example: IncidentPriority.HIGH })
  @IsEnum(IncidentPriority, {
    message: `priority must be one of: ${Object.values(IncidentPriority).join(', ')}`,
  })
  @IsNotEmpty()
  priority: IncidentPriority;

  @ApiProperty({
    example:
      'Pothole confirmed; 40cm wide and 15cm deep. High traffic hazard.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  note: string;
}
