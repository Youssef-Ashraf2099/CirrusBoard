import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { UserItem } from "./users.model";
import { CognitoClaims } from "../common/auth/cognito-auth.utils";

export type PublicUser = Omit<UserItem, "password">;

export function sanitizeUser(user: UserItem): PublicUser {
  const clone = { ...(user as UserItem) };
  delete (clone as { password?: string }).password;
  return clone;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly repo: UsersRepository) {}

  async createUser(input: Partial<UserItem>): Promise<PublicUser> {
    try {
      const created = await this.repo.createUser(input);
      return sanitizeUser(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`createUser failed: ${msg}`, err instanceof Error ? err.stack : undefined);
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: msg,
          hint:
            'DynamoDB rejected the write. Ensure a table exists with partition key "PK" (string). Check USERS_TABLE, AWS_REGION, credentials, or DYNAMODB_ENDPOINT (LocalStack uses dummy keys automatically).',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getUser(userId: string): Promise<PublicUser> {
    const u = await this.repo.getUserById(userId);
    if (!u) throw new NotFoundException("User not found");
    return sanitizeUser(u);
  }

  async syncFromCognitoClaims(claims: CognitoClaims): Promise<UserItem> {
    return this.repo.upsertFromCognitoClaims(claims);
  }

  async findByCognitoSub(cognitoSub: string): Promise<UserItem | null> {
    return this.repo.getUserByCognitoSub(cognitoSub);
  }

  async updateUser(
    userId: string,
    updates: Partial<UserItem>,
  ): Promise<PublicUser> {
    const updated = await this.repo.updateUser(userId, updates);
    return sanitizeUser(updated);
  }

  async deleteUser(userId: string): Promise<void> {
    return this.repo.deleteUser(userId);
  }

  async validateLogin(email: string, password: string): Promise<PublicUser> {
    const u = await this.repo.findUserByEmail(email.trim().toLowerCase());
    if (!u || (u.password ?? "") !== password) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (u.isActive === false) {
      throw new UnauthorizedException("Account disabled");
    }
    return sanitizeUser(u);
  }

  async listUsers(teamId?: string): Promise<PublicUser[]> {
    const items = teamId
      ? await this.repo.queryUsersByTeam(teamId)
      : await this.repo.scanUsers();
    return items.map((u) => sanitizeUser(u));
  }
}
