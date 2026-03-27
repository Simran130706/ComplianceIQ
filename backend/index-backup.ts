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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const upload = multer({ dest: 'uploads/' });

// Initialize Groq client
// By default it searches for GROQ_API_KEY inside process.env
const groq = new Groq();

const systemPrompt = `You are a compliance rule extractor for Indian banking. Extract every enforceable rule from this policy document. 
Return output as a JSON object with a key "rules" which is an array of rule objects.
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

const thresholdPrompt = `You are a compliance threshold extractor for Indian banking regulations. Extract only the monetary threshold values from this policy document.
Return output as a JSON object with these exact keys:
- aml: number (AML transaction threshold in INR)
- cash: number (Cash transaction threshold in INR) 
- structuring: number (Structuring threshold in INR)

If a threshold is not found, set it to null. Only return actual numerical values found in the document.
Example format:
{
  "aml": 1000000,
  "cash": 500000,
  "structuring": 300000
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

// New endpoint for threshold extraction specifically for simulator
app.post('/api/extract-thresholds', upload.single('policy'), async (req, res) => {
  try {
    console.log("Threshold extraction request received");
    if (!req.file) {
      console.error("No file in request");
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    console.log("PDF file read, size:", dataBuffer.length);

    // Extract text from PDF
    const data = await pdfParse(dataBuffer);
    const pdfText = data.text;
    console.log("PDF text extracted, characters:", pdfText.length);

    if (pdfText.trim().length === 0) {
      throw new Error("Extracted PDF text is empty.");
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Call Groq API for threshold extraction
    console.log("Calling Groq API for threshold extraction...");
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: thresholdPrompt },
        { role: 'user', content: `Extract threshold values from this text:\n\n${pdfText.slice(0, 30000)}` }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      response_format: { type: 'json_object' }
    });

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    console.log("Groq threshold response received");

    let extractedThresholds = { aml: null, cash: null, structuring: null };
    try {
      const parsed = JSON.parse(responseContent);
      console.log("Threshold response parsed successfully");
      extractedThresholds = {
        aml: parsed.aml || null,
        cash: parsed.cash || null,
        structuring: parsed.structuring || null
      };
    } catch (e) {
      console.error("Failed to parse threshold response JSON. Content:", responseContent);
      return res.status(500).json({ error: 'Failed to process AI response.', raw: responseContent });
    }

    console.log("Sending extracted thresholds:", extractedThresholds);
    res.json(extractedThresholds);

  } catch (error: any) {
    console.error('Error during threshold extraction:', error.message || error);
    res.status(500).json({ error: error.message || 'Internal server error.' });
  }
});

// AI Chat Endpoint
const chatSystemPrompt = `You are "ComplianceIQ AI", a high-speed regulatory assistant. 
STRICT REQUIREMENTS FOR ANSWERS:
- ALWAYS use concise bullet points.
- NEVER write long paragraphs.
- Keep answers ultra-concise and less detailed.
- Deliver only the most critical data/logic facts from the provided context.
- Use a "Rapid Audit" style.

Your expertise includes:
- RBI Master Directions & Circulars
- PMLA, KYC, and AML detection logic
- Transaction-based forensic analysis`;

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, transactions, rules } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    console.log("Chat request received (Data-Aware):", message);

    const dataContext = `
    CURRENT DATASET CONTEXT:
    - Total Transactions Loaded: ${transactions?.length || 0}
    - Total Policy Rules Extracted: ${rules?.length || 0}
    
    ${transactions ? `SAMPLE DATA (First 100 Rows): ${JSON.stringify(transactions.slice(0, 100))}` : 'No transaction data available.'}
    ${rules ? `SYSTEM RULES: ${JSON.stringify(rules.slice(0, 20))}` : 'No rules available.'}
    `;

    const messages = [
      { role: 'system', content: chatSystemPrompt + "\n\n" + dataContext },
      ...(history || []).map((h: any) => ({ role: h.isUser ? 'user' : 'assistant', content: h.text })),
      { role: 'user', content: message }
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 2048
    });

    const response = chatCompletion.choices[0]?.message?.content || "I'm sorry, I couldn't process that request.";
    console.log("Chat response generated successfully (with context)");

    res.json({ response });

  } catch (error: any) {
    console.error('Error during chat:', error.message || error);
    res.status(500).json({ error: 'AI Assistant failed to analyze the dataset.' });
  }
});

function stripJsonFences(input: string) {
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

    console.log('Request body:', {
      circularId,
      activePolicyRulesCount: Array.isArray(activePolicyRules) ? activePolicyRules.length : 'N/A'
    });

    // Guard: circularId must exist
    if (!circularId || typeof circularId !== 'string') {
      console.error('Missing or invalid circularId:', circularId);
      return res.status(400).json({ error: 'circularId is required and must be a string.' });
    }

    // Guard: rules must be an array (can be empty)
    if (!Array.isArray(activePolicyRules)) {
      console.error('Invalid activePolicyRules:', activePolicyRules);
      return res.status(400).json({ error: 'activePolicyRules must be an array.' });
    }

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

    const policyRulesArray = activePolicyRules;
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
        model: 'llama-3.1-8b-instant',
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
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
