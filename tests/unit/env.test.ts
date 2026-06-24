import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('env validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function setValidEnv() {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcdefghij.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-12345';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-12345';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  }

  async function loadEnv() {
    return await import('@/infrastructure/env');
  }

  it('fails when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    setValidEnv();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(loadEnv()).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('fails when NEXT_PUBLIC_SUPABASE_URL is not a URL', async () => {
    setValidEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-url';
    await expect(loadEnv()).rejects.toThrow();
  });

  it('fails when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    setValidEnv();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await expect(loadEnv()).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('fails when NEXT_PUBLIC_APP_URL is missing', async () => {
    setValidEnv();
    delete process.env.NEXT_PUBLIC_APP_URL;
    await expect(loadEnv()).rejects.toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it('succeeds when all required vars are valid', async () => {
    setValidEnv();
    const mod = await loadEnv();
    expect(mod.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://abcdefghij.supabase.co');
    expect(mod.env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
  });

  it('treats CRON_SECRET as optional (no error if missing)', async () => {
    setValidEnv();
    delete process.env.CRON_SECRET;
    const mod = await loadEnv();
    expect(mod.env.CRON_SECRET).toBeUndefined();
  });
});
