import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from "@nestjs/common";
import { TeamsService } from "../teams/teams.service";
import { createHmac } from "crypto";
import { UsersRepository } from "./users.repository";
import { UserItem } from "./users.model";
import { CognitoClaims } from "../common/auth/cognito-auth.utils";
import { CognitoConfig } from "../config/cognito.config";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SNSClient, SubscribeCommand } from "@aws-sdk/client-sns";
export type PublicUser = Omit<UserItem, "password">;

export type CognitoLoginTokens = {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
};

export type LoginResponse = {
  user: PublicUser;
  tokens?: CognitoLoginTokens;
};

export function sanitizeUser(user: UserItem): PublicUser {
  const clone = { ...(user as UserItem) };
  delete (clone as { password?: string }).password;
  return clone;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly cognitoClient = new CognitoIdentityProviderClient({
    region: CognitoConfig.region,
    endpoint: process.env.COGNITO_ENDPOINT || undefined,
  });
  private readonly snsClient = new SNSClient({
    region: CognitoConfig.region,
  });

  constructor(
    private readonly repo: UsersRepository,
    @Inject(forwardRef(() => TeamsService))
    private readonly teams: TeamsService,
  ) {}

  private getTaskNotificationsTopicArn(): string | undefined {
    return (
      process.env.SNS_TASK_ASSIGN_TOPIC_ARN ||
      process.env.SNS_TASK_NOTIFICATIONS_TOPIC_ARN ||
      "arn:aws:sns:eu-north-1:409987739232:cirrusboard-task-assign"
    );
  }

  private async enrichMemberships(user: UserItem): Promise<UserItem> {
    const teams = await this.teams.findTeamsForUser(user.userId);
    const teamIds = new Set<string>(
      [
        ...(user.teamIds ?? []),
        ...teams.map((team) => team.teamId),
        ...(user.primaryTeamId ? [user.primaryTeamId] : []),
      ].filter(Boolean),
    );
    const primaryTeamId = user.primaryTeamId ?? teams[0]?.teamId;
    return {
      ...user,
      primaryTeamId,
      teamIds: [...teamIds],
    };
  }

  async createUser(input: Partial<UserItem>): Promise<PublicUser> {
    try {
      const plainPassword = input.password; // capture before anything touches it
      const plainEmail = input.email?.trim().toLowerCase();

      const created = await this.repo.createUser(input);

      if (created.primaryTeamId && created.userId) {
        await this.teams
          .syncUserPrimaryTeam(created.userId, created.primaryTeamId)
          .catch((err) => {
            this.logger.warn(
              `Team roster sync failed for ${created.userId}: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
      }

      if (plainEmail && plainPassword) {
        await this.createCognitoUser(plainEmail, plainPassword).catch((err) => {
          this.logger.warn(
            `Cognito user creation failed for ${plainEmail}: ${err.message}`,
          );
        });
      }

      const topicArn = this.getTaskNotificationsTopicArn();
      if (plainEmail && topicArn) {
        await this.snsClient
          .send(
            new SubscribeCommand({
              Protocol: "email",
              TopicArn: topicArn,
              Endpoint: plainEmail,
            }),
          )
          .then(() => {
            this.logger.log(`Subscribed ${plainEmail} to task notifications`);
          })
          .catch((err) => {
            this.logger.warn(
              `SNS subscription failed for ${plainEmail}: ${err.message}`,
            );
          });
      }

      return sanitizeUser(await this.enrichMemberships(created));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`createUser failed: ${msg}`);
      throw new HttpException(
        { statusCode: HttpStatus.SERVICE_UNAVAILABLE, message: msg },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async createCognitoUser(
    email: string,
    password: string,
  ): Promise<void> {
    if (!CognitoConfig.userPoolId || !CognitoConfig.userPoolClientId) return;

    // Step 1: admin-create-user
    await this.cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: CognitoConfig.userPoolId,
        Username: email,
        MessageAction: "SUPPRESS",
      }),
    );

    // Step 2: set permanent password immediately
    await this.cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: CognitoConfig.userPoolId,
        Username: email,
        Password: password,
        Permanent: true,
      }),
    );

    this.logger.log(`Cognito user created: ${email}`);
  }

  async getUser(userId: string): Promise<PublicUser> {
    const u = await this.repo.getUserById(userId);
    if (!u) throw new NotFoundException("User not found");
    return sanitizeUser(await this.enrichMemberships(u));
  }

  async syncFromCognitoClaims(claims: CognitoClaims): Promise<UserItem> {
    const synced = await this.repo.upsertFromCognitoClaims(claims);
    return this.enrichMemberships(synced);
  }

  async findByCognitoSub(cognitoSub: string): Promise<UserItem | null> {
    return this.repo.getUserByCognitoSub(cognitoSub);
  }

  async updateUser(
    userId: string,
    updates: Partial<UserItem>,
  ): Promise<PublicUser> {
    const existing = await this.repo.getUserById(userId);
    const previousTeamId = existing?.primaryTeamId;
    const updated = await this.repo.updateUser(userId, updates);

    if (updated.primaryTeamId && updated.userId) {
      await this.teams
        .syncUserPrimaryTeam(
          updated.userId,
          updated.primaryTeamId,
          previousTeamId,
        )
        .catch((err) => {
          this.logger.warn(
            `Team roster sync failed for ${updated.userId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    }

    // Sync new password to Cognito if it changed
    if (updates.password && updated.email) {
      await this.cognitoClient
        .send(
          new AdminSetUserPasswordCommand({
            UserPoolId: CognitoConfig.userPoolId,
            Username: updated.email,
            Password: updates.password,
            Permanent: true,
          }),
        )
        .catch((err) => {
          this.logger.warn(`Cognito password sync failed: ${err.message}`);
        });
    }

    return sanitizeUser(await this.enrichMemberships(updated));
  }

  async deleteUser(userId: string): Promise<void> {
    return this.repo.deleteUser(userId);
  }

  async addTeamMembership(userId: string, teamId: string): Promise<void> {
    const existing = await this.repo.getUserById(userId);
    if (!existing) return;
    const next = new Set(existing.teamIds ?? []);
    next.add(teamId);
    await this.repo.updateUser(userId, { teamIds: [...next] });
  }

  async removeTeamMembership(userId: string, teamId: string): Promise<void> {
    const existing = await this.repo.getUserById(userId);
    if (!existing) return;
    const next = (existing.teamIds ?? []).filter((id) => id !== teamId);
    await this.repo.updateUser(userId, { teamIds: next });
  }

  async validateLogin(email: string, password: string): Promise<PublicUser> {
    const u = await this.repo.findUserByEmail(email.trim().toLowerCase());
    if (!u || (u.password ?? "") !== password) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (u.isActive === false) {
      throw new UnauthorizedException("Account disabled");
    }
    return sanitizeUser(await this.enrichMemberships(u));
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    if (CognitoConfig.userPoolClientId && CognitoConfig.userPoolId) {
      try {
        const tokens = await this.authenticateWithCognito(email, password);
        const claims = decodeJwtPayload(tokens.idToken);
        const synced = await this.syncFromCognitoClaims(claims);
        return {
          user: sanitizeUser(await this.enrichMemberships(synced)),
          tokens,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Cognito login failed, falling back to local: ${msg}`);
      }
    }

    const user = await this.validateLogin(email, password);
    return { user: sanitizeUser(await this.enrichMemberships(user)) };
  }

  async refreshSession(
    email: string,
    refreshToken: string,
  ): Promise<LoginResponse> {
    if (!CognitoConfig.userPoolClientId || !CognitoConfig.userPoolId) {
      throw new UnauthorizedException("Cognito is not configured");
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedRefreshToken = refreshToken.trim();
    if (!trimmedEmail || !trimmedRefreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }

    const authParams: Record<string, string> = {
      USERNAME: trimmedEmail,
      REFRESH_TOKEN: trimmedRefreshToken,
    };

    const secretHash = this.buildSecretHash(authParams.USERNAME);
    if (secretHash) authParams.SECRET_HASH = secretHash;

    const response = await this.cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: CognitoConfig.userPoolClientId,
        AuthParameters: authParams,
      }),
    );

    const result = response.AuthenticationResult;
    if (!result?.AccessToken || !result?.IdToken) {
      throw new UnauthorizedException("Cognito refresh failed");
    }

    const claims = decodeJwtPayload(result.IdToken);
    const synced = await this.syncFromCognitoClaims(claims);

    return {
      user: sanitizeUser(await this.enrichMemberships(synced)),
      tokens: {
        accessToken: result.AccessToken,
        idToken: result.IdToken,
        refreshToken: result.RefreshToken ?? trimmedRefreshToken,
        expiresIn: result.ExpiresIn,
        tokenType: result.TokenType,
      },
    };
  }

  private async authenticateWithCognito(
    email: string,
    password: string,
  ): Promise<CognitoLoginTokens> {
    if (!CognitoConfig.userPoolClientId) {
      throw new UnauthorizedException("Cognito client ID is missing");
    }

    const authParams: Record<string, string> = {
      USERNAME: email.trim(),
      PASSWORD: password,
    };

    const secretHash = this.buildSecretHash(authParams.USERNAME);
    if (secretHash) authParams.SECRET_HASH = secretHash;

    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CognitoConfig.userPoolClientId,
      AuthParameters: authParams,
    });

    const response = await this.cognitoClient.send(command);
    if (response.ChallengeName) {
      throw new UnauthorizedException("Cognito challenge required");
    }

    const result = response.AuthenticationResult;
    if (!result?.AccessToken || !result?.IdToken) {
      throw new UnauthorizedException("Cognito authentication failed");
    }

    return {
      accessToken: result.AccessToken,
      idToken: result.IdToken,
      refreshToken: result.RefreshToken,
      expiresIn: result.ExpiresIn,
      tokenType: result.TokenType,
    };
  }

  private buildSecretHash(username: string): string | undefined {
    const secret = process.env.COGNITO_USER_POOL_CLIENT_SECRET;
    if (!secret || !CognitoConfig.userPoolClientId) return undefined;
    return createHmac("sha256", secret)
      .update(`${username}${CognitoConfig.userPoolClientId}`)
      .digest("base64");
  }

  async listUsers(teamId?: string): Promise<PublicUser[]> {
    const items = teamId
      ? await this.repo.queryUsersByTeam(teamId)
      : await this.repo.scanUsers();
    return items.map((u) => sanitizeUser(u));
  }
}

function decodeJwtPayload(token: string): CognitoClaims {
  const payload = token.split(".")[1];
  if (!payload) return {};
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const json = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(json) as CognitoClaims;
}
