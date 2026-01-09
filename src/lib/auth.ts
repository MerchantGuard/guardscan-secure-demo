/**
 * Authentication helper using NextAuth.js
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export async function auth() {
  return getServerSession(authOptions);
}

export function isAuthenticated(session: any): boolean {
  return !!(session?.user?.id);
}
