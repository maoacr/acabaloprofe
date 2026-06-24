import { z } from 'zod';

/**
 * Validated environment variables.
 *
 * Fail-fast at startup if required vars are missing or malformed.
 * NEVER log the actual values (secrets); only the names of missing/invalid vars.
 */

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required',
  }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message: 'SUPABASE_SERVICE_ROLE_KEY is required',
  }),
  NEXT_PUBLIC_APP_URL: z.string().url({
    message: 'NEXT_PUBLIC_APP_URL must be a valid URL',
  }),
  CRON_SECRET: z.string().min(16).optional(),
});

function parseEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    CRON_SECRET: process.env.CRON_SECRET,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nCheck your .env.local against .env.example.`,
    );
  }

  return parsed.data;
}

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
