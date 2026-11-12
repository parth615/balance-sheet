export function getAuthHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("bs_auth_token")
      : null;
  const headers: Record<string, string> = { ...(extra || {}) };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}
