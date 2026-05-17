import { UnauthorizedException } from "@nestjs/common";

describe("CognitoAuthGuard", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("allows valid token and attaches user", async () => {
    const mockVerify = jest
      .fn()
      .mockResolvedValue({
        sub: "u1",
        email: "u1@example.com",
        name: "User One",
      });
    const mockCreate = jest.fn().mockReturnValue({ verify: mockVerify });
    jest.doMock("aws-jwt-verify", () => ({
      CognitoJwtVerifier: { create: mockCreate },
    }));

    const { CognitoAuthGuard } = await import("../cognito-auth.guard");
    const guard = new CognitoAuthGuard({
      syncFromCognitoClaims: jest.fn().mockResolvedValue({
        PK: "USER#u1",
        userId: "u1",
        email: "u1@example.com",
        name: "User One",
        role: "MANAGER",
        teamIds: ["TEAM#1"],
      }),
    } as any);

    const req: any = { headers: { authorization: "Bearer token" } };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };

    const res = await guard.canActivate(ctx as any);
    expect(res).toBe(true);
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe("u1");
  });

  it("throws when authorization header missing", async () => {
    const mockCreate = jest.fn().mockReturnValue({ verify: jest.fn() });
    jest.doMock("aws-jwt-verify", () => ({
      CognitoJwtVerifier: { create: mockCreate },
    }));
    const { CognitoAuthGuard } = await import("../cognito-auth.guard");
    const guard = new CognitoAuthGuard({ syncFromCognitoClaims: jest.fn() } as any);

    const req: any = { headers: {} };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };

    await expect(guard.canActivate(ctx as any)).rejects.toThrow(
      "Missing Authorization header",
    );
  });

  it("throws on invalid token", async () => {
    const mockVerify = jest.fn().mockRejectedValue(new Error("invalid"));
    const mockCreate = jest.fn().mockReturnValue({ verify: mockVerify });
    jest.doMock("aws-jwt-verify", () => ({
      CognitoJwtVerifier: { create: mockCreate },
    }));
    const { CognitoAuthGuard } = await import("../cognito-auth.guard");
    const guard = new CognitoAuthGuard({ syncFromCognitoClaims: jest.fn() } as any);

    const req: any = { headers: { authorization: "Bearer badtoken" } };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };

    await expect(guard.canActivate(ctx as any)).rejects.toThrow(
      "Invalid or expired token",
    );
  });
});
