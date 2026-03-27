import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

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

    // Call Groq API
    console.log("Calling Groq API with model llama-3.3-70b-versatile...");
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract rules from this text:\n\n${pdfText.slice(0, 30000)}` } // Safety slice
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      response_format: { type: 'json_object' }
    });

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
        { role: 'user', content: `Extract threshold values from this text:\n\n${pdfText.slice(0, 30000)}` } // Safety slice
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
    } catch(e) {
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

    // Prepare context-aware prompt
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
      temperature: 0.1, // Lower temperature for more accurate data facts
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
