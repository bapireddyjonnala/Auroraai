import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const ONSPACE_AI_BASE_URL = Deno.env.get('ONSPACE_AI_BASE_URL') || '';
const ONSPACE_AI_API_KEY = Deno.env.get('ONSPACE_AI_API_KEY') || '';

// Enhanced configuration for large documents
const MAX_CHUNK_SIZE = 50000; // Characters per chunk
const OCR_MODEL = 'google/gemini-3-flash-preview'; // 1M token context
const ANALYSIS_MODEL = 'google/gemini-2.5-pro'; // Best for legal analysis

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });

// Helper function for system prompt (reusable)
function getSystemPrompt(): string {
  return `You are an expert legal document analyzer specializing in comprehensive contract review. Your task is to thoroughly analyze legal documents of ANY length and provide accurate, actionable insights.

IMPORTANT REQUIREMENTS:
- Base your analysis ONLY on the actual content provided
- Extract exact clause text from the document (do not paraphrase)
- Provide specific, fact-based risk assessments
- Identify ALL important obligations, dates, and payment terms
- Analyze EVERY section of the document thoroughly
- DO NOT make assumptions or add information not in the document
- For multi-page documents, ensure you analyze ALL pages
- If information is not available, use null or empty arrays

Return ONLY a valid JSON object with this exact structure:
{
  "plain_summary": "2-4 sentence plain-language summary covering the main purpose, key parties, primary obligations, and critical terms",
  "risk_level": "low" | "medium" | "high",
  "risk_score": 0-100,
  "contract_type": "employment" | "rental" | "nda" | "business" | "service_agreement" | "purchase_agreement" | "lease" | "partnership" | "licensing" | "other",
  "clauses": [
    {
      "type": "risk" | "payment" | "obligation" | "expiry" | "liability" | "termination" | "confidentiality" | "indemnification" | "warranty" | "dispute_resolution",
      "text": "exact clause text from document (first 200 chars if very long)",
      "risk_level": "low" | "medium" | "high",
      "position": 0,
      "explanation": "clear explanation of what this clause means and why it matters",
      "recommendation": "specific action to take (e.g., 'negotiate to add liability cap', 'require written notice')"
    }
  ],
  "compliance_issues": ["specific compliance concern with details"],
  "recommended_actions": ["specific actionable step with context"],
  "key_obligations": ["specific obligation with timeline and parties responsible"],
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
- 0-30: Low risk (standard terms, fair clauses, adequate protections, balanced obligations)
- 31-70: Medium risk (some unfavorable terms, missing protections, negotiation recommended, unclear provisions)
- 71-100: High risk (very unfavorable terms, significant liability, one-sided obligations, legal review required)

CLAUSE IDENTIFICATION:
- Identify ALL critical clauses (aim for 5-15 key clauses)
- Prioritize high-risk and high-impact clauses
- Include clauses about liability, indemnification, termination, payment, confidentiality, warranties, and dispute resolution`;
}

