/**
 * Rate limiting utility
 *
 * Uses sliding window algorithm with in-memory storage
 * For production, use Redis or similar
 */

import { NextRequest } from 'next/server';

const windowMs = 60 * 1000; // 1 minute window
const maxRequests = 60; // 60 requests per minute

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, number[]>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function rateLimit(request: NextRequest): Promise<{
  success: boolean;
  remaining: number;
  retryAfter: number;
}> {
  const ip = getClientIp(request);
  const now = Date.now();

  // Get existing timestamps for this IP
  const timestamps = rateLimitStore.get(ip) || [];

  // Filter to only timestamps within the window
  const recentTimestamps = timestamps.filter((ts) => ts > now - windowMs);

  if (recentTimestamps.length >= maxRequests) {
    const oldestInWindow = Math.min(...recentTimestamps);
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);

    return {
      success: false,
      remaining: 0,
      retryAfter,
    };
  }

  // Add current timestamp
  recentTimestamps.push(now);
  rateLimitStore.set(ip, recentTimestamps);

  // Cleanup old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, times] of rateLimitStore.entries()) {
      const filtered = times.filter((ts) => ts > now - windowMs);
      if (filtered.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, filtered);
      }
    }
  }

  return {
    success: true,
    remaining: maxRequests - recentTimestamps.length,
    retryAfter: 0,
  };
}
