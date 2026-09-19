import { Request, Response, NextFunction } from "express";

import { JwtVerifier } from "../modules/auth/services/jwt-verifier.service.js";
import { ForbiddenError, UnauthorizedError } from "../shared/errors/app.error.js";
const jwtVerifier = new JwtVerifier();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return next(
        new UnauthorizedError(
          'Missing or malformed Authorization header. Expected "Bearer <token>".',
        ),
      );
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return next(
        new UnauthorizedError('Invalid authorization header format. Expected "Bearer <token>".'),
      );
    }

    const user = await jwtVerifier.verifyAccessToken(token);

    req.user = user;

    return next();
  } catch (_error) {
    return next(new UnauthorizedError("Invalid or expired access token."));
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError("Insufficient permissions for this resource."));
    }

    next();
  };
}

export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return next();
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return next();
  }

  try {
    const user = await jwtVerifier.verifyAccessToken(token);
    req.user = user;
  } catch {
    // Proceed as unauthenticated if token is invalid or expired
  }

  return next();
}
