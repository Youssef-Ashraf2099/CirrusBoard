import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { PatchNotificationDto } from "./dto/patch-notification.dto";
import { UserItem } from "../users/users.model";

const DummyUser: UserItem = {
  PK: "USER#dummy",
  userId: "dummy",
  email: "dummy@example.com",
  name: "Dummy Manager",
  role: "MANAGER",
};

@ApiTags("Notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: "Create notification" })
  create(@Body() body: CreateNotificationDto) {
    return this.notifications.create(DummyUser, body);
  }

  @Get()
  @ApiOperation({ summary: "List notifications for userId query param" })
  list(@Query("userId") userId?: string) {
    const uid = userId ?? DummyUser.userId;
    return this.notifications.findForUser(DummyUser, uid);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update notification e.g. read flag" })
  patch(@Param("id") id: string, @Body() body: PatchNotificationDto) {
    return this.notifications.patch(DummyUser, id, body.read);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete notification" })
  remove(@Param("id") id: string) {
    return this.notifications.remove(DummyUser, id);
  }
}
