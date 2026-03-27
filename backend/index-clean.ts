import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Debug: Check if API key is loaded
console.log('GROQ_API_KEY loaded:', process.env.GROQ_API_KEY ? 'YES' : 'NO');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Initialize Groq client
// By default it searches for GROQ_API_KEY inside process.env
const groq = new Groq();

const systemPrompt = `You are a compliance rule extractor for Indian banking. Extract every enforceable rule from this policy document. 
Return the output as a JSON object with a key "rules" which is an array of rule objects.
Each rule object must have:
- clause_id: string (e.g., "AML-001")
- condition: string (The trigger, e.g., "transaction_amount > 1000000")
- obligation: string (The action, e.g., "report_to_FIU_within_days:7")
- exception: string or null (Exemptions, e.g., "account_type == 'government'")
- section_ref: string (The original manual/section number, e.g., "Section 3.1.2")
- confidence: number (Probability score 0-100)
- parent_id: string or null (If this rule depends on or references a previous clause_id)

Example format:
{
  "rules": [
    { "clause_id": "AML-003", "condition": "transaction_amount > 1000000", "obligation": "report_to_FIU_within_days:7", "exception": "account_type == 'government'", "section_ref": "Section 3.1.2", "confidence": 98, "parent_id": null }
  ]
}`;

