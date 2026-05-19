import { ForbiddenException, Injectable } from "@nestjs/common";
import { NotificationsRepository } from "./notifications.repository";
import type { UserItem } from "../users/users.model";
import type { CreateNotificationDto } from "./dto/create-notification.dto";
import { isPrivileged } from "../common/permissions";

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  async create(actor: UserItem, input: CreateNotificationDto) {
    if (!isPrivileged(actor.role) && actor.userId !== input.userId) {
      throw new ForbiddenException(
        "Cannot create notifications for another user",
      );
    }
    return this.repo.create(input);
  }

  async findForUser(actor: UserItem, userId: string) {
    if (!isPrivileged(actor.role) && actor.userId !== userId) {
      throw new ForbiddenException(
        "Cannot read notifications for another user",
      );
    }
    return this.repo.listByUserId(userId);
  }

  async patch(actor: UserItem, id: string, read: boolean) {
    const n = await this.repo.getById(id);
    if (!n) return null;
    if (!isPrivileged(actor.role) && n.userId !== actor.userId) {
      throw new ForbiddenException("Cannot update this notification");
    }
    return this.repo.patchRead(id, read);
  }

  async remove(actor: UserItem, id: string): Promise<boolean> {
    const n = await this.repo.getById(id);
    if (!n) return false;
    if (!isPrivileged(actor.role) && n.userId !== actor.userId) {
      throw new ForbiddenException();
    }
    await this.repo.delete(id);
    return true;
  }
}
