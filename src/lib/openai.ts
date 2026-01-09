/**
 * Secure OpenAI client configuration
 *
 * API key loaded from environment variable (not hardcoded)
 */

import OpenAI from 'openai';

// API key from environment variable - never hardcoded
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

export const openai = new OpenAI({
  apiKey,
});

// Helper for safe completions with error handling
export async function getCompletion(prompt: string, maxTokens = 1000) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    });

    return {
      success: true,
      content: response.choices[0]?.message?.content || '',
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      success: false,
      error: 'AI service temporarily unavailable',
    };
  }
}
