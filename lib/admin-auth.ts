export function assertAdminRequest(request: Request) {
  const configuredKey = process.env.ADMIN_WRITE_KEY;

  if (!configuredKey) {
    return {
      ok: false,
      status: 500,
      message: "ADMIN_WRITE_KEY is not configured on the server."
    } as const;
  }

  const incomingKey = request.headers.get("x-admin-key") ?? request.headers.get("authorization")?.replace("Bearer ", "");

  if (incomingKey !== configuredKey) {
    return {
      ok: false,
      status: 401,
      message: "Invalid admin key."
    } as const;
  }

  return { ok: true } as const;
}
