import { ForbiddenException } from '@nestjs/common';
import type { TaskItem } from './tasks.model';
import type { UserItem } from '../users/users.model';
import { isPrivileged } from '../common/permissions';
import { teamIdsMatch } from '../common/team-id.utils';

/** Manager/admin may access any task; employees only assigned tasks on their team. */
export function assertCanReadTask(actor: UserItem, task: TaskItem): void {
  if (isPrivileged(actor.role)) return;
  const actorTeam = actor.primaryTeamId ?? actor.teamIds?.[0];
  if (!teamIdsMatch(actorTeam, task.teamId)) {
    throw new ForbiddenException('Access denied to this task');
  }
  if (!task.assigneeId || actor.userId !== task.assigneeId) {
    throw new ForbiddenException('Not assigned to you');
  }
}
