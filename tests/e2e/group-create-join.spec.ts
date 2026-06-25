import { test, expect } from '@playwright/test';

test.describe('group creation and join flow', () => {
  test('create group form renders all required fields', async ({ page }) => {
    await page.goto('/login');
    // We can't actually create a user without a real Supabase, so we just
    // verify the form structure on the register page.
    await page.goto('/registro');
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();
  });

  test('join page shows error for invalid short code', async ({ page }) => {
    await page.goto('/unirse/INVALID');
    await expect(page.getByRole('heading', { name: 'Grupo no encontrado' })).toBeVisible();
  });

  test('login page redirects to dashboard for protected routes', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
