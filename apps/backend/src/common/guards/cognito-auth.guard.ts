import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { CognitoConfig } from "../../config/cognito.config";

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
  private verifier: any | null = null;

  constructor() {
    if (!CognitoJwtVerifier) return;
    const issuer =
      CognitoConfig.issuer ||
      `https://cognito-idp.${CognitoConfig.region}.amazonaws.com/${CognitoConfig.userPoolId}`;
    this.verifier = CognitoJwtVerifier.create({
      userPoolId: CognitoConfig.userPoolId,
      tokenUse: "access", // acceptable: access or id depending on your flow
      clientId: CognitoConfig.userPoolClientId || undefined,
      issuer,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers?.authorization || req.headers?.Authorization;
    if (!auth) throw new UnauthorizedException("Missing Authorization header");
    const token = Array.isArray(auth)
      ? auth[0].split(" ")[1]
      : auth.split(" ")[1];

    if (!this.verifier) {
      throw new UnauthorizedException(
        "Cognito verifier not available. Install aws-jwt-verify.",
      );
    }

    try {
      const payload = await this.verifier.verify(token);
      // Extract common claims
      const userId = payload.sub || payload.username;
      const role =
        payload.role ||
        payload["custom:role"] ||
        payload["cognito:groups"] ||
        "EMPLOYEE";
      const teamId = payload["custom:teamId"] || payload.teamId || undefined;

      req.user = { userId, role, teamId, claims: payload };
      return true;
    } catch (err) {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
