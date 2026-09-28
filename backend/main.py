from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fitz
import io
import re
import json
from collections import Counter

from scoring import calculate_score
import os
from ai_engine import generate_adaptive_question, generate_gemini_question

app = FastAPI(title="RAC Interview Selector Local Processing API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def extract_pdf_text(data: bytes) -> str:
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        return "\n".join(page.get_text() for page in doc)
    finally:
        doc.close()


def tokens(text):
    return re.findall(r"[a-zA-Z][a-zA-Z0-9+#./-]*", (text or "").lower())


def local_answer_evaluation(question, answer, stage="Technical"):
    q = (question or "").strip().lower()
    a = (answer or "").strip()
    qt = set(tokens(q))
    at = tokens(a)
    aset = set(at)
    if not a:
        return {"relevance": 0, "technical": 0, "confidence": 0, "communication": 0, "completeness": 0, "overall": 0,
                "feedback": "No answer was provided."}

    stop = {"the","and","for","with","that","this","what","how","would","could","from","your","you","tell","about","into","are","can","use","used","explain"}
    key_q = {x for x in qt if len(x) > 3 and x not in stop}
    overlap = len(key_q & aset) / max(1, len(key_q))
    relevance = min(100, round(55 + overlap * 45)) if key_q else 70
    length_score = min(100, round((len(at) / 70) * 100))
    sentence_count = max(1, len(re.split(r"[.!?]+", a)) - 1)
    communication = min(100, 55 + sentence_count * 8 + (10 if len(at) >= 35 else 0))
    confidence = min(100, 55 + (12 if len(at) >= 25 else 0) + (10 if "I" in a or "my" in a.lower() else 0) + (8 if sentence_count >= 2 else 0))
    technical = min(100, round(50 + overlap * 35 + min(15, len(at)//8))) if stage != "Ice-breaking" else min(100, round(65 + min(25, len(at)//8)))
    completeness = min(100, round(45 + min(55, len(at) * 1.1)))
    overall = round(relevance*.25 + technical*.30 + confidence*.15 + communication*.15 + completeness*.15)
    feedback = "Response is relevant and reasonably structured." if overall >= 70 else "Response needs more direct technical detail and clearer supporting points."
    return {"relevance": relevance, "technical": technical, "confidence": confidence, "communication": communication,
            "completeness": completeness, "overall": overall, "feedback": feedback}


@app.get("/")
def root():
    return {"message": "RAC local processing API is running", "storage": "browser localStorage only"}


@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...), job_description: str = Form(""), job_skills: str = Form("[]")):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF resumes are supported.")
    data = await file.read()
    text = extract_pdf_text(data)
    if not text.strip():
        raise HTTPException(400, "Could not extract readable text from the PDF.")
    try:
        parsed_job_skills = json.loads(job_skills or "[]")
        if not isinstance(parsed_job_skills, list):
            parsed_job_skills = []
    except json.JSONDecodeError:
        parsed_job_skills = []

    result = calculate_score(text, job_description, parsed_job_skills)
    return {"filename": file.filename, "analysis": result}


@app.post("/evaluate-answer")
async def evaluate_answer(payload: dict):
    return local_answer_evaluation(payload.get("question", ""), payload.get("answer", ""), payload.get("stage", "Technical"))


@app.post("/evaluate-interview")
async def evaluate_interview(payload: dict):
    answers = payload.get("answers", [])
    if not answers:
        return {"overall": 0, "technical": 0, "confidence": 0, "communication": 0, "relevance": 0, "completeness": 0, "feedback": "No answers available."}
    results = [local_answer_evaluation(x.get("question", ""), x.get("answer", ""), x.get("stage", "Technical")) for x in answers]
    keys = ["technical", "confidence", "communication", "relevance", "completeness", "overall"]
    out = {k: round(sum(r[k] for r in results)/len(results)) for k in keys}
    out["feedback"] = "Interview responses were evaluated locally using question-answer relevance, response structure, technical keyword coverage and completeness."
    out["answerEvaluations"] = results
    return out


@app.post("/generate-question")
async def generate_question(payload: dict):
    position = payload.get("position", "Scientist ‘B’")
    candidate_name = payload.get("candidateName", "Candidate")
    question_index = int(payload.get("questionIndex", 0))
    total_questions = int(payload.get("totalQuestions", 7))
    history = payload.get("history", [])
    last_answer = payload.get("lastAnswer", "")
    job_skills = payload.get("jobSkills", [])
    candidate_profile = payload.get("candidateProfile", {})
    api_key = payload.get("geminiApiKey") or os.environ.get("GEMINI_API_KEY", "")

    # If Gemini API key is provided, attempt Gemini generation first
    if api_key:
        try:
            gemini_result = generate_gemini_question(
                api_key=api_key,
                position=position,
                candidate_name=candidate_name,
                question_index=question_index,
                total_questions=total_questions,
                history=history,
                last_answer=last_answer,
                job_skills=job_skills,
                candidate_profile=candidate_profile
            )
            if gemini_result and gemini_result.get("question"):
                return gemini_result
        except Exception as e:
            print(f"Gemini fallback to local adaptive NLP: {e}")

    # Fallback to local adaptive NLP engine
    return generate_adaptive_question(
        position=position,
        candidate_name=candidate_name,
        question_index=question_index,
        total_questions=total_questions,
        history=history,
        last_answer=last_answer,
        job_skills=job_skills,
        candidate_profile=candidate_profile
    )


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """Offline transcription when PocketSphinx is installed. No external speech API is used."""
    try:
        import speech_recognition as sr
        audio_bytes = await file.read()
        recognizer = sr.Recognizer()
        with sr.AudioFile(io.BytesIO(audio_bytes)) as source:
            audio = recognizer.record(source)
        text = recognizer.recognize_sphinx(audio)
        return {"text": text, "engine": "PocketSphinx (offline)"}
    except Exception as exc:
        raise HTTPException(503, "Offline speech recognition is unavailable. Install SpeechRecognition and PocketSphinx, and provide a WAV recording. Details: " + str(exc))