// Helper function for analyzing large documents via chunking
async function analyzeLargeDocument(fullText: string): Promise<any> {
  console.log('Analyzing large document with intelligent chunking...');
  
  // Split document into chunks (preserving paragraph boundaries)
  const chunks: string[] = [];
  let currentChunk = '';
  const paragraphs = fullText.split('\n\n');
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  console.log(`Document split into ${chunks.length} chunks`);
  
  // Analyze each chunk and collect all clauses
  const allClauses: any[] = [];
  const allObligations: string[] = [];
  const allActions: string[] = [];
  const allCompliance: string[] = [];
  let overallSummary = '';
  let highestRiskScore = 0;
  let contractType = 'other';
  let paymentTerms = {};
  let expiryTerms = {};
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Analyzing chunk ${i + 1}/${chunks.length}...`);
    
    const chunkResponse = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        messages: [{
          role: 'system',
          content: getSystemPrompt(),
        }, {
          role: 'user',
          content: `This is chunk ${i + 1} of ${chunks.length} from a larger legal document. Analyze this section:\n\n${chunks[i]}`,
        }],
        max_tokens: 12000,
        temperature: 0.2,
      }),
    });
    
    if (chunkResponse.ok) {
      const chunkData = await chunkResponse.json();
      const chunkContent = chunkData.choices[0].message.content;
      const jsonMatch = chunkContent.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const chunkAnalysis = JSON.parse(jsonMatch[0]);
        
        // Aggregate results
        if (chunkAnalysis.clauses) allClauses.push(...chunkAnalysis.clauses);
        if (chunkAnalysis.key_obligations) allObligations.push(...chunkAnalysis.key_obligations);
        if (chunkAnalysis.recommended_actions) allActions.push(...chunkAnalysis.recommended_actions);
        if (chunkAnalysis.compliance_issues) allCompliance.push(...chunkAnalysis.compliance_issues);
        
        if (i === 0) {
          overallSummary = chunkAnalysis.plain_summary || '';
          contractType = chunkAnalysis.contract_type || 'other';
        }
        
        if (chunkAnalysis.risk_score > highestRiskScore) {
          highestRiskScore = chunkAnalysis.risk_score;
        }
        
        if (chunkAnalysis.payment_terms && Object.keys(chunkAnalysis.payment_terms).length > 0) {
          paymentTerms = chunkAnalysis.payment_terms;
        }
        
        if (chunkAnalysis.expiry_terms && Object.keys(chunkAnalysis.expiry_terms).length > 0) {
          expiryTerms = chunkAnalysis.expiry_terms;
        }
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Synthesize final analysis
  const finalRiskLevel = highestRiskScore > 70 ? 'high' : highestRiskScore > 40 ? 'medium' : 'low';
  
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          plain_summary: overallSummary || 'Multi-section legal document analyzed successfully.',
          risk_level: finalRiskLevel,
          risk_score: highestRiskScore,
          contract_type: contractType,
          clauses: allClauses.slice(0, 20), // Top 20 most important clauses
          compliance_issues: [...new Set(allCompliance)],
          recommended_actions: [...new Set(allActions)],
          key_obligations: [...new Set(allObligations)],
          payment_terms: Object.keys(paymentTerms).length > 0 ? paymentTerms : {
            amount: 'Not specified',
            schedule: 'Not specified',
            penalties: 'Not specified'
          },
          expiry_terms: Object.keys(expiryTerms).length > 0 ? expiryTerms : {
            date: 'Not specified',
            notice_period: 'Not specified',
            auto_renewal: null
          },
        })
      }
    }]
  };
}
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
      console.log(`Document size: ${base64.length} bytes (base64)`);
      
      // Use enhanced model with larger context window for better extraction
      const ocrResponse = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OCR_MODEL,
          messages: [{
            role: 'user',
            content: `You are an advanced OCR and document text extraction system. Your task is to extract ALL text content from the provided document with maximum accuracy.

CRITICAL REQUIREMENTS:
- Extract EVERY word, number, and character from the document
- Preserve ALL formatting, line breaks, and structure
- Include headers, footers, footnotes, and annotations
- Do NOT summarize, paraphrase, or skip ANY content
- Return ONLY the extracted text with no additional commentary
- Maintain original document order and layout
- Extract text from ALL pages (even if 100+ pages)

Document (base64 encoded): ${base64}`,
          }],
          max_tokens: 100000, // Increased from 8000 to 100k for large documents
          temperature: 0.1, // Low temperature for accurate extraction
        }),
      });

// Helper function for system prompt (reusable)
function getSystemPrompt(): string {
  return `You are an expert legal document analyzer specializing in comprehensive contract review. Your task is to thoroughly analyze legal documents of ANY length and provide accurate, actionable insights.

IMPORTANT REQUIREMENTS:
- Base your analysis ONLY on the actual content provided
- Extract exact clause text from the document (do not paraphrase)
- Provide specific, fact-based risk assessments
- Identify ALL important obligations, dates, and payment terms
- Analyze EVERY section of the document thoroughly
- DO NOT make assumptions or add information not in the document
- For multi-page documents, ensure you analyze ALL pages
- If information is not available, use null or empty arrays

Return ONLY a valid JSON object with this exact structure:
{
  "plain_summary": "2-4 sentence plain-language summary covering the main purpose, key parties, primary obligations, and critical terms",
  "risk_level": "low" | "medium" | "high",
  "risk_score": 0-100,
  "contract_type": "employment" | "rental" | "nda" | "business" | "service_agreement" | "purchase_agreement" | "lease" | "partnership" | "licensing" | "other",
  "clauses": [
    {
      "type": "risk" | "payment" | "obligation" | "expiry" | "liability" | "termination" | "confidentiality" | "indemnification" | "warranty" | "dispute_resolution",
      "text": "exact clause text from document (first 200 chars if very long)",
      "risk_level": "low" | "medium" | "high",
      "position": 0,
      "explanation": "clear explanation of what this clause means and why it matters",
      "recommendation": "specific action to take (e.g., 'negotiate to add liability cap', 'require written notice')"
    }
  ],
  "compliance_issues": ["specific compliance concern with details"],
  "recommended_actions": ["specific actionable step with context"],
  "key_obligations": ["specific obligation with timeline and parties responsible"],
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
- 0-30: Low risk (standard terms, fair clauses, adequate protections, balanced obligations)
- 31-70: Medium risk (some unfavorable terms, missing protections, negotiation recommended, unclear provisions)
- 71-100: High risk (very unfavorable terms, significant liability, one-sided obligations, legal review required)

CLAUSE IDENTIFICATION:
- Identify ALL critical clauses (aim for 5-15 key clauses)
- Prioritize high-risk and high-impact clauses
- Include clauses about liability, indemnification, termination, payment, confidentiality, warranties, and dispute resolution`;
}

// Helper function for analyzing large documents via chunking
async function analyzeLargeDocument(fullText: string): Promise<any> {
  console.log('Analyzing large document with intelligent chunking...');
  
  // Split document into chunks (preserving paragraph boundaries)
  const chunks: string[] = [];
  let currentChunk = '';
  const paragraphs = fullText.split('\n\n');
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  console.log(`Document split into ${chunks.length} chunks`);
  
  // Analyze each chunk and collect all clauses
  const allClauses: any[] = [];
  const allObligations: string[] = [];
  const allActions: string[] = [];
  const allCompliance: string[] = [];
  let overallSummary = '';
  let highestRiskScore = 0;
  let contractType = 'other';
  let paymentTerms = {};
  let expiryTerms = {};
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Analyzing chunk ${i + 1}/${chunks.length}...`);
    
    const chunkResponse = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        messages: [{
          role: 'system',
          content: getSystemPrompt(),
        }, {
          role: 'user',
          content: `This is chunk ${i + 1} of ${chunks.length} from a larger legal document. Analyze this section:\n\n${chunks[i]}`,
        }],
        max_tokens: 12000,
        temperature: 0.2,
      }),
    });
    
    if (chunkResponse.ok) {
      const chunkData = await chunkResponse.json();
      const chunkContent = chunkData.choices[0].message.content;
      const jsonMatch = chunkContent.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const chunkAnalysis = JSON.parse(jsonMatch[0]);
        
        // Aggregate results
        if (chunkAnalysis.clauses) allClauses.push(...chunkAnalysis.clauses);
        if (chunkAnalysis.key_obligations) allObligations.push(...chunkAnalysis.key_obligations);
        if (chunkAnalysis.recommended_actions) allActions.push(...chunkAnalysis.recommended_actions);
        if (chunkAnalysis.compliance_issues) allCompliance.push(...chunkAnalysis.compliance_issues);
        
        if (i === 0) {
          overallSummary = chunkAnalysis.plain_summary || '';
          contractType = chunkAnalysis.contract_type || 'other';
        }
        
        if (chunkAnalysis.risk_score > highestRiskScore) {
          highestRiskScore = chunkAnalysis.risk_score;
        }
        
        if (chunkAnalysis.payment_terms && Object.keys(chunkAnalysis.payment_terms).length > 0) {
          paymentTerms = chunkAnalysis.payment_terms;
        }
        
        if (chunkAnalysis.expiry_terms && Object.keys(chunkAnalysis.expiry_terms).length > 0) {
          expiryTerms = chunkAnalysis.expiry_terms;
        }
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Synthesize final analysis
  const finalRiskLevel = highestRiskScore > 70 ? 'high' : highestRiskScore > 40 ? 'medium' : 'low';
  
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          plain_summary: overallSummary || 'Multi-section legal document analyzed successfully.',
          risk_level: finalRiskLevel,
          risk_score: highestRiskScore,
          contract_type: contractType,
          clauses: allClauses.slice(0, 20), // Top 20 most important clauses
          compliance_issues: [...new Set(allCompliance)],
          recommended_actions: [...new Set(allActions)],
          key_obligations: [...new Set(allObligations)],
          payment_terms: Object.keys(paymentTerms).length > 0 ? paymentTerms : {
            amount: 'Not specified',
            schedule: 'Not specified',
            penalties: 'Not specified'
          },
          expiry_terms: Object.keys(expiryTerms).length > 0 ? expiryTerms : {
            date: 'Not specified',
            notice_period: 'Not specified',
            auto_renewal: null
          },
        })
      }
    }]
  };
}

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        throw new Error(`OCR failed: ${errorText}`);
      }

      const ocrData = await ocrResponse.json();
      extractedText = ocrData.choices[0].message.content;
      console.log(`Text extracted: ${extractedText.length} characters`);
    }

    console.log('Starting legal analysis...');
    console.log(`Extracted text length: ${extractedText.length} characters`);

    // For very large documents, implement intelligent chunking
    let fullAnalysis;
    
    if (extractedText.length > MAX_CHUNK_SIZE) {
      console.log('Large document detected - using chunked analysis');
      fullAnalysis = await analyzeLargeDocument(extractedText);
    } else {
      // Standard analysis for smaller documents
      const analysisResponse = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ANALYSIS_MODEL,
          messages: [{
            role: 'system',
            content: getSystemPrompt(),
          }, {
            role: 'user',
            content: `Analyze this legal document thoroughly and provide accurate insights based on its actual content:\n\n${extractedText}`,
          }],
          max_tokens: 16000, // Increased from 6000 to 16k
          temperature: 0.2,
        }),
      });

