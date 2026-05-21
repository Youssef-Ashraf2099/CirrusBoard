import { ApiProperty } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiProperty({ required: false })
  taskId?: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  actorId: string;

  @ApiProperty({ required: false })
  oldValue?: string;

  @ApiProperty({ required: false })
  newValue?: string;

  @ApiProperty({ required: false, description: 'Team id for activity feed GSI' })
  teamId?: string;

  @ApiProperty({ required: false, example: 'task' })
  target?: string;

  @ApiProperty({ required: false })
  targetId?: string;
}
