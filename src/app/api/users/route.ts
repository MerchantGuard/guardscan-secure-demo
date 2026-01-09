/**
 * Secure User API with authentication, rate limiting, and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const querySchema = z.object({
  id: z.string().uuid().optional(),
});

// GET /api/users - requires authentication
export async function GET(request: NextRequest) {
  // 1. Check authentication first
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Apply rate limiting
  const { success, remaining } = await rateLimit(request);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // 3. Validate input
  const id = request.nextUrl.searchParams.get('id');
  const validation = querySchema.safeParse({ id });

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  // 4. Query with Prisma (parameterized, no SQL injection)
  const users = await prisma.user.findMany({
    where: validation.data.id ? { id: validation.data.id } : {},
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ users, remaining });
}

// POST /api/users - requires authentication
export async function POST(request: NextRequest) {
  // 1. Check authentication first
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Apply rate limiting
  const { success } = await rateLimit(request);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // 3. Validate input
  const body = await request.json();
  const schema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
  });

  const validation = schema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // 4. Create user
  const user = await prisma.user.create({
    data: validation.data,
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
