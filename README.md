# 🧱 Resume Lego Builder — Setup Guide

## Quick Start (2 commands)

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
GEMINI_API_KEY=your_key_here uvicorn main:app --reload

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## Full Folder Structure

```
resume-lego/
├── backend/
│   ├── main.py          ← FastAPI app (copy from deliverable)
│   ├── gemini.py        ← Gemini API wrapper
│   ├── prompts.py       ← All AI prompt templates
│   ├── parser.py        ← PDF/DOCX resume parser
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx      ← Full app (copy from deliverable)
    │   └── main.jsx     ← Entry point (standard Vite template)
    ├── index.html
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

---

## gemini.py
```python
import google.generativeai as genai
import json, os

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-1.5-flash")

def call_gemini(prompt: str) -> dict:
    response = model.generate_content(prompt)
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
```

## prompts.py
```python
KEYWORD_EXTRACTION_PROMPT = """
You are a resume optimization expert. Analyze this job description and extract keywords.
Return ONLY valid JSON, no markdown:
{{
  "skills": ["Power BI", "Lean Six Sigma"],
  "tools": ["Excel", "Python", "SAP"],
  "action_verbs": ["analyzed", "optimized", "reduced"],
  "domain_terms": ["supply chain", "manufacturing", "KPI"]
}}
Job Description:
{job_description}
"""

REWRITE_PROMPT = """
You are a resume expert. Job keywords: {keywords}
Original bullet: "{bullet}"
Rules: truthful only, no invented experience, ATS-friendly, 1-2 lines.
Return ONLY valid JSON:
{{"rewrites": ["Version 1", "Version 2"]}}
"""
```

## parser.py
```python
import pdfplumber, docx
from io import BytesIO

SECTION_HEADERS = {
    "summary": ["summary", "objective", "profile", "about"],
    "skills": ["skills", "technical skills", "competencies"],
    "experience": ["experience", "work experience", "employment"],
    "projects": ["projects", "project experience"],
    "education": ["education", "academic background"],
}

def detect_section(line):
    l = line.lower().strip().rstrip(":")
    for section, keywords in SECTION_HEADERS.items():
        if l in keywords:
            return section
    return None

def parse_text_to_sections(raw_text):
    sections = {k: [] for k in SECTION_HEADERS}
    current = "summary"
    for line in raw_text.split("\n"):
        line = line.strip()
        if not line: continue
        detected = detect_section(line)
        if detected:
            current = detected
            continue
        if line.isupper() and len(line) < 30:
            d2 = detect_section(line.lower())
            if d2:
                current = d2
                continue
        sections[current].append(line)
    return sections

def parse_pdf(file_bytes):
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    return parse_text_to_sections(text)

def parse_docx(file_bytes):
    doc = docx.Document(BytesIO(file_bytes))
    text = "\n".join(p.text for p in doc.paragraphs)
    return parse_text_to_sections(text)
```

---

## Frontend Setup

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**tailwind.config.js:**
```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

**src/index.css** (add at top):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**src/main.jsx:**
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

Then copy App.jsx from deliverable into src/App.jsx.

---

## Day-by-Day Plan

### Day 1 — Backend
1. Create `backend/` folder
2. Copy all 4 backend files (main.py, gemini.py, prompts.py, parser.py)
3. Create requirements.txt and run `pip install -r requirements.txt`
4. Test with curl:
   ```bash
   curl -X POST http://localhost:8000/extract-keywords \
     -H "Content-Type: application/json" \
     -d '{"job_description": "We need a data analyst skilled in Power BI and Python"}'
   ```

### Day 2 — Frontend + Polish
1. Scaffold React app (commands above)
2. Copy App.jsx into src/
3. Run `npm run dev` and test full flow
4. Upload a real resume, try AI suggestions, export

---

## Tips

- **Gemini API Key**: Get from https://aistudio.google.com/app/apikey
- **Parser accuracy**: If sections aren't parsed correctly, open your resume, find the exact header text, and add it to `SECTION_HEADERS` in parser.py
- **Rate limits**: gemini-1.5-flash is very fast and generous on free tier
- **Export quality**: fpdf2 produces clean ATS-safe PDFs; for rich formatting consider adding python-docx export too