// Helper function for system prompt (reusable)
function getSystemPrompt(): string {
  return `You are an expert legal document analyzer specializing in comprehensive contract review. Your task is to thoroughly analyze legal documents of ANY length and provide accurate, actionable insights.

IMPORTANT REQUIREMENTS:
- Base your analysis ONLY on the actual content provided
- Extract exact clause text from the document (do not paraphrase)
- Provide specific, fact-based risk assessments
- Identify ALL important obligations, dates, and payment terms
- Analyze EVERY section of the document thoroughly
- DO NOT make assumptions or add information not in the document
- For multi-page documents, ensure you analyze ALL pages
- If information is not available, use null or empty arrays

Return ONLY a valid JSON object with this exact structure:
{
  "plain_summary": "2-4 sentence plain-language summary covering the main purpose, key parties, primary obligations, and critical terms",
  "risk_level": "low" | "medium" | "high",
  "risk_score": 0-100,
  "contract_type": "employment" | "rental" | "nda" | "business" | "service_agreement" | "purchase_agreement" | "lease" | "partnership" | "licensing" | "other",
  "clauses": [
    {
      "type": "risk" | "payment" | "obligation" | "expiry" | "liability" | "termination" | "confidentiality" | "indemnification" | "warranty" | "dispute_resolution",
      "text": "exact clause text from document (first 200 chars if very long)",
      "risk_level": "low" | "medium" | "high",
      "position": 0,
      "explanation": "clear explanation of what this clause means and why it matters",
      "recommendation": "specific action to take (e.g., 'negotiate to add liability cap', 'require written notice')"
    }
  ],
  "compliance_issues": ["specific compliance concern with details"],
  "recommended_actions": ["specific actionable step with context"],
  "key_obligations": ["specific obligation with timeline and parties responsible"],
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
- 0-30: Low risk (standard terms, fair clauses, adequate protections, balanced obligations)
- 31-70: Medium risk (some unfavorable terms, missing protections, negotiation recommended, unclear provisions)
- 71-100: High risk (very unfavorable terms, significant liability, one-sided obligations, legal review required)

CLAUSE IDENTIFICATION:
- Identify ALL critical clauses (aim for 5-15 key clauses)
- Prioritize high-risk and high-impact clauses
- Include clauses about liability, indemnification, termination, payment, confidentiality, warranties, and dispute resolution`;
}

