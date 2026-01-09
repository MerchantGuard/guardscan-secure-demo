/**
 * Secure Stripe client configuration
 *
 * Secret key loaded from environment variable
 */

import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

export const stripe = new Stripe(secretKey, {
  apiVersion: '2024-12-18.acacia',
});

// Create a checkout session with proper error handling
export async function createCheckoutSession({
  priceId,
  customerId,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return { success: true, sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return { success: false, error: 'Payment service unavailable' };
  }
}
