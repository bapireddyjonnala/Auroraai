import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const ONSPACE_AI_BASE_URL = Deno.env.get('ONSPACE_AI_BASE_URL') || '';
const ONSPACE_AI_API_KEY = Deno.env.get('ONSPACE_AI_API_KEY') || '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Anon client for authentication
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Service role client for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { query, analysis_id, analysis_data } = await req.json();

    console.log('Voice query:', query);

    // Create context from analysis data
    const context = `
Document Summary: ${analysis_data.summary || 'Not available'}
Risk Level: ${analysis_data.risk_level || 'Not assessed'}
Key Clauses: ${JSON.stringify(analysis_data.clauses || [])}
Obligations: ${JSON.stringify(analysis_data.obligations || [])}
Recommended Actions: ${JSON.stringify(analysis_data.actions || [])}
`;

    // Get AI response
    const response = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{
          role: 'system',
          content: `You are Aurora, a legal AI voice assistant. You help users understand legal documents in plain language. 
Be conversational, clear, and concise. Explain risks and provide actionable recommendations.
When discussing high-risk clauses, explain why they're risky and what the user should do.
Keep responses under 100 words for voice delivery.`,
        }, {
          role: 'user',
          content: `Based on this document analysis:\n${context}\n\nUser question: ${query}`,
        }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI response failed: ${await response.text()}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    // Save chat message
    await supabaseClient.from('chat_messages').insert([
      {
        user_id: user.id,
        document_id: analysis_id,
        role: 'user',
        content: query,
        is_voice: true,
      },
      {
        user_id: user.id,
        document_id: analysis_id,
        role: 'assistant',
        content: assistantResponse,
        is_voice: true,
      },
    ]);

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
