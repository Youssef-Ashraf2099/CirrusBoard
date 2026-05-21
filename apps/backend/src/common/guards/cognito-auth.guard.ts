import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { CognitoConfig } from "../../config/cognito.config";
import { UsersService } from "../../users/users.service";
import {
  AuthenticatedUser,
  extractBearerToken,
} from "../auth/cognito-auth.utils";

// Note: requires `aws-jwt-verify` package. Install with:
// npm install aws-jwt-verify
let CognitoJwtVerifier: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  CognitoJwtVerifier = require("aws-jwt-verify").CognitoJwtVerifier;
} catch (e) {
  CognitoJwtVerifier = null;
}

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private readonly logger = new Logger(CognitoAuthGuard.name);
  private accessTokenVerifier: any | null = null;
  private idTokenVerifier: any | null = null;
  private initError: string | null = null;

  constructor(private readonly usersService: UsersService) {
    if (!CognitoJwtVerifier) return;
    const issuer =
      CognitoConfig.issuer ||
      `https://cognito-idp.${CognitoConfig.region}.amazonaws.com/${CognitoConfig.userPoolId}`;

    if (!CognitoConfig.userPoolId || !CognitoConfig.userPoolClientId) {
      this.initError =
        "Cognito configuration is missing. Set COGNITO_USER_POOL_ID and COGNITO_USER_POOL_CLIENT_ID.";
      return;
    }

    try {
      this.accessTokenVerifier = CognitoJwtVerifier.create({
        userPoolId: CognitoConfig.userPoolId,
        tokenUse: "access",
        clientId: CognitoConfig.userPoolClientId,
        issuer,
      });
      this.idTokenVerifier = CognitoJwtVerifier.create({
        userPoolId: CognitoConfig.userPoolId,
        tokenUse: "id",
        clientId: CognitoConfig.userPoolClientId,
        issuer,
      });
    } catch (error: any) {
      this.initError =
        error?.message || "Failed to initialize Cognito verifier";
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const path = String(req?.url || "");
    if (
      req?.method === "OPTIONS" ||
      path.startsWith("/api/docs") ||
      path === "/api/docs-json" ||
      path === "/api/docs-yaml" ||
      (path === "/api/users" && req?.method === "POST") ||
      path.startsWith("/api/users/login") ||
      path.startsWith("/api/users/refresh")
    ) {
      return true;
    }

    const auth = req.headers?.authorization || req.headers?.Authorization;
    const fallbackToken = req.headers?.["x-cognito-access-token"];
    let token: string;
    const tokenSource = auth
      ? "authorization"
      : fallbackToken
        ? "x-cognito-access-token"
        : "missing";

    this.logger.debug(
      `auth check path=${path} method=${req?.method || "UNKNOWN"} source=${tokenSource} hasAuth=${Boolean(auth)} hasFallback=${Boolean(fallbackToken)}`,
    );

    try {
      if (auth) {
        token = extractBearerToken(auth);
      } else if (fallbackToken) {
        token = Array.isArray(fallbackToken) ? fallbackToken[0] : fallbackToken;
      } else {
        throw new Error("Missing Authorization header");
      }
    } catch (error: any) {
      throw new UnauthorizedException(
        error.message || "Missing Authorization header",
      );
    }

    if (!this.accessTokenVerifier || !this.idTokenVerifier) {
      throw new UnauthorizedException(
        this.initError ||
          "Cognito verifier not available. Install aws-jwt-verify.",
      );
    }

    try {
      let payload: Record<string, any>;
      try {
        payload = await this.accessTokenVerifier.verify(token);
        this.logger.debug(
          `verified access token for sub=${String(payload.sub || "")}`,
        );
      } catch {
        payload = await this.idTokenVerifier.verify(token);
        this.logger.debug(
          `verified id token for sub=${String(payload.sub || "")}`,
        );
      }

      const user = await this.usersService.syncFromCognitoClaims(payload);
      const authenticatedUser: AuthenticatedUser = {
        ...user,
        cognitoSub: user.cognitoSub || String(payload.sub || ""),
        claims: payload,
      };

      req.user = authenticatedUser;
      this.logger.debug(
        `attached userId=${authenticatedUser.userId} cognitoSub=${authenticatedUser.cognitoSub} path=${path}`,
      );
      return true;
    } catch (err) {
      this.logger.warn(
        `token verification failed path=${path} source=${tokenSource} reason=${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
