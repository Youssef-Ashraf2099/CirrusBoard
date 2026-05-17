import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.user) return null;
    return data ? req.user[data] : req.user;
  },
);