// Helper function for analyzing large documents via chunking
async function analyzeLargeDocument(fullText: string): Promise<any> {
  console.log('Analyzing large document with intelligent chunking...');
  
  // Split document into chunks (preserving paragraph boundaries)
  const chunks: string[] = [];
  let currentChunk = '';
  const paragraphs = fullText.split('\n\n');
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  console.log(`Document split into ${chunks.length} chunks`);
  
  // Analyze each chunk and collect all clauses
  const allClauses: any[] = [];
  const allObligations: string[] = [];
  const allActions: string[] = [];
  const allCompliance: string[] = [];
  let overallSummary = '';
  let highestRiskScore = 0;
  let contractType = 'other';
  let paymentTerms = {};
  let expiryTerms = {};
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Analyzing chunk ${i + 1}/${chunks.length}...`);
    
    const chunkResponse = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        messages: [{
          role: 'system',
          content: getSystemPrompt(),
        }, {
          role: 'user',
          content: `This is chunk ${i + 1} of ${chunks.length} from a larger legal document. Analyze this section:\n\n${chunks[i]}`,
        }],
        max_tokens: 12000,
        temperature: 0.2,
      }),
    });
    
    if (chunkResponse.ok) {
      const chunkData = await chunkResponse.json();
      const chunkContent = chunkData.choices[0].message.content;
      const jsonMatch = chunkContent.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const chunkAnalysis = JSON.parse(jsonMatch[0]);
        
        // Aggregate results
        if (chunkAnalysis.clauses) allClauses.push(...chunkAnalysis.clauses);
        if (chunkAnalysis.key_obligations) allObligations.push(...chunkAnalysis.key_obligations);
        if (chunkAnalysis.recommended_actions) allActions.push(...chunkAnalysis.recommended_actions);
        if (chunkAnalysis.compliance_issues) allCompliance.push(...chunkAnalysis.compliance_issues);
        
        if (i === 0) {
          overallSummary = chunkAnalysis.plain_summary || '';
          contractType = chunkAnalysis.contract_type || 'other';
        }
        
        if (chunkAnalysis.risk_score > highestRiskScore) {
          highestRiskScore = chunkAnalysis.risk_score;
        }
        
        if (chunkAnalysis.payment_terms && Object.keys(chunkAnalysis.payment_terms).length > 0) {
          paymentTerms = chunkAnalysis.payment_terms;
        }
        
        if (chunkAnalysis.expiry_terms && Object.keys(chunkAnalysis.expiry_terms).length > 0) {
          expiryTerms = chunkAnalysis.expiry_terms;
        }
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Synthesize final analysis
  const finalRiskLevel = highestRiskScore > 70 ? 'high' : highestRiskScore > 40 ? 'medium' : 'low';
  
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          plain_summary: overallSummary || 'Multi-section legal document analyzed successfully.',
          risk_level: finalRiskLevel,
          risk_score: highestRiskScore,
          contract_type: contractType,
          clauses: allClauses.slice(0, 20), // Top 20 most important clauses
          compliance_issues: [...new Set(allCompliance)],
          recommended_actions: [...new Set(allActions)],
          key_obligations: [...new Set(allObligations)],
          payment_terms: Object.keys(paymentTerms).length > 0 ? paymentTerms : {
            amount: 'Not specified',
            schedule: 'Not specified',
            penalties: 'Not specified'
          },
          expiry_terms: Object.keys(expiryTerms).length > 0 ? expiryTerms : {
            date: 'Not specified',
            notice_period: 'Not specified',
            auto_renewal: null
          },
        })
      }
    }]
  };
}

      if (!analysisResponse.ok) {
        throw new Error(`Analysis failed: ${await analysisResponse.text()}`);
      }

      fullAnalysis = await analysisResponse.json();
    }

    const analysisResponse = fullAnalysis;

    const analysisData = analysisResponse;
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

// Helper function for system prompt (reusable)
function getSystemPrompt(): string {
  return `You are an expert legal document analyzer specializing in comprehensive contract review. Your task is to thoroughly analyze legal documents of ANY length and provide accurate, actionable insights.

IMPORTANT REQUIREMENTS:
- Base your analysis ONLY on the actual content provided
- Extract exact clause text from the document (do not paraphrase)
- Provide specific, fact-based risk assessments
- Identify ALL important obligations, dates, and payment terms
- Analyze EVERY section of the document thoroughly
- DO NOT make assumptions or add information not in the document
- For multi-page documents, ensure you analyze ALL pages
- If information is not available, use null or empty arrays

Return ONLY a valid JSON object with this exact structure:
{
  "plain_summary": "2-4 sentence plain-language summary covering the main purpose, key parties, primary obligations, and critical terms",
  "risk_level": "low" | "medium" | "high",
  "risk_score": 0-100,
  "contract_type": "employment" | "rental" | "nda" | "business" | "service_agreement" | "purchase_agreement" | "lease" | "partnership" | "licensing" | "other",
  "clauses": [
    {
      "type": "risk" | "payment" | "obligation" | "expiry" | "liability" | "termination" | "confidentiality" | "indemnification" | "warranty" | "dispute_resolution",
      "text": "exact clause text from document (first 200 chars if very long)",
      "risk_level": "low" | "medium" | "high",
      "position": 0,
      "explanation": "clear explanation of what this clause means and why it matters",
      "recommendation": "specific action to take (e.g., 'negotiate to add liability cap', 'require written notice')"
    }
  ],
  "compliance_issues": ["specific compliance concern with details"],
  "recommended_actions": ["specific actionable step with context"],
  "key_obligations": ["specific obligation with timeline and parties responsible"],
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
- 0-30: Low risk (standard terms, fair clauses, adequate protections, balanced obligations)
- 31-70: Medium risk (some unfavorable terms, missing protections, negotiation recommended, unclear provisions)
- 71-100: High risk (very unfavorable terms, significant liability, one-sided obligations, legal review required)

CLAUSE IDENTIFICATION:
- Identify ALL critical clauses (aim for 5-15 key clauses)
- Prioritize high-risk and high-impact clauses
- Include clauses about liability, indemnification, termination, payment, confidentiality, warranties, and dispute resolution`;
}

// Helper function for analyzing large documents via chunking
async function analyzeLargeDocument(fullText: string): Promise<any> {
  console.log('Analyzing large document with intelligent chunking...');
  
  // Split document into chunks (preserving paragraph boundaries)
  const chunks: string[] = [];
  let currentChunk = '';
  const paragraphs = fullText.split('\n\n');
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  console.log(`Document split into ${chunks.length} chunks`);
  
  // Analyze each chunk and collect all clauses
  const allClauses: any[] = [];
  const allObligations: string[] = [];
  const allActions: string[] = [];
  const allCompliance: string[] = [];
  let overallSummary = '';
  let highestRiskScore = 0;
  let contractType = 'other';
  let paymentTerms = {};
  let expiryTerms = {};
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Analyzing chunk ${i + 1}/${chunks.length}...`);
    
    const chunkResponse = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        messages: [{
          role: 'system',
          content: getSystemPrompt(),
        }, {
          role: 'user',
          content: `This is chunk ${i + 1} of ${chunks.length} from a larger legal document. Analyze this section:\n\n${chunks[i]}`,
        }],
        max_tokens: 12000,
        temperature: 0.2,
      }),
    });
    
    if (chunkResponse.ok) {
      const chunkData = await chunkResponse.json();
      const chunkContent = chunkData.choices[0].message.content;
      const jsonMatch = chunkContent.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const chunkAnalysis = JSON.parse(jsonMatch[0]);
        
        // Aggregate results
        if (chunkAnalysis.clauses) allClauses.push(...chunkAnalysis.clauses);
        if (chunkAnalysis.key_obligations) allObligations.push(...chunkAnalysis.key_obligations);
        if (chunkAnalysis.recommended_actions) allActions.push(...chunkAnalysis.recommended_actions);
        if (chunkAnalysis.compliance_issues) allCompliance.push(...chunkAnalysis.compliance_issues);
        
        if (i === 0) {
          overallSummary = chunkAnalysis.plain_summary || '';
          contractType = chunkAnalysis.contract_type || 'other';
        }
        
        if (chunkAnalysis.risk_score > highestRiskScore) {
          highestRiskScore = chunkAnalysis.risk_score;
        }
        
        if (chunkAnalysis.payment_terms && Object.keys(chunkAnalysis.payment_terms).length > 0) {
          paymentTerms = chunkAnalysis.payment_terms;
        }
        
        if (chunkAnalysis.expiry_terms && Object.keys(chunkAnalysis.expiry_terms).length > 0) {
          expiryTerms = chunkAnalysis.expiry_terms;
        }
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Synthesize final analysis
  const finalRiskLevel = highestRiskScore > 70 ? 'high' : highestRiskScore > 40 ? 'medium' : 'low';
  
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          plain_summary: overallSummary || 'Multi-section legal document analyzed successfully.',
          risk_level: finalRiskLevel,
          risk_score: highestRiskScore,
          contract_type: contractType,
          clauses: allClauses.slice(0, 20), // Top 20 most important clauses
          compliance_issues: [...new Set(allCompliance)],
          recommended_actions: [...new Set(allActions)],
          key_obligations: [...new Set(allObligations)],
          payment_terms: Object.keys(paymentTerms).length > 0 ? paymentTerms : {
            amount: 'Not specified',
            schedule: 'Not specified',
            penalties: 'Not specified'
          },
          expiry_terms: Object.keys(expiryTerms).length > 0 ? expiryTerms : {
            date: 'Not specified',
            notice_period: 'Not specified',
            auto_renewal: null
          },
        })
      }
    }]
  };
}
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

