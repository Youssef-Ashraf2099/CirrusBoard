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
}
