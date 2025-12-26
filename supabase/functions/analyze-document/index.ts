import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const ONSPACE_AI_BASE_URL = Deno.env.get('ONSPACE_AI_BASE_URL') || '';
const ONSPACE_AI_API_KEY = Deno.env.get('ONSPACE_AI_API_KEY') || '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { analysis_id, file_path } = await req.json();

    console.log('Starting document analysis:', analysis_id);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('legal-documents')
      .download(file_path);

    if (downloadError) throw new Error(`Download error: ${downloadError.message}`);

    // Extract text based on file type
    let extractedText: string;
    
    if (file_path.endsWith('.txt')) {
      // For text files, read directly
      const textContent = await fileData.text();
      extractedText = textContent;
      console.log('Text file processed directly');
    } else {
      // For PDF/DOC files, use AI for text extraction
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...uint8Array));
      
      console.log('Extracting text from document with AI...');
      
      const ocrResponse = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{
            role: 'user',
            content: `You are a document text extraction tool. Extract ALL text content from the provided document.
            
IMPORTANT:
- Return ONLY the extracted text, no commentary or explanations
- Preserve the structure and formatting as much as possible
- Include ALL text from every page
- Do not summarize or skip any content
            
Document (base64): ${base64}`,
          }],
          max_tokens: 8000,
        }),
      });

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        throw new Error(`OCR failed: ${errorText}`);
      }

      const ocrData = await ocrResponse.json();
      extractedText = ocrData.choices[0].message.content;
      console.log(`Text extracted: ${extractedText.length} characters`);
    }

    console.log('Starting legal analysis...');

    // Analyze document with AI
    const analysisResponse = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [{
          role: 'system',
          content: `You are an expert legal document analyzer. Your task is to thoroughly analyze legal documents and provide accurate, actionable insights.

IMPORTANT REQUIREMENTS:
- Base your analysis ONLY on the actual content provided
- Extract exact clause text from the document (do not paraphrase)
- Provide specific, fact-based risk assessments
- Identify actual obligations, dates, and payment terms present in the document
- DO NOT make assumptions or add information not in the document
- If information is not available, use null or empty arrays

Return ONLY a valid JSON object with this exact structure:
{
  "plain_summary": "2-3 sentence plain-language summary of what this document is about and its key terms",
  "risk_level": "low" | "medium" | "high",
  "risk_score": 0-100,
  "contract_type": "employment" | "rental" | "nda" | "business" | "service_agreement" | "other",
  "clauses": [
    {
      "type": "risk" | "payment" | "obligation" | "expiry" | "liability" | "termination" | "confidentiality",
      "text": "exact clause text from document (not paraphrased)",
      "risk_level": "low" | "medium" | "high",
      "position": 0,
      "explanation": "clear explanation of what this clause means and why it matters",
      "recommendation": "specific action to take (e.g., 'negotiate to add liability cap', 'require written notice')"
    }
  ],
  "compliance_issues": ["specific compliance concern 1", "specific compliance concern 2"],
  "recommended_actions": ["specific action 1", "specific action 2"],
  "key_obligations": ["specific obligation 1 with details", "specific obligation 2 with details"],
  "payment_terms": {
    "amount": "exact amount from document or 'Not specified'",
    "schedule": "payment schedule from document or 'Not specified'",
    "penalties": "late payment penalties from document or 'Not specified'"
  },
  "expiry_terms": {
    "date": "expiration date from document or 'Not specified'",
    "notice_period": "notice period from document or 'Not specified'",
    "auto_renewal": true | false | null
  }
}

RISK SCORING GUIDANCE:
- 0-30: Low risk (standard terms, fair clauses, adequate protections)
- 31-70: Medium risk (some unfavorable terms, missing protections, negotiation recommended)
- 71-100: High risk (very unfavorable terms, significant liability, legal review required)`,
        }, {
          role: 'user',
          content: `Analyze this legal document thoroughly and provide accurate insights based on its actual content:\n\n${extractedText}`,
        }],
        max_tokens: 6000,
        temperature: 0.2,
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${await analysisResponse.text()}`);
    }

    const analysisData = await analysisResponse.json();
    let analysisResult;

    try {
      const content = analysisData.choices[0].message.content;
      console.log('AI Response preview:', content.substring(0, 200));
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      analysisResult = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!analysisResult.plain_summary || !analysisResult.risk_level) {
        throw new Error('Missing required fields in analysis result');
      }
      
      // Ensure arrays exist
      analysisResult.clauses = analysisResult.clauses || [];
      analysisResult.compliance_issues = analysisResult.compliance_issues || [];
      analysisResult.recommended_actions = analysisResult.recommended_actions || [];
      analysisResult.key_obligations = analysisResult.key_obligations || [];
      
      console.log('Analysis completed successfully:', {
        risk_level: analysisResult.risk_level,
        risk_score: analysisResult.risk_score,
        clauses_count: analysisResult.clauses.length,
      });
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Raw response:', analysisData.choices[0].message.content);
      
      // Fallback with more informative error
      analysisResult = {
        plain_summary: 'Error: Failed to parse AI analysis. The document may be in an unsupported format or the AI response was invalid.',
        risk_level: 'medium',
        risk_score: 50,
        contract_type: 'other',
        clauses: [],
        compliance_issues: ['Analysis parsing failed - manual review recommended'],
        recommended_actions: ['Have document reviewed by a legal professional'],
        key_obligations: [],
        payment_terms: { amount: 'Not analyzed', schedule: 'Not analyzed', penalties: 'Not analyzed' },
        expiry_terms: { date: 'Not analyzed', notice_period: 'Not analyzed', auto_renewal: null },
      };
    }

    // Calculate actual processing time
    const processingEndTime = Date.now();
    const actualProcessingTime = processingEndTime - Date.now(); // This will be updated with start time

    // Update database
    const { error: updateError } = await supabaseClient
      .from('document_analyses')
      .update({
        status: 'completed',
        ...analysisResult,
        processing_time_ms: Math.floor(actualProcessingTime),
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysis_id);

    if (updateError) throw updateError;

    // Delete file from storage
    await supabaseClient.storage
      .from('legal-documents')
      .remove([file_path]);

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({ success: true, analysis_id }),
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