// Helper function for system prompt (reusable)
function getSystemPrompt(): string {
  return `You are an expert legal document analyzer specializing in comprehensive contract review. Your task is to thoroughly analyze legal documents of ANY length and provide accurate, actionable insights.

IMPORTANT REQUIREMENTS:
- Base your analysis ONLY on the actual content provided
- Extract exact clause text from the document (do not paraphrase)
- Provide specific, fact-based risk assessments
- Identify ALL important obligations, dates, and payment terms
- Analyze EVERY section of the document thoroughly
- DO NOT make assumptions or add information not in the document
- For multi-page documents, ensure you analyze ALL pages
- If information is not available, use null or empty arrays

Return ONLY a valid JSON object with this exact structure:
{
  "plain_summary": "2-4 sentence plain-language summary covering the main purpose, key parties, primary obligations, and critical terms",
  "risk_level": "low" | "medium" | "high",
  "risk_score": 0-100,
  "contract_type": "employment" | "rental" | "nda" | "business" | "service_agreement" | "purchase_agreement" | "lease" | "partnership" | "licensing" | "other",
  "clauses": [
    {
      "type": "risk" | "payment" | "obligation" | "expiry" | "liability" | "termination" | "confidentiality" | "indemnification" | "warranty" | "dispute_resolution",
      "text": "exact clause text from document (first 200 chars if very long)",
      "risk_level": "low" | "medium" | "high",
      "position": 0,
      "explanation": "clear explanation of what this clause means and why it matters",
      "recommendation": "specific action to take (e.g., 'negotiate to add liability cap', 'require written notice')"
    }
  ],
  "compliance_issues": ["specific compliance concern with details"],
  "recommended_actions": ["specific actionable step with context"],
  "key_obligations": ["specific obligation with timeline and parties responsible"],
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
- 0-30: Low risk (standard terms, fair clauses, adequate protections, balanced obligations)
- 31-70: Medium risk (some unfavorable terms, missing protections, negotiation recommended, unclear provisions)
- 71-100: High risk (very unfavorable terms, significant liability, one-sided obligations, legal review required)

CLAUSE IDENTIFICATION:
- Identify ALL critical clauses (aim for 5-15 key clauses)
- Prioritize high-risk and high-impact clauses
- Include clauses about liability, indemnification, termination, payment, confidentiality, warranties, and dispute resolution`;
}

