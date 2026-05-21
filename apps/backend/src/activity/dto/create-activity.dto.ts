import { ApiProperty } from "@nestjs/swagger";

export class CreateActivityDto {
  @ApiProperty()
  teamId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  target: string;

  @ApiProperty()
  targetId: string;

  @ApiProperty({
    required: false,
    description:
      'Task id for audit storage (defaults to targetId when target is task)',
  })
  taskId?: string;
}
