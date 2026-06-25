import { test, expect } from '@playwright/test';

test.describe('auth happy path', () => {
  test('register form renders with all fields', async ({ page }) => {
    await page.goto('/registro');
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();
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

  test('register form rejects mismatched passwords with field error', async ({ page }) => {
    await page.goto('/registro');
    await page.getByLabel('Nombre').fill('Test');
    await page.getByLabel('Apellido').fill('User');
    await page.getByLabel('Nombre de usuario').fill('testuser');
    await page.getByLabel('Email', { exact: true }).fill('test@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Password1');
    await page.getByLabel('Confirmar contraseña').fill('Different1');
    await page.getByLabel('País').selectOption('Argentina');
    await page.getByLabel('Ciudad').fill('Buenos Aires');
    await page.getByLabel('Zona horaria').selectOption('America/Argentina/Buenos_Aires');
    await page.getByLabel(/Acepto los/).check();
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
  });

  test('login form has link to registro and recuperar', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Registrate' })).toBeVisible();
    await expect(page.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toBeVisible();
  });

  test('recovery form shows confirmation after submit', async ({ page }) => {
    await page.goto('/recuperar');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByRole('heading', { name: 'Revisá tu email' })).toBeVisible();
  });
});
