'use server';

import { signOut } from '@/application/auth/logout';
import { redirect } from 'next/navigation';

/**
 * Server action wrapper for the signOut flow.
 * Used by the form action in the app layout header.
 */
export async function signOutAction() {
  await signOut();
  redirect('/login');
}
