import { ApiProperty } from "@nestjs/swagger";
import type { NotificationType } from "../notifications.model";

export class CreateNotificationDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({
    enum: [
      "TASK_ASSIGNED",
      "COMMENT_ADDED",
      "TASK_COMPLETED",
      "MENTION",
      "DEADLINE",
    ],
  })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  link?: string;
}
