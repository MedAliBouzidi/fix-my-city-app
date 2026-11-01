import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignTechnicianDto {
  @ApiProperty({
    example: '8f9024f1-3ec7-46ea-9a80-e8f0003bfa59',
    description: 'UUID of the technician to assign',
  })
  @IsUUID('4', { message: 'technicianId must be a valid UUID' })
  @IsNotEmpty({ message: 'technicianId is required' })
  technicianId: string;
}
