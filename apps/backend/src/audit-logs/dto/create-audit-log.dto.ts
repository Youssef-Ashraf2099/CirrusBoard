import { ApiProperty } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiProperty()
  taskId: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  actorId: string;

  @ApiProperty({ required: false })
  oldValue?: string;

  @ApiProperty({ required: false })
  newValue?: string;
}
