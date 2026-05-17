type RequiredEnv = { name: string; example?: string };

export function validateEnv(required: RequiredEnv[]) {
  const missing: string[] = [];
  for (const r of required) {
    if (!process.env[r.name])
      missing.push(r.name + (r.example ? ` (e.g. ${r.example})` : ""));
  }
  if (missing.length) {
    const msg = `Missing required environment variables: ${missing.join(", ")}`;
    throw new Error(msg);
  }
}
