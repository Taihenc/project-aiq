export interface AuthUser {
  userId: string;
  email: string;
  displayName?: string | null;
  authProvider: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  authProvider: string;
}