// Helper function for analyzing large documents via chunking
async function analyzeLargeDocument(fullText: string): Promise<any> {
  console.log('Analyzing large document with intelligent chunking...');
  
  // Split document into chunks (preserving paragraph boundaries)
  const chunks: string[] = [];
  let currentChunk = '';
  const paragraphs = fullText.split('\n\n');
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  console.log(`Document split into ${chunks.length} chunks`);
  
  // Analyze each chunk and collect all clauses
  const allClauses: any[] = [];
  const allObligations: string[] = [];
  const allActions: string[] = [];
  const allCompliance: string[] = [];
  let overallSummary = '';
  let highestRiskScore = 0;
  let contractType = 'other';
  let paymentTerms = {};
  let expiryTerms = {};
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Analyzing chunk ${i + 1}/${chunks.length}...`);
    
    const chunkResponse = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        messages: [{
          role: 'system',
          content: getSystemPrompt(),
        }, {
          role: 'user',
          content: `This is chunk ${i + 1} of ${chunks.length} from a larger legal document. Analyze this section:\n\n${chunks[i]}`,
        }],
        max_tokens: 12000,
        temperature: 0.2,
      }),
    });
    
    if (chunkResponse.ok) {
      const chunkData = await chunkResponse.json();
      const chunkContent = chunkData.choices[0].message.content;
      const jsonMatch = chunkContent.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const chunkAnalysis = JSON.parse(jsonMatch[0]);
        
        // Aggregate results
        if (chunkAnalysis.clauses) allClauses.push(...chunkAnalysis.clauses);
        if (chunkAnalysis.key_obligations) allObligations.push(...chunkAnalysis.key_obligations);
        if (chunkAnalysis.recommended_actions) allActions.push(...chunkAnalysis.recommended_actions);
        if (chunkAnalysis.compliance_issues) allCompliance.push(...chunkAnalysis.compliance_issues);
        
        if (i === 0) {
          overallSummary = chunkAnalysis.plain_summary || '';
          contractType = chunkAnalysis.contract_type || 'other';
        }
        
        if (chunkAnalysis.risk_score > highestRiskScore) {
          highestRiskScore = chunkAnalysis.risk_score;
        }
        
        if (chunkAnalysis.payment_terms && Object.keys(chunkAnalysis.payment_terms).length > 0) {
          paymentTerms = chunkAnalysis.payment_terms;
        }
        
        if (chunkAnalysis.expiry_terms && Object.keys(chunkAnalysis.expiry_terms).length > 0) {
          expiryTerms = chunkAnalysis.expiry_terms;
        }
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Synthesize final analysis
  const finalRiskLevel = highestRiskScore > 70 ? 'high' : highestRiskScore > 40 ? 'medium' : 'low';
  
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          plain_summary: overallSummary || 'Multi-section legal document analyzed successfully.',
          risk_level: finalRiskLevel,
          risk_score: highestRiskScore,
          contract_type: contractType,
          clauses: allClauses.slice(0, 20), // Top 20 most important clauses
          compliance_issues: [...new Set(allCompliance)],
          recommended_actions: [...new Set(allActions)],
          key_obligations: [...new Set(allObligations)],
          payment_terms: Object.keys(paymentTerms).length > 0 ? paymentTerms : {
            amount: 'Not specified',
            schedule: 'Not specified',
            penalties: 'Not specified'
          },
          expiry_terms: Object.keys(expiryTerms).length > 0 ? expiryTerms : {
            date: 'Not specified',
            notice_period: 'Not specified',
            auto_renewal: null
          },
        })
      }
    }]
  };
}
