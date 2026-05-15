import { ApiProperty } from "@nestjs/swagger";

export class PatchNotificationDto {
  @ApiProperty()
  read: boolean;
}
