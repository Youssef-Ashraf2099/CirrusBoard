import { Injectable, NotFoundException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { UserItem } from "./users.model";
import { CognitoClaims } from "../common/auth/cognito-auth.utils";

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async createUser(input: Partial<UserItem>): Promise<UserItem> {
    return this.repo.createUser(input);
  }

  async getUser(userId: string): Promise<UserItem> {
    const u = await this.repo.getUserById(userId);
    if (!u) throw new NotFoundException("User not found");
    return u;
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
  ): Promise<UserItem> {
    return this.repo.updateUser(userId, updates);
  }

  async deleteUser(userId: string): Promise<void> {
    return this.repo.deleteUser(userId);
  }
}
