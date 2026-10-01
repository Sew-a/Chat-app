// FRONTEND_URL is a comma-separated list of allowed origins, e.g.
// "https://sevavetisyan.up.railway.app,http://localhost:3000". Unset = allow all.
// Read per request so it sees env loaded by ConfigModule after module import.
export function corsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) {
  const allowed = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  callback(null, !origin || allowed.length === 0 || allowed.includes(origin));
}
