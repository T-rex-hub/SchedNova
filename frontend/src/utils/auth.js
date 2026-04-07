export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
}

function parseJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function looksLikeLegacyUserIdToken(token) {
  // Current backend auth accepts raw user_id (UUID) as bearer token.
  return typeof token === "string" && token.split(".").length === 1 && token.length >= 16;
}

export function isTokenValid(token) {
  if (!token) return false;
  if (looksLikeLegacyUserIdToken(token)) return true;
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}

export function requireValidToken() {
  const token = localStorage.getItem("token");
  if (!isTokenValid(token)) {
    clearAuth();
    return null;
  }
  return token;
}
