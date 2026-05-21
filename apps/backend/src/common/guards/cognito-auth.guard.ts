import {
  CanActivate,
  ExecutionContext,
  Injectable,
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
      this.initError = error?.message || "Failed to initialize Cognito verifier";
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
    let token: string;

    try {
      token = extractBearerToken(auth);
    } catch (error: any) {
      throw new UnauthorizedException(error.message || "Missing Authorization header");
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
      } catch {
        payload = await this.idTokenVerifier.verify(token);
      }

      const user = await this.usersService.syncFromCognitoClaims(payload);
      const authenticatedUser: AuthenticatedUser = {
        ...user,
        cognitoSub: user.cognitoSub || String(payload.sub || ""),
        claims: payload,
      };

      req.user = authenticatedUser;
      return true;
    } catch (err) {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
