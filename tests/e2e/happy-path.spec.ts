import { test, expect } from '@playwright/test';

test.describe('happy path smoke test', () => {
  test('landing page renders with hero and CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Acabalo/i })).toBeVisible();
    // CTAs
    await expect(page.getByRole('link', { name: /Crear mi polla|Tengo código|Crear cuenta/i }).first()).toBeVisible();
  });

  test('protected route redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('join page validates short code', async ({ page }) => {
    await page.goto('/unirse/INVALID');
    await expect(page.getByRole('heading', { name: 'Grupo no encontrado' })).toBeVisible();
  });

  test('login form has all required fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Usuario o email')).toBeVisible();
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
  });
});
