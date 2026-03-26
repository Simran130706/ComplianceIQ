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
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Initialize Groq client
// By default it searches for GROQ_API_KEY inside process.env
const groq = new Groq();

const systemPrompt = `You are a compliance rule extractor for Indian banking. Extract every enforceable rule from this policy document. 
Return the output as a JSON object with a key "rules" which is an array of rule objects.
Each rule object must have:
- clause_id: string
- condition: string
- requirement: string
- exception: string or null
- confidence: number (0-100)
- is_vague: boolean

Example format:
{
  "rules": [
    { "clause_id": "1.1", "condition": "...", "requirement": "...", "exception": null, "confidence": 90, "is_vague": false }
  ]
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

// A second endpoint for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
