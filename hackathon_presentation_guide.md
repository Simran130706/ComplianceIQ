# 🏆 ComplianceIQ: The Absolute Master Technical Dossier

## I. Executive Summary
**ComplianceIQ** is an AI-powered next-generation fintech compliance and regulatory oversight platform designed for the Indian banking sector. It bridges the gap between static regulatory circulars (RBI/SEBI) and real-time transactional data by using Advanced LLMs to automate policy extraction and anomaly detection.

---

## II. System Architecture & Core Stack
The system follows a Decoupled Full-Stack Architecture:
*   **Edge Layer (Frontend)**: built with **React 18** and **TypeScript**. State management is centralized via **React Context (DataProvider)**, providing instant cross-module updates for rules and transactions.
*   **AI Service Layer (Backend)**: An **Express.js** Node server orchestration layer between the UI and the high-performance inference engine.
*   **Intelligence Engine**: Powered by **Groq (Llama-3.3-70B-Versatile)** for sub-second JSON logic extraction.

---

## III. Module-by-Module Technical Deep Dive

### 🏠 1. Landing & Initialized Module (Landing Page)
*   **What it does**: Entry point that simulates the "Node Handshake." It introduces the compliance-first philosophy.
*   **Technical Implementation**: 
    *   **Motion FX**: Uses **Framer Motion** `initial/animate` stacks for a futuristic, floating intro.
    *   **Glassmorphism**: Implements Tailwind's `backdrop-blur-xl` and `bg-white/60` for a high-end fintech aesthetic.

### 🏠 2. Compliance Dashboard (Home)
*   **What it does**: Provides a 360-degree situational awareness of system health.
*   **Technical Implementation**: 
    *   **Live Stats Engine**: Uses `useMemo` hooks to run real-time aggregations (Volume, Violation count, Cleanliness rate) over the entire transaction state.
    *   **Risk Intensity Map**: Uses a frequency-based sorting algorithm to identify and rank the top-5 risky entities.
    *   **System Beacon**: A pulsating CSS animation representing the "System Live" telemetry status.

### ⚙️ 3. Analysis Center (Compliance Engine)
*   **What it does**: The massive "Rule Dispatcher" that analyzes bulk data against AI-extracted policies.
*   **Technical Implementation**:
    *   **Progressive Analysis Logic**: Simulates a high-detail audit using a `setInterval` loop that iterates through the `transactions` array, mimicking the speed of a high-performance database scanner (~40 rows/sec).
    *   **Logic Toggles**: View mode switcher (Violations Only vs. Complete Registry) implemented via reactive state `viewMode`, filtering the local array before pagination.
    *   **Rule Matching Filter**: A `getRuleMatch` function cross-references every record against the `Rules[]` array in the context, checking for threshold breaches or "isLaundering" bit flags.

### 📜 4. Policy Manager & AI Extractor (Policies)
*   **What it does**: Ingests RBI/SEBI PDFs and extracts structured enforcement clauses.
*   **Technical Implementation**:
    *   **AI Extraction Service**: PDF text is sent to the backend. The LLM is instructed in a **Strict System Prompt** to return a JSON array (clause_id, condition, requirement, confidence).
    *   **Visual Decision Logic**: Uses **React Flow**. Each rule is converted into a decision-logic node. Edges show the correlation from "Clause" to "Impact."
    *   **Trust KPI Rings**: 4 custom SVG gauges measuring **Regulatory Clarity**, **Logic Coverage**, **Node Consistency**, and **Operational Risk** based on AI confidence.

### 📊 5. Registry Ledger & NL Query (Violations)
*   **What it does**: Investigates all historical violations with an AI-first interface.
*   **Technical Implementation**:
    *   **NLP Intent Detection**: Custom RegEx-based intent-detection engine that understands queries like `"show high risk "`, `"above 10 lakh "`, or `"structuring suspects "`.
    *   **Audit Sidebar**: Implements high-performance multi-threaded filtering (Risk Checkboxes + Amount Slider + Payment Types + Date Range Picker).
    *   **Risk Trending Indicators**: Custom `getTrend` logic that analyzes an employee's violation history frequency. If frequency increases over the timeline, the system flags it as **"Escalating Audit Profile"**.

### 🔍 6. Forensic Deep-Dive (Investigation)
*   **What it does**: Total forensic reconstruction of a single violation.
*   **Technical Implementation**:
    *   **Causality Event Map**: Flowchart visualizing the digital breadcrumb trail (Login → Access → Amount → SAR Flag).
    *   **Event Timeline**: Precision chronological history reconstructed from transaction metadata.
    *   **Official SAR Generator**: A "Virtual Document Engine" using CSS Print Media Queries. It maps transaction data into a **Suspicious Activity Report (SAR-903)** ready for SEBI dispatch.
    *   **Entity Risk Gauge**: A large SVG animated gauge (0-100) used to represent the "Probability Score" based on historic hits vs validations.

