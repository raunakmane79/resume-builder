# ============================================================
# gemini.py
# ============================================================
# import google.generativeai as genai
# import json, os
#
# genai.configure(api_key=os.environ["GEMINI_API_KEY"])
# model = genai.GenerativeModel("gemini-1.5-flash")
#
# def call_gemini(prompt: str) -> dict:
#     response = model.generate_content(prompt)
#     text = response.text.strip()
#     if text.startswith("```"):
#         text = text.split("```")[1]
#         if text.startswith("json"):
#             text = text[4:]
#     return json.loads(text.strip())


# ============================================================
# SAVE EACH SECTION BELOW AS ITS OWN .py FILE
# ============================================================

###############################################################
# FILE: gemini.py
###############################################################
GEMINI_PY = '''
import google.generativeai as genai
import json
import os

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-1.5-flash")

def call_gemini(prompt: str) -> dict:
    response = model.generate_content(prompt)
    text = response.text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
'''

###############################################################
# FILE: prompts.py
###############################################################
PROMPTS_PY = '''
KEYWORD_EXTRACTION_PROMPT = """
You are a resume optimization expert. Analyze this job description and extract keywords.

Return ONLY valid JSON in this exact format, no markdown, no preamble:
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
You are a resume expert helping tailor bullet points to a job description.

Job keywords to incorporate (use relevant ones naturally): {keywords}

Original bullet point: "{bullet}"

Rules:
- Keep it 100% truthful — only improve wording and add relevant keywords
- Do NOT invent experience, metrics, or tools not implied by the original
- Use strong action verbs where appropriate
- Make it ATS-friendly, concise (1-2 lines max)
- Return exactly 2 alternative rewrites

Return ONLY valid JSON, no markdown:
{{
  "rewrites": [
    "First improved version here",
    "Second improved version here"
  ]
}}
"""
'''

###############################################################
# FILE: parser.py
###############################################################
PARSER_PY = '''
import pdfplumber
import docx
import re
from io import BytesIO

SECTION_HEADERS = {
    "summary": ["summary", "objective", "profile", "about", "professional summary"],
    "skills": ["skills", "technical skills", "competencies", "core competencies", "key skills"],
    "experience": ["experience", "work experience", "employment", "professional experience", "work history"],
    "projects": ["projects", "project experience", "key projects"],
    "education": ["education", "academic background", "academic qualifications"],
}

def detect_section(line: str) -> str | None:
    l = line.lower().strip().rstrip(":")
    for section, keywords in SECTION_HEADERS.items():
        if l in keywords:
            return section
    return None

def parse_text_to_sections(raw_text: str) -> dict:
    sections = {k: [] for k in SECTION_HEADERS}
    current = "summary"
    for line in raw_text.split("\\n"):
        line = line.strip()
        if not line:
            continue
        detected = detect_section(line)
        if detected:
            current = detected
            continue
        # Skip lines that are clearly headers (all caps, short)
        if line.isupper() and len(line) < 30:
            detected2 = detect_section(line.lower())
            if detected2:
                current = detected2
                continue
        sections[current].append(line)
    return sections

def parse_pdf(file_bytes: bytes) -> dict:
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        text = "\\n".join(page.extract_text() or "" for page in pdf.pages)
    return parse_text_to_sections(text)

def parse_docx(file_bytes: bytes) -> dict:
    doc = docx.Document(BytesIO(file_bytes))
    text = "\\n".join(p.text for p in doc.paragraphs)
    return parse_text_to_sections(text)
'''

###############################################################
# FILE: requirements.txt
###############################################################
REQUIREMENTS = """
fastapi==0.111.0
uvicorn==0.30.1
python-multipart==0.0.9
pdfplumber==0.11.0
python-docx==1.1.2
google-generativeai==0.7.2
fpdf2==2.7.9
"""

# Print instructions
print("Create 4 files in your backend/ folder:")
print()
print("1. gemini.py  — paste GEMINI_PY content")
print("2. prompts.py — paste PROMPTS_PY content")
print("3. parser.py  — paste PARSER_PY content")
print("4. requirements.txt — paste REQUIREMENTS content")
print()
print("Then run: GEMINI_API_KEY=your_key uvicorn main:app --reload")
