from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import tempfile, os

from gemini import call_gemini
from parser import parse_pdf, parse_docx
from prompts import KEYWORD_EXTRACTION_PROMPT, REWRITE_PROMPT
from fpdf import FPDF

app = FastAPI(title="Resume Lego Builder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 1. Extract Keywords ──────────────────────────────────────────
class JDInput(BaseModel):
    job_description: str

@app.post("/extract-keywords")
async def extract_keywords(body: JDInput):
    prompt = KEYWORD_EXTRACTION_PROMPT.format(job_description=body.job_description)
    result = call_gemini(prompt)
    return result

# ── 2. Parse Resume ──────────────────────────────────────────────
@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    content = await file.read()
    filename = file.filename.lower()
    if filename.endswith(".pdf"):
        sections = parse_pdf(content)
    elif filename.endswith(".docx"):
        sections = parse_docx(content)
    else:
        return {"error": "Unsupported file type. Use PDF or DOCX."}
    return {"sections": sections}

# ── 3. Suggest Rewrites ──────────────────────────────────────────
class RewriteRequest(BaseModel):
    bullet: str
    keywords: List[str]

@app.post("/suggest-rewrites")
async def suggest_rewrites(body: RewriteRequest):
    kw_string = ", ".join(body.keywords[:20])  # cap at 20 keywords
    prompt = REWRITE_PROMPT.format(keywords=kw_string, bullet=body.bullet)
    result = call_gemini(prompt)
    return result  # {"rewrites": ["...", "..."]}

# ── 4. Export PDF ────────────────────────────────────────────────
class ExportRequest(BaseModel):
    sections: dict

@app.post("/export-pdf")
async def export_pdf(body: ExportRequest):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_margins(20, 20, 20)
    pdf.set_auto_page_break(auto=True, margin=20)

    section_labels = {
        "summary": "SUMMARY",
        "skills": "SKILLS",
        "experience": "EXPERIENCE",
        "projects": "PROJECTS",
        "education": "EDUCATION",
    }

    for section, label in section_labels.items():
        lines = body.sections.get(section, [])
        if not lines:
            continue
        # Section header
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(30, 80, 200)
        pdf.cell(0, 8, label, ln=True)
        pdf.set_draw_color(30, 80, 200)
        pdf.line(20, pdf.get_y(), 190, pdf.get_y())
        pdf.ln(2)

        # Content
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(40, 40, 40)
        for line in lines:
            prefix = "• " if section in ("experience", "projects", "skills") else ""
            pdf.multi_cell(0, 5.5, f"{prefix}{line}")
        pdf.ln(4)

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    pdf.output(tmp.name)
    return FileResponse(
        tmp.name,
        media_type="application/pdf",
        filename="tailored_resume.pdf",
        background=None
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
