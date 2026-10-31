import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { IncidentStatus } from '../../../common/enums/incident-status.enum';

export class ProgressIncidentDto {
  @ApiProperty({
    enum: [IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED],
    example: IncidentStatus.RESOLVED,
  })
  @IsIn([IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED], {
    message: 'status must be either IN_PROGRESS or RESOLVED',
  })
  @IsNotEmpty()
  status: IncidentStatus;

  @ApiProperty({
    example:
      'Pothole filled with cold mix asphalt and asphalt compacted.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  reportNote: string;
}
