# Hirely 🚀

### AI-Assisted Recruitment & Adaptive Technical Interview Platform

Hirely is an AI-assisted recruitment and technical interview platform designed to streamline candidate screening, job matching, adaptive technical interviews, and expert evaluation.

The platform combines a browser-based recruitment interface with a local Python backend for resume processing, ATS-style scoring, job matching, answer evaluation, speech-to-text fallback, and adaptive interview question generation.

It supports two interview-generation modes:

1. A custom local adaptive NLP/rule-based engine that works without an external AI API.
2. Optional Google Gemini 2.0 Flash integration for LLM-based adaptive question generation.

---

## ✨ Key Features

### 👤 Candidate Portal

- Candidate profile management
- Browse available technical positions
- View job requirements
- Upload PDF resume
- Resume screening and ATS-style score
- Job-description matching
- Application tracking
- Interview scheduling
- Adaptive technical interview
- Text-based answers
- Voice-based answers
- Question text-to-speech
- Interview history
- AI-assisted interview evaluation

---

### 📄 Resume Screening

Candidates can upload a PDF resume for automated analysis.

The backend:

1. Extracts text from the PDF.
2. Detects contact information.
3. Identifies common resume sections.
4. Searches for predefined technical keywords.
5. Evaluates content quality indicators.
6. Checks basic ATS-oriented formatting characteristics.
7. Matches resume keywords against the selected job description.
8. Produces an overall screening score and recommendations.

The screening score is calculated locally and does not require a third-party ATS service.

### Screening Components

| Component | Weight |
|---|---:|
| Contact Information | 10 |
| Resume Sections | 20 |
| Keyword Match | 30 |
| Content Quality | 20 |
| ATS Formatting | 20 |
| **Total** | **100** |

The prototype uses:

- **ATS score threshold:** 70/100
- **Job match threshold:** 50%

These thresholds are configurable in the application logic.

---

# 🧠 Adaptive Interview Engine

Hirely does not rely only on a fixed question bank.

The local adaptive engine analyzes:

- Candidate profile
- Claimed skills
- Projects
- Technologies mentioned
- Previous answers
- Previous evaluation scores
- Interview stage
- Candidate domain
- Response length
- Technical keywords in the answer

It then selects an appropriate follow-up question.

---

## 🔍 Local NLP / Adaptive Engine

The local engine is a custom deterministic NLP-style system implemented in Python.

It uses:

- Regular expressions
- Keyword extraction
- Entity extraction
- Technical-domain dictionaries
- Project detection
- Technology detection
- Domain classification
- Interview-history analysis
- Answer-score analysis
- Rule-based adaptive question pathways

### Technical entity extraction

The engine detects technologies from predefined technical vocabulary covering domains such as:

- Web Development
- Backend Development
- AI/ML
- Data
- Embedded Systems
- Defence/Electronics

For example, it can identify terms such as:

```text
Python
JavaScript
React
FastAPI
SQL
MongoDB
Machine Learning
NLP
YOLO
PyTorch
FPGA
Verilog
Radar
UAV