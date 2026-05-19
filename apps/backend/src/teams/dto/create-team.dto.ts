import { ApiProperty } from "@nestjs/swagger";

export class CreateTeamDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  managerId?: string;

  @ApiProperty({ required: false, type: [String] })
  memberUserIds?: string[];
}