app.post('/api/extract-rules', upload.single('policy'), async (req, res) => {
  try {
    console.log("Extraction request received");
    if (!req.file) {
      console.error("No file in request");
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    // Validate file extension
    if (!req.file.originalname.toLowerCase().endsWith('.pdf')) {
      console.error("Invalid file type:", req.file.originalname);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Only PDF files are allowed.' });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    console.log("PDF file read, size:", dataBuffer.length);
    
    // Validate PDF file header
    if (dataBuffer.length < 5 || !dataBuffer.toString('utf8', 0, 5).includes('%PDF')) {
      console.error("Invalid PDF header detected");
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid PDF file format.' });
    }
    
    // Extract text from PDF with enhanced error handling
    let pdfText = '';
    try {
      const data = await pdfParse(dataBuffer);
      pdfText = data.text;
      console.log("PDF text extracted, characters:", pdfText.length);
    } catch (pdfError: any) {
      console.error("PDF parsing failed:", pdfError.message);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'Failed to parse PDF file. Please ensure it is a valid, non-corrupted PDF.',
        details: pdfError.message 
      });
    }

    if (pdfText.trim().length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'PDF file appears to be empty or contains no extractable text.' });
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Call Groq API
    console.log("Calling Groq API with model llama-3.1-8b-instant...");
    let chatCompletion;
    try {
      chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract rules from this text:\n\n${pdfText.slice(0, 30000)}` } // Safety slice
        ],
        model: 'llama-3.1-8b-instant', // Changed to smaller model to avoid rate limits
        temperature: 0,
        response_format: { type: 'json_object' }
      });
    } catch (groqError: any) {
      console.error("Groq API call failed:", groqError.message);
      let errorMessage = 'AI service temporarily unavailable. Please try again.';
      
      if (groqError.message.includes('rate limit') || groqError.message.includes('429')) {
        errorMessage = 'AI rate limit exceeded. Please wait a few minutes and try again.';
      } else if (groqError.message.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your GROQ_API_KEY.';
      }
      
      return res.status(500).json({ 
        error: errorMessage,
        details: groqError.message 
      });
    }

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    console.log("Groq response received");
    
    let parsedRules = [];
    try {
      const rawObj = JSON.parse(responseContent);
      console.log("Response parsed successfully");
      
      if (Array.isArray(rawObj.rules)) {
        parsedRules = rawObj.rules;
      } else if (Array.isArray(rawObj)) {
        parsedRules = rawObj;
      } else {
        // Fallback
        parsedRules = Object.values(rawObj).find(v => Array.isArray(v)) || [];
      }
    } catch(e) {
      console.error("Failed to parse Groq response JSON. Content:", responseContent);
      return res.status(500).json({ error: 'Failed to process AI response.', raw: responseContent });
    }

    console.log("Sending", parsedRules.length, "rules back to frontend");
    res.json({ rules: parsedRules });

  } catch (error: any) {
    console.error('Error during extraction:', error.message || error);
    res.status(500).json({ error: error.message || 'Internal server error.' });
  }
});

function stripJsonFences(input: string) {
  // Handles cases like: ```json { ... } ```
  return input
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();
}

function safeParseJson(input: string) {
  const cleaned = stripJsonFences(input);
  try {
    return JSON.parse(cleaned);
  } catch {
    // Best-effort extraction of the first JSON object in the string.
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Failed to parse Groq response as JSON.');
  }
}

const circularSystemPrompt = `You are a senior RBI/SEBI compliance auditor AI.

Analyze the circular clauses against the active policy rules.

SCORING INSTRUCTIONS — THIS IS MANDATORY:
- Count the total number of distinct requirements in the circular. 
  Call this clauses_checked. This must NEVER be 0.
- Count how many of those requirements are covered by active rules.
  Call this clauses_covered.
- Calculate compliance_score as: 
  Math.round((clauses_covered / clauses_checked) * 100)
- If there are NO active policy rules at all, 
  clauses_covered = 0, compliance_score = 0
- If ALL clauses are covered, compliance_score = 100, status = CLEAR
- compliance_score must be a number between 0 and 100, NEVER null, 
  NEVER undefined, NEVER a string

Return ONLY this JSON, no markdown, no extra text:
{
  "status": "GAP_FOUND" or "CLEAR",
  "summary": "one sentence",
  "gaps": [
    {
      "gap_id": "G1",
      "circular_clause": "Exact clause from circular",
      "requirement": "What the bank must implement",
      "severity": "CRITICAL" or "MODERATE" or "ADVISORY",
      "deadline": "Deadline if mentioned, or null",
      "remediation": "Exact policy update needed"
    }
  ],
  "compliance_score": <number 0-100>,
  "clauses_checked": <number, minimum 1>,
  "clauses_covered": <number>
}`;

app.post('/api/analyze-circular', async (req, res) => {
  try {
    console.log('=== Circular Analysis Request ===');
    const { circularId, activePolicyRules } = req.body as {
      circularId?: string;
      activePolicyRules?: unknown;
    };

    console.log('Request body:', { circularId, activePolicyRulesCount: Array.isArray(activePolicyRules) ? activePolicyRules.length : 'N/A' });

    // Guard: circularId must exist
    if (!circularId || typeof circularId !== 'string') {
      console.error('Missing or invalid circularId:', circularId);
      return res.status(400).json({ error: 'circularId is required and must be a string.' });
    }

    const circularFileMap: Record<string, string> = {
      'RBI/2025-26/53': 'RBI_2025_26_53.txt',
      'RBI/2025-26/51': 'RBI_2025_26_51.txt',
      'RBI/2025-26/75': 'RBI_2025_26_75.txt',
      'RBI/2025-26/242': 'RBI_2025_26_242.txt'
    };

    const fileName = circularFileMap[circularId];
    if (!fileName) {
      console.error('Unknown circularId:', circularId);
      return res.status(400).json({ 
        error: `Unknown circularId: ${circularId}. Available IDs: ${Object.keys(circularFileMap).join(', ')}` 
      });
    }

    const circularPath = path.join(__dirname, 'circulars', fileName);
    console.log('Reading circular from:', circularPath);
    
    if (!fs.existsSync(circularPath)) {
      console.error('Circular file missing:', circularPath);
      return res.status(500).json({ error: `Circular text file missing on server: ${fileName}` });
    }

    const circularText = fs.readFileSync(circularPath, 'utf-8');
    if (!circularText || circularText.trim().length === 0) {
      console.error('Circular text is empty:', fileName);
      return res.status(500).json({ error: 'Circular text is empty.' });
    }

    console.log('Circular text loaded successfully, length:', circularText.length);

    // Guard: rules must be an array (can be empty)
    const policyRulesArray = Array.isArray(activePolicyRules) ? activePolicyRules : [];
    console.log('Processing', policyRulesArray.length, 'policy rules');

    const formattedRulesText = policyRulesArray
      .map((r: any, i: number) => {
        const ruleId = r?.rule_id ?? r?.ruleId ?? r?.clause_id ?? '';
        const policyName = r?.policy_name ?? r?.policyName ?? r?.name ?? r?.clause_id ?? `Rule_${i + 1}`;
        const condition = r?.condition ?? '';
        const source = r?.source ?? 'Internal Policy';
        const addedFrom = r?.added_from ?? r?.addedFrom ?? 'Policy Manager';
        const active = r?.active !== false;
        return `Rule ${i + 1}:
  policy_name: "${policyName}"
  rule_id: "${ruleId}"
  condition: "${condition}"
  source: "${source}"
  added_from: "${addedFrom}"
  active: ${active}`;
      })
      .join('\n\n');

    const userMessage = `REGULATORY CIRCULAR (Circular ID: ${circularId}):
${circularText}

BANK'S CURRENTLY ACTIVE POLICY RULES (${policyRulesArray.length} rules):
${formattedRulesText}

TASK:
Check every clause in the circular against ALL rules listed above.
A clause is COVERED if ANY rule above addresses the same topic or requirement.
A clause is a GAP only if NO rule above covers it at all.
Be generous in matching — if intent matches, it is covered.
Return the gap analysis JSON.`;

    console.log('Calling Groq API for circular analysis...');
    let chatCompletion;
    try {
      chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: circularSystemPrompt },
          { role: 'user', content: userMessage }
        ],
        model: 'llama-3.1-8b-instant', // Changed to smaller model to avoid rate limits
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });
    } catch (groqError: any) {
      console.error('Groq API call failed:', groqError.message);
      let errorMessage = 'AI service temporarily unavailable. Please try again.';
      
      if (groqError.message.includes('rate limit') || groqError.message.includes('429')) {
        errorMessage = 'AI rate limit exceeded. Please wait a few minutes and try again.';
      } else if (groqError.message.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your GROQ_API_KEY.';
      }
      
      return res.status(500).json({ 
        error: errorMessage,
        details: groqError.message 
      });
    }

    const responseContent = chatCompletion.choices[0]?.message?.content || '';
    console.log('Groq response received, length:', responseContent.length);
    
    let analysis;
    try {
      analysis = safeParseJson(responseContent);
      console.log('Response parsed successfully');
    } catch (parseError: any) {
      console.error('Failed to parse Groq response:', parseError.message);
      console.error('Raw response:', responseContent);
      return res.status(500).json({ 
        error: 'Failed to process AI response. Invalid JSON format.',
        details: parseError.message,
        rawResponse: responseContent 
      });
    }

    console.log('Groq response for', circularId, ':', JSON.stringify(analysis, null, 2))
    console.log('compliance_score value:', analysis.compliance_score)
    console.log('clauses_checked:', analysis.clauses_checked)
    console.log('clauses_covered:', analysis.clauses_covered)

    console.log('Analysis completed successfully');
    return res.json({ circularId, analysis, circularText });
  } catch (error: any) {
    console.error('Unexpected error during circular analysis:', error?.message || error);
    console.error('Stack trace:', error?.stack);
    return res.status(500).json({ 
      error: 'Internal server error during circular analysis.',
      details: error?.message || 'Unknown error'
    });
  }
});

// A second endpoint for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
