export function hasAuth(request: Request): boolean {
  const possibleTokenHeaders = [
    "suresteps.session.token",
    "x-suresteps-session-token",
    "suresteps-session-token",
    "authorization",
  ];
  return possibleTokenHeaders.some((h) => request.headers.has(h));
}

export function getAuthToken(request: Request): string | null {
  const token =
    request.headers.get("x-suresteps-session-token") ||
    request.headers.get("suresteps.session.token") ||
    request.headers.get("suresteps-session-token") ||
    request.headers.get("authorization");

  if (!token) return null;
  if (token.toLowerCase().startsWith("bearer ")) {
    return token.slice(7).trim();
  }
  return token.trim();
}
