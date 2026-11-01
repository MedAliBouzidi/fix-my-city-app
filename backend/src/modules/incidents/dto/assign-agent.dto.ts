import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignAgentDto {
  @ApiProperty({
    example: '6c4591a2-6eb6-4dae-a4b5-fcfbfadcb882',
    description: 'UUID of the agent to assign',
  })
  @IsUUID('4', { message: 'agentId must be a valid UUID' })
  @IsNotEmpty({ message: 'agentId is required' })
  agentId: string;
}