### 🧪 7. What-If Simulator (Simulator)
*   **What it does**: Predicts the impact of policy changes on a bank's operational capacity.
*   **Technical Implementation**:
    *   **Theoretical Forecast Engine**: Runs a "Mock Audit" in a background slice. It takes the slider threshold and calculates how many previously *clean* records would be flagged.
    *   **Operational Risk Alert**: If predicted volume increase threatens staff bandwidth (>100% inflation), the UI triggers a specific **Critical Operational Inflation** warning.

### 👁️ 8. RBI SEBI Monitor (Regulatory Sync)
*   **What it does**: Continuous cross-validation of internal policies against external regulatory updates.
*   **Technical Implementation**:
    *   **Gap Summary Generation**: Compares current active "Rules" to hypothetical "New Circulars." 
    *   **Remediation Logic**: When a gap is found, the system provides a "Required Update" step and an action button to "Update Policy" in the Rule Engine.

---

## IV. Mathematical Foundation: How Scores are Calculated

### 🩸 1. Individual Transaction Risk Score (Compliance Engine)
*   **Formula**: Categorical Weighted Point System.
*   **Logic**:
    *   **Flagged + High Threshold**: 98% (Critical) - When a rule is violated and the amount exceeds Section 3.1 thresholds.
    *   **Flagged + Low Threshold**: 75% (High) - Violation detected on a smaller amount.
    *   **Unflagged + Medium Flow**: 20% (Medium) - Transactions between ₹4L - ₹8.3L with no specific rule hits.
    *   **Baseline Profile**: 8% (Low) - Verified, clean transaction history.

### 👤 2. Entity/Employee Risk Probability (Investigation Page)
*   **Formula**: `(Total Violations / Total Transaction Count) * 100`
*   **Significance**: This represents the "Probability of Malintent." If an employee has 100 transactions and 5 are flagged, their score is 5%. If they have 5 transactions and 5 are flagged, their score is 100% (Critical Entity).

### 🏥 3. Policy Health KPI Rings (Policies Page)
*   **Regulatory Clarity**: Derived from the AI's **Confidence Score** return. It measures how "legally certain" the extraction was.
*   **Logic Coverage**: Measures the density of "Triggers" (conditions) found versus global standard benchmarks (e.g., SEBI-24).
*   **Operational Risk**: Calculated inversely from the predicted investigation volume. Lower predicted volume = Higher operational "Health".

### 🧼 4. System Hygiene / Cleanliness (Home Dashboard)
*   **Formula**: `((Total Records - Flagged Violations) / Total Records) * 100`
*   **Significance**: Represents the global "Green-Zone" of the ecosystem. 95%+ is considered optimal for system hygiene in Indian banking.

---

## V. Algorithmic Logic
*   **Precision INR Conversion**: centralizing the multiplier (x83) in `utils/format.ts`. Used `Math.round()` to prevent floating-point grouping errors.
*   **Dynamic Intent Parser**: Sanctuary parsing that cleans "noise" words like (show, find, list) from search before running keyword matching, ensuring combined searches (e.g., "high risk emp-105") work seamlessly.

---

## V. Future Scope: Implementation Roadmap

### 1. Live RBI API Integration
*   **How to implement**: Build a Python-based **Crawler (BeautifulSoup/Scrapy)** that polls the `rbi.org.in` notifications page. Integrate with a **Webhook** to trigger the `/api/extract-rules` endpoint the moment a new PDF is found.

### 2. Multi-Hop Graph Analysis
*   **How to implement**: Connect the frontend to a **Neo4j Graph Database**. This will turn transaction lists into "Webs of Risk," identifying money laundering rings (e.g., A transfers to B, C, D who all transfer back to A).

### 3. Predictive Behavior Models (ML)
*   **How to implement**: Integrate **TensorFlow.js** or **PyTorch** to run LSTM models on the time-series transaction data, predicting *future* violations before they happen based on historical velocity cues.

### 4. Zero-Knowledge Audits (ZKP)
*   **How to implement**: Use **Blockchain (Polygon/ZkSync)** to store proof of compliance without sharing sensitive customer data. This allows regulators to verify a bank is "Section 3.1 compliant" without actually seeing the private transaction amounts.

---

## VI. Final Presentation Checklist (Demonstration Flow)
1.  **Dashboard**: Show full situational awareness.
2.  **Policies**: Upload PDF → AI Extraction → Logic Tree visualization.
3.  **Compliance Engine**: Run Analysis (Audit simulation).
4.  **Violations**: Use the **AI Query bar**. Show how the sidebar filters are additive.
5.  **Investigation**: Show the **Event Timeline** and generate the **SAR PDF**.
6.  **Simulator**: Move the slider to show **Business Impact Prediction**.
7.  **RBI Monitor**: Show "Gap Summary" for new circulars.
