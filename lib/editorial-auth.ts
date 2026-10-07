function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function editorialCredentialsConfigured(): boolean {
  const user = process.env.APEX_EDITORIAL_USER?.trim() ?? "";
  const password = process.env.APEX_EDITORIAL_PASSWORD ?? "";
  return user.length >= 2 && password.length >= 16;
}

export function editorialAuthorized(headers: Headers): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (!editorialCredentialsConfigured()) return false;

  const header = headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;

  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    const suppliedUser = decoded.slice(0, separator);
    const suppliedPassword = decoded.slice(separator + 1);
    const expectedUser = process.env.APEX_EDITORIAL_USER?.trim() ?? "";
    const expectedPassword = process.env.APEX_EDITORIAL_PASSWORD ?? "";
    return (
      safeEqual(suppliedUser, expectedUser) &&
      safeEqual(suppliedPassword, expectedPassword)
    );
  } catch {
    return false;
  }
}

export function editorialChallenge(): Response {
  return new Response("Editorial authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Apex News Editorial", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function requestIsSameOrigin(request: Request): boolean {
  try {
    const origin = request.headers.get("origin");
    if (!origin) return true;
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
