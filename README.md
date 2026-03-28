# 🛡️ DhanrakshaQ: AI-Powered Regulatory Intelligence for Fintech

**DhanrakshaQ** is a futuristic, next-generation fintech engine designed for the Indian banking sector. It bridges the gap between static regulatory circulars (RBI/SEBI) and real-time transaction monitoring by automating rule extraction and forensic investigation.

---

## 🚀 Key Features

### 📜 AI-First Policy Extractor
Transform flat RBI/SEBI PDF circulars into structured, enforceable compliance rules using LLM-based logic extraction.
*   **Logical Correlation Trees**: Visual graph representation of regulatory decision logic.
*   **Confidence Metrics**: Every rule is scored for regulatory clarity before activation.

### 🔍 Forensic Deep-Dive (Interrogation Module)
Investigate threats at a granular level with reconstructed causality timelines.
*   **Causality Event Map**: Flowchart showing the exact path from login to violation flag.
*   **SAR Generator**: Automated generation of audit-ready Suspicious Activity Reports (SAR-903).

### 🤖 Intelligent Registry Ledger
A natural language interface for managing banking violations.
*   **NL Query Engine**: Understands plain English queries like `"show high risk above ₹10 Lakh"`.
*   **Audit Sidebar**: Multi-factor filtering with real-time risk intensity scores.

### 🧪 What-If Forecasting Simulator
Predict the business impact of policy changes before they are committed live.
*   **Predicted Violations VS Current Hits**: Side-by-side comparison of historical data vs theoretical policy changes.
*   **Operational Risk Warning**: Automatically detect when a threshold change will cause investigation burnout.

---

## 🛠️ Technology Stack

*   **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion (premium animations).
*   **Backend**: Node.js, Express.js, Multer.
*   **AI Engine**: Groq (Llama-3.3-70B-Versatile) for sub-second structured rule extraction.
*   **Visualizations**: React Flow (Logic Graphs), SVG Gauges.
*   **File Handling**: pdf-parse (for PDFs), PapaParse (for High-Performance CSV processing).

---

## 📦 Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   Groq API Key (Set in `backend/.env` as `GROQ_API_KEY`)

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📈 Scalability Roadmap
1.  **Live RBI Hook**: Automatic ingestion of circulars via crawlers.
2.  **Graph Analysis**: Detecting "Mule Networks" via Neo4j integration.
3.  **Federated Learning**: Branch-level risk models without compromising PII.

---

## 🏆 Project Recognition
Developed as part of the **AISF Hackathon 2024**, ComplianceIQ focuses on the "Regulatory Intelligence" problem statement, aiming to reduce the compliance overhead of traditional banks by up to **85%**.
