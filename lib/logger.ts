// lib/logger.ts
export function logApiRequest(info: {
  method: string;
  path: string;
  status?: number;
  extra?: Record<string, unknown>;
}) {
  const { method, path, status, extra } = info;
  const time = new Date().toISOString();

  // Basic console log (could be replaced by Winston, pino, etc.)
  const payload = {
    time,
    method,
    path,
    status,
    ...extra,
  };

  // Keep it simple for the assignment
  console.log("[API]", JSON.stringify(payload));
}
