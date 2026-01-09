/**
 * Stripe webhook handler
 *
 * Verifies webhook signatures for security
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle webhook events
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // TODO: Add CSRF token validation for state parameter
      console.log('Checkout completed for customer:', session.customer);
      break;

    case 'customer.subscription.updated':
      const subscription = event.data.object;
      console.log('Subscription updated:', subscription.id);
      break;

    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      console.log('Subscription cancelled:', deletedSub.id);
      break;

    default:
      console.log('Unhandled event type:', event.type);
  }

  return NextResponse.json({ received: true });
}
