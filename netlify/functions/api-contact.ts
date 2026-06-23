
import { Handler } from '@netlify/functions';
import { runQuery } from './_lib/db';
import { getCorsHeaders } from './_lib/corsHelper';
import { checkRateLimit, getClientIp } from './_lib/rateLimiter';
import { sanitizeXSS } from './_lib/sanitizer';

export const handler: Handler = async (event) => {
  const CORS = getCorsHeaders(event.headers.origin);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  // Rate limiting: 5 contact form submissions per hour per IP
  const clientIp = getClientIp(event);
  const rateLimitKey = `contact:${clientIp}`;
  const rateLimit = await checkRateLimit(rateLimitKey, { windowMs: 60 * 60 * 1000, max: 5 });
  if (!rateLimit.success) {
    return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'Too many requests. Try again later.' }) };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { name, email, website, budget, notes, role, goals } = data;

    // Validation
    if (!name || !email) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'Name and Email are required' }),
      };
    }

    // Length validation
    if (name.length > 100) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Name too long (max 100 chars)' }) };
    }
    if (email.length > 255) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Email too long' }) };
    }
    if (notes && notes.length > 2000) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Notes too long (max 2000 chars)' }) };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid email format' }) };
    }

    // Website URL validation (if provided)
    if (website) {
      try {
        new URL(website.startsWith('http') ? website : `https://${website}`);
      } catch {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid website URL' }) };
      }
    }

    const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = Date.now();

    // Sanitize inputs to prevent XSS
    const sanitizedName = sanitizeXSS(name);
    const sanitizedEmail = sanitizeXSS(email);
    const sanitizedWebsite = website ? sanitizeXSS(website) : null;
    const sanitizedNotes = notes ? sanitizeXSS(notes) : null;
    const sanitizedRole = role ? sanitizeXSS(role) : null;
    const sanitizedBudget = budget ? sanitizeXSS(budget) : null;
    const sanitizedGoals = goals ? sanitizeXSS(goals) : null;

    await runQuery(async (sql) => {
      await sql`
        CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY,
          role TEXT,
          budget TEXT,
          goals TEXT,
          email TEXT,
          name TEXT,
          website TEXT,
          notes TEXT,
          "createdAt" BIGINT,
          status TEXT
        )
      `;
      await sql`
        INSERT INTO leads (id, role, budget, goals, email, name, website, notes, "createdAt", status)
        VALUES (
          ${id},
          ${sanitizedRole},
          ${sanitizedBudget},
          ${sanitizedGoals},
          ${sanitizedEmail},
          ${sanitizedName},
          ${sanitizedWebsite},
          ${sanitizedNotes},
          ${createdAt},
          'new'
        )
      `;
    });

    console.log('[Contact Form] Lead saved:', { id, name, email });

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ message: 'Success', id }),
    };
  } catch (error) {
    console.error('[Contact Form] Error:', error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
