import { Handler } from '@netlify/functions';
import { runQuery } from './_lib/db';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { userId, feature, context: fbContext, improvedMetric, successStory } = JSON.parse(event.body || '{}');

    if (!userId || !feature || !improvedMetric) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    await runQuery(async (sql) => sql`
      INSERT INTO ai_performance_feedback (user_id, feature, context, improved_metric, success_story)
      VALUES (${userId}, ${feature}, ${fbContext ? JSON.stringify(fbContext) : null}, ${improvedMetric}, ${successStory || null})
    `);

    if (improvedMetric !== 'None' && improvedMetric !== 'Worse' && successStory) {
      const newRule = `La recomendación anterior tuvo un impacto positivo en ${improvedMetric}. El usuario notó: "${successStory}". Prioriza dar este tipo de insights aplicables.`;
      await runQuery(async (sql) => sql`
        INSERT INTO ai_prompt_rules (rule_type, content, feature, is_active)
        VALUES ('positive_example', ${newRule}, ${feature}, TRUE)
      `);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (error: any) {
    console.error('API Performance Feedback Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
