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

    const { scan_type, content } = await req.json();

    console.log('Threat detection:', scan_type);

    const startTime = Date.now();

    // Analyze content with AI
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
          content: `You are a cybersecurity threat detection AI. Analyze the provided content for threats and return a JSON response:
{
  "is_threat": boolean,
  "threat_level": "low" | "medium" | "high" | "critical",
  "threat_score": 0-100,
  "threat_category": "lottery" | "tech_support" | "impersonation" | "investment" | "romance" | "phishing" | "malware" | "safe",
  "detected_patterns": ["pattern1", "pattern2"],
  "risk_indicators": [
    {
      "indicator": "name",
      "severity": "low" | "medium" | "high" | "critical",
      "explanation": "why this is suspicious"
    }
  ],
  "explanation": "detailed explanation of findings",
  "recommended_action": "what the user should do"
}

Detect patterns like:
- Urgency tactics ("act now", "limited time")
- Impersonation (claiming to be from legitimate organizations)
- Financial requests (asking for money, personal info)
- Suspicious links or typos
- Grammar issues
- Too-good-to-be-true offers
- Emotional manipulation
- Requests for passwords/credentials`,
        }, {
          role: 'user',
          content: `Scan Type: ${scan_type}\n\nContent:\n${content}`,
        }],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI response failed: ${await response.text()}`);
    }

    const data = await response.json();
    let analysisResult;

    try {
      const responseContent = data.choices[0].message.content;
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      analysisResult = {
        is_threat: false,
        threat_level: 'low',
        threat_score: 0,
        threat_category: 'safe',
        explanation: 'Unable to parse analysis results',
        recommended_action: 'Review the content manually',
      };
    }

    const processingTime = Date.now() - startTime;

    // Save to database
    const { data: scan, error: insertError } = await supabaseClient
      .from('threat_scans')
      .insert({
        user_id: user.id,
        scan_type,
        content,
        ...analysisResult,
        processing_time_ms: processingTime,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('Threat scan completed:', scan.id);

    return new Response(
      JSON.stringify({ scan }),
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
