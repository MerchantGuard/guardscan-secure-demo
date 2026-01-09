/**
 * Secure API endpoint for user operations
 *
 * Security measures:
 * - Environment variables for secrets
 * - Parameterized queries via Prisma
 * - Rate limiting
 * - Input validation
 * - Authentication check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

// Input validation schema
const userQuerySchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email().optional(),
});

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await rateLimit(request);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
    );
  }

  // Authentication check
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse and validate query params
  const searchParams = request.nextUrl.searchParams;
  const query = {
    id: searchParams.get('id') || undefined,
    email: searchParams.get('email') || undefined,
  };

  const validation = userQuerySchema.safeParse(query);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: validation.error.issues },
      { status: 400 }
    );
  }

  try {
    // Parameterized query via Prisma (no SQL injection)
    const users = await prisma.user.findMany({
      where: {
        ...(validation.data.id && { id: validation.data.id }),
        ...(validation.data.email && { email: validation.data.email }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        // Note: password hash is NOT selected
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await rateLimit(request);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // Authentication check
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Input validation
    const createSchema = z.object({
      email: z.string().email(),
      name: z.string().min(1).max(100),
    });

    const validation = createSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Create user with validated data
    const user = await prisma.user.create({
      data: {
        email: validation.data.email,
        name: validation.data.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
