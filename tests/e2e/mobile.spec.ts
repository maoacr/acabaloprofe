import { test, expect } from '@playwright/test';

test.describe('mobile responsiveness audit', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12 size

  test('landing page has no horizontal scroll at 390px', async ({ page }) => {
    await page.goto('/');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('login form is usable at 390px', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Usuario o email')).toBeVisible();
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();

    // All interactive elements should be at least 44px tall
    const button = page.getByRole('button', { name: 'Iniciar sesión' });
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('register form is usable at 390px', async ({ page }) => {
    await page.goto('/registro');
    await expect(page.getByLabel('Nombre')).toBeVisible();
    await expect(page.getByLabel('Apellido')).toBeVisible();
    await expect(page.getByLabel('Nombre de usuario')).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirmar contraseña')).toBeVisible();
    await expect(page.getByLabel('País')).toBeVisible();
    await expect(page.getByLabel('Ciudad')).toBeVisible();
    await expect(page.getByLabel('Zona horaria')).toBeVisible();
  });

  test('protected routes redirect to login at 390px', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unirse page renders at 390px', async ({ page }) => {
    await page.goto('/unirse/INVALID');
    await expect(page.getByRole('heading', { name: 'Grupo no encontrado' })).toBeVisible();
  });

  test('recovery form is usable at 390px', async ({ page }) => {
    await page.goto('/recuperar');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar enlace' })).toBeVisible();
  });
});
