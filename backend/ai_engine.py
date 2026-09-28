import re
import os
import json
import urllib.request
import urllib.error

# Domain technical terms mapping
DOMAIN_KEYWORDS = {
    "web": [
        "html", "css", "javascript", "typescript", "react", "vue", "angular", "dom", "localstorage",
        "sessionstorage", "json", "fetch", "ajax", "event delegation", "event handling", "crud",
        "flexbox", "grid", "responsive", "frontend", "webpack", "vite", "tailwind"
    ],
    "backend": [
        "python", "node", "express", "fastapi", "django", "flask", "java", "spring boot", "c++", "c#",
        "sql", "postgresql", "mysql", "mongodb", "redis", "rest api", "graphql", "microservices",
        "docker", "kubernetes", "authentication", "jwt", "oauth", "kafka", "rabbitmq", "acid"
    ],
    "ai_ml": [
        "machine learning", "deep learning", "nlp", "computer vision", "pytorch", "tensorflow",
        "keras", "opencv", "yolo", "yolov8", "bert", "llm", "transformers", "langchain",
        "rag", "chromadb", "embeddings", "neural network", "scikit-learn", "data augmentation",
        "quantization", "tensorrt", "onnx", "precision", "recall", "f1-score"
    ],
    "data": [
        "sql", "pandas", "numpy", "matplotlib", "seaborn", "data analysis", "statistics",
        "etl", "data warehouse", "tableau", "power bi", "data cleaning", "scipy"
    ],
    "embedded_defence": [
        "vlsi", "fpga", "verilog", "vhdl", "dsp", "signal processing", "embedded c", "microcontroller",
        "arm", "arduino", "raspberry pi", "pcb", "radar", "rf", "telemetry", "rtos", "sensors",
        "uav", "drone", "avionics", "aerodynamics", "guidance system", "telemetry"
    ]
}

TECH_TERMS = set()
for terms in DOMAIN_KEYWORDS.values():
    TECH_TERMS.update(terms)


def clean_text(text: str) -> str:
    return (text or "").strip()


def extract_entities(text: str):
    """
    Extracts projects, technologies, and technical concepts mentioned in candidate text.
    """
    lower = text.lower()
    
    # 1. Detect technologies
    found_techs = []
    for tech in sorted(TECH_TERMS, key=len, reverse=True):
        pattern = r"\b" + re.escape(tech) + r"\b"
        if re.search(pattern, lower):
            found_techs.append(tech)

    # 2. Detect project mentions
    project_patterns = [
        r"(?:built|developed|created|worked on|designed|implemented|made|engineered|coded)\s+(?:\b(?:an|a|the|some|various)\b\s+)?([a-zA-Z0-9_\-\s]{3,55}?)(?=\s+(?:using|with|utilizing|based on|\.|\,|$)|$)",
        r"(?:project|system|application|app|platform|tool|model|pipeline|prototype|bot)\s+(?:called|named|titled|about)\s+([a-zA-Z0-9_\-\s]{3,50}?)(?=\s+(?:using|with|utilizing|based on|\.|\,|$)|$)",
        r"(?:my|our)\s+(?:final year|capstone|semester|hackathon|research|major|minor)?\s*(?:project|system|prototype)\s+(?:is|was|on|about)?\s*([a-zA-Z0-9_\-\s]{3,50}?)(?=\s+(?:using|with|utilizing|based on|\.|\,|$)|$)",
        r"project(?:\s+is|\s+was)?\s+([a-zA-Z0-9_\-\s]{3,45}?)(?=\s+(?:using|with|utilizing|based on|\.|\,|$)|$)"
    ]
    
    found_projects = []
    for pat in project_patterns:
        matches = re.finditer(pat, lower)
        for m in matches:
            candidate_proj = m.group(1).strip()
            candidate_proj = re.sub(r"^(?:a|an|the|my|our|some|various|new)\s+", "", candidate_proj).strip()
            candidate_proj = re.sub(r"^(?:called|named)\s+", "", candidate_proj).strip()
            if len(candidate_proj) >= 4 and not re.match(r"^(?:lot|number|few|many|good|simple|nice|things|stuff)$", candidate_proj):
                found_projects.append(candidate_proj)

    dedup_projects = []
    for p in found_projects:
        if not any(p in existing or existing in p for existing in dedup_projects):
            dedup_projects.append(p)

    return {
        "projects": dedup_projects[:3],
        "technologies": found_techs[:8],
        "has_project": len(dedup_projects) > 0 or ("project" in lower or "developed" in lower or "built" in lower),
        "word_count": len(re.findall(r"\w+", lower))
    }


def detect_candidate_domain(position: str, skills: list, projects: str, techs: list) -> str:
    pos_lower = (position or "").lower()
    skills_lower = " ".join([str(s).lower() for s in skills])
    proj_lower = (projects or "").lower()
    all_context = f"{pos_lower} {skills_lower} {proj_lower} {' '.join(techs)}"

    if any(k in all_context for k in ["computer vision", "yolo", "machine learning", "deep learning", "pytorch", "tensorflow", "ai", "model"]):
        return "ai_ml"
    if any(k in all_context for k in ["html", "css", "to-do", "todo", "frontend", "dom", "localstorage", "ui", "react", "web"]):
        return "web"
    if any(k in all_context for k in ["fastapi", "django", "express", "sql", "postgresql", "rest api", "backend", "microservices", "spring"]):
        return "backend"
    if any(k in all_context for k in ["pandas", "data analysis", "statistics", "tableau", "analytics"]):
        return "data"
    if any(k in all_context for k in ["radar", "fpga", "verilog", "dsp", "embedded", "uav", "avionics", "rtos", "sensors"]):
        return "embedded_defence"
    return "computer_science"


def generate_gemini_question(
    api_key: str,
    position: str,
    candidate_name: str,
    question_index: int,
    total_questions: int,
    history: list,
    last_answer: str,
    job_skills: list = None,
    candidate_profile: dict = None
) -> dict:
    """
    Calls Google Gemini API to generate an adaptive, conversational follow-up question.
    """
    if not api_key:
        return None

    profile_skills = (candidate_profile or {}).get("skills", "")
    profile_projects = (candidate_profile or {}).get("projects", "")

    prompt = f"""You are a distinguished Senior DRDO Scientist and Technical Selection Board Member conducting an official technical interview for the position of: "{position}".
The candidate's name is {candidate_name or "the Candidate"}.
Role requirements: {", ".join(job_skills or ["Technical Excellence", "Engineering Rigor"])}.
Candidate's Claimed Skills: {profile_skills or "Not specified"}
Candidate's Claimed Projects: {profile_projects or "Not specified"}

Interview Progress:
You are preparing Question {question_index + 1} of {total_questions}.

Previous Conversation History:
"""
    if not history and not last_answer:
        prompt += "(This is the beginning of the interview. Formulate Question 1 based on candidate's claimed profile and projects.)\n"
    else:
        for idx, item in enumerate(history):
            q_text = item.get("question", "")
            a_text = item.get("answer", "")
            prompt += f"Q{idx+1}: {q_text}\nCandidate Answer: {a_text}\n\n"
        if last_answer and not history:
            prompt += f"Candidate just answered: {last_answer}\n\n"

    prompt += f"""
Candidate's Latest Response:
\"\"\"{last_answer}\"\"\"

CRITICAL INSTRUCTIONS:
1. The questions MUST be context-aware and adaptive. Do NOT ask generic textbook questions like 'What is JavaScript?' or 'What is an array?'.
2. If the candidate mentions specific projects (e.g. To-Do List with localStorage, Drone surveillance with YOLOv8), identify the exact architectural and implementation concepts behind that project.
3. If candidate answered previously, follow up directly on what they said (e.g. if they mention using JSON.stringify for localStorage, ask WHY JSON serialization was required and what happens if an object is stored without it).
4. Adapt difficulty: If candidate gave a solid answer, increase technical depth. If candidate struggled, ask an appropriate conceptual question.
5. Return ONLY a valid JSON object in this format:
{{
  "question": "<The question string>",
  "stage": "<Opening & Project Architecture | Technical Drill-down | Data Persistence & Edge Cases | System Architecture | Defence & Resilience | Failure Analysis | Techno-managerial>",
  "category": "<Specific technical category>",
  "difficulty": "<Easy | Medium | Hard>",
  "feedback_on_previous": "<One sentence constructive observation on their previous answer>"
}}
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.25,
            "maxOutputTokens": 600,
            "responseMimeType": "application/json"
        }
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(content)
            parsed["engine"] = "gemini-2.0-flash"
            return parsed
    except Exception as exc:
        print(f"Gemini API fallback to local adaptive NLP: {exc}")
        return None


def generate_adaptive_question(
    position: str,
    candidate_name: str,
    question_index: int,
    total_questions: int = 7,
    history: list = None,
    last_answer: str = "",
    job_skills: list = None,
    candidate_profile: dict = None
) -> dict:
    """
    Intelligent, deterministic local adaptive question generator that maintains
    interview context, remembers candidate claims, and generates context-aware follow-ups
    for up to 7 questions across all major engineering roles.
    """
    history = history or []
    candidate_profile = candidate_profile or {}
    prof_projects = candidate_profile.get("projects", "")
    prof_skills = candidate_profile.get("skills", "")

    # Extract entities from profile and all answers
    last_ents = extract_entities(last_answer or "")
    prof_ents = extract_entities(f"{prof_projects} {prof_skills}")

    all_projects = []
    if prof_projects:
        all_projects.append(prof_projects)
    for p in prof_ents["projects"] + last_ents["projects"]:
        if not any(p.lower() in x.lower() or x.lower() in p.lower() for x in all_projects):
            all_projects.append(p)

    for h in history:
        prev_ents = extract_entities(h.get("answer", ""))
        for p in prev_ents["projects"]:
            if not any(p.lower() in x.lower() or x.lower() in p.lower() for x in all_projects):
                all_projects.append(p)

    all_techs = list(dict.fromkeys(prof_ents["technologies"] + last_ents["technologies"]))
    for h in history:
        prev_ents = extract_entities(h.get("answer", ""))
        for t in prev_ents["technologies"]:
            if t not in all_techs:
                all_techs.append(t)

    primary_project = all_projects[0] if all_projects else ""
    primary_techs = ", ".join(all_techs[:3]) if all_techs else ", ".join((job_skills or ["core engineering"])[:2])

    domain = detect_candidate_domain(position, job_skills or [], primary_project, all_techs)

    last_ans_lower = (last_answer or "").lower()
    last_eval = history[-1].get("evaluation", {}) if history else {}
    last_score = last_eval.get("overall", 75)
    struggled = last_score < 62 or "not sure" in last_ans_lower or "don't know" in last_ans_lower or len(last_ans_lower.split()) < 6

    # =========================================================================
    # ROLE SPECIFIC 7-QUESTION ADAPTIVE PATHWAYS
    # =========================================================================

    # --- PATH A: WEB DEVELOPMENT (Matches User's To-Do List / JavaScript Example) ---
    if domain == "web" or "todo" in primary_project.lower() or "to-do" in primary_project.lower() or "javascript" in all_techs:
        proj_label = primary_project if primary_project else "your JavaScript web application"

        if question_index == 0:
            if "to-do" in primary_project.lower() or "todo" in primary_project.lower():
                q_text = f"Welcome to your DRDO technical interview for {position}. In your profile, you noted building a To-Do List application using HTML, CSS and JavaScript. How did you store the tasks so that they remained available after refreshing the browser?"
            else:
                q_text = f"Welcome to your DRDO interview for {position}. Reviewing your profile, you mentioned developing {proj_label}. How did you architect the client-side state and data storage to ensure a responsive, reliable user experience?"
            return {
                "question": q_text,
                "stage": "Opening & Data Persistence",
                "category": "State & Storage",
                "difficulty": "Easy",
                "feedback_on_previous": "Starting interview with candidate's actual project."
            }

        elif question_index == 1:
            if "localstorage" in last_ans_lower or "json" in last_ans_lower or "storage" in last_ans_lower:
                q_text = "Why did you need JSON.stringify() and JSON.parse() when working with localStorage, and what would happen if you saved an array or object directly without serializing it?"
                cat = "Data Serialization"
                diff = "Medium"
            else:
                q_text = f"In {proj_label}, how did you ensure data integrity when persisting user records, and how did your JavaScript code handle reading data back upon page load?"
                cat = "Data Persistence"
                diff = "Medium"
            return {
                "question": q_text,
                "stage": "Technical Drill-down",
                "category": cat,
                "difficulty": diff,
                "feedback_on_previous": "Candidate accurately identified client-side storage mechanisms."
            }

        elif question_index == 2:
            if struggled:
                q_text = "When an element is clicked or a form is submitted in your application, how does event handling in JavaScript work, and what is the role of event.preventDefault()?"
                diff = "Easy"
            else:
                q_text = "When a user adds, completes, or deletes a task in your application, how did you handle DOM events (such as using event delegation on the parent container) and update the UI efficiently without re-rendering the whole page?"
                diff = "Medium"
            return {
                "question": q_text,
                "stage": "DOM & Event Architecture",
                "category": "Event Handling & UI Updates",
                "difficulty": diff,
                "feedback_on_previous": "Clear technical rationale on data serialization and browser storage."
            }

        elif question_index == 3:
            q_text = "How did you validate user inputs (for example, handling empty submissions, trailing whitespace, or duplicate entries), and how did your code maintain synchronization between the in-memory array and the UI elements?"
            return {
                "question": q_text,
                "stage": "Data Validation & CRUD",
                "category": "Input Validation & State",
                "difficulty": "Medium",
                "feedback_on_previous": "Good explanation of event propagation and DOM mutation."
            }

        elif question_index == 4:
            if struggled:
                q_text = "What is the difference between sessionStorage and localStorage in the browser, and in what scenario would you prefer one over the other?"
                diff = "Easy"
            else:
                q_text = "What are the limitations of localStorage regarding storage size limits and synchronous blocking of the main thread, and what alternative client-side storage mechanism (like IndexedDB) would you choose for larger offline datasets?"
                diff = "Hard"
            return {
                "question": q_text,
                "stage": "Performance & Storage Limitations",
                "category": "Browser Performance",
                "difficulty": diff,
                "feedback_on_previous": "Solid understanding of validation safeguards and state management."
            }

        elif question_index == 5:
            q_text = f"If this application were scaled into a mission-critical multi-user operational portal at DRDO, how would you restructure the application state and handle real-time synchronization or REST API integration?"
            return {
                "question": q_text,
                "stage": "Scalability & Architecture",
                "category": "System Scalability",
                "difficulty": "Hard",
                "feedback_on_previous": "Recognizes browser engine constraints and storage trade-offs."
            }

        else: # question_index == 6 (Question 7 of 7)
            q_text = "Suppose right before deployment to an operational unit, users report that tasks intermittently disappear on certain mobile browsers. How would you systematically diagnose, reproduce, and resolve this issue while communicating timeline risk to leadership?"
            return {
                "question": q_text,
                "stage": "Techno-managerial & Quality",
                "category": "Debugging & Risk Management",
                "difficulty": "Hard",
                "feedback_on_previous": "Architectural discussion aligns well with enterprise and defense standards."
            }

    # --- PATH B: AI / ML / COMPUTER VISION (e.g. YOLO, Drone, PyTorch) ---
    elif domain == "ai_ml":
        proj_label = primary_project if primary_project else "your AI/ML model implementation"

        if question_index == 0:
            q_text = f"Welcome to your DRDO technical interview for {position}. In your profile and projects, you highlighted work on {proj_label}. Could you explain your model selection, dataset curation pipeline, and how you evaluated initial performance?"
            return {"question": q_text, "stage": "Opening & Model Architecture", "category": "Model Selection", "difficulty": "Easy", "feedback_on_previous": "Starting interview with candidate's ML project."}

        elif question_index == 1:
            q_text = f"In developing {proj_label}, how did you approach data preprocessing, handling class imbalance or edge-case anomalies, and what data augmentation techniques proved most effective?"
            return {"question": q_text, "stage": "Data Preprocessing", "category": "Data Pipeline", "difficulty": "Medium", "feedback_on_previous": "Comprehensive overview of model architecture."}

        elif question_index == 2:
            if any(k in last_ans_lower for k in ["latency", "fps", "tensorrt", "quantization", "edge", "jetson"]):
                q_text = "You mentioned inference speed optimizations. Could you explain the exact trade-offs between FP32, FP16, and INT8 quantization, and how you ensured accuracy did not degrade significantly?"
            else:
                q_text = f"When evaluating {proj_label}, how did you balance model accuracy (mAP/F1-score) against inference latency, and what testing did you perform under constrained hardware?"
            return {"question": q_text, "stage": "Optimization & Inference", "category": "Quantization & Performance", "difficulty": "Hard" if not struggled else "Medium", "feedback_on_previous": "Practical insights into data augmentation and training rigor."}

        elif question_index == 3:
            q_text = "What was the most challenging false-positive or failure mode your model encountered during validation (for instance, occlusions, adverse weather, or lighting variations), and how did you resolve it?"
            return {"question": q_text, "stage": "Edge-Case Analysis", "category": "Validation & Robustness", "difficulty": "Medium", "feedback_on_previous": "Good technical depth on optimization trade-offs."}

        elif question_index == 4:
            q_text = f"In a DRDO defense scenario with deliberate optical camouflage, sensor noise, or severed telemetry, how would you design {proj_label} to fail-safe autonomously without human intervention?"
            return {"question": q_text, "stage": "Defence & Mission Systems", "category": "Fail-Safe Autonomy", "difficulty": "Hard", "feedback_on_previous": "Sound methodology for resolving edge-case model failures."}

        elif question_index == 5:
            q_text = "How do you implement continuous model monitoring and automated drift detection in production so that the system alerts scientists when target distributions change over time?"
            return {"question": q_text, "stage": "MLOps & Monitoring", "category": "Model Lifecycle", "difficulty": "Hard", "feedback_on_previous": "Clear alignment with defense-grade resilience requirements."}

        else: # Question 7
            q_text = "Two weeks before a critical DRDO field demonstration, trials reveal an unexpected 12% drop in detection accuracy under night-vision conditions. As the AI lead, what is your triage, re-validation, and risk communication plan?"
            return {"question": q_text, "stage": "Techno-managerial", "category": "Leadership Under Pressure", "difficulty": "Hard", "feedback_on_previous": "Mature approach to MLOps, telemetry, and lifecycle maintenance."}

    # --- PATH C: BACKEND & DISTRIBUTED SYSTEMS ---
    elif domain == "backend":
        proj_label = primary_project if primary_project else "your backend system"

        if question_index == 0:
            q_text = f"Welcome to your interview for {position}. In your profile, you mentioned developing {proj_label}. How did you design the API schema and select your database architecture to support data consistency and high performance?"
            return {"question": q_text, "stage": "Opening & API Architecture", "category": "Database & API Design", "difficulty": "Easy", "feedback_on_previous": "Exploring candidate's backend architecture."}

        elif question_index == 1:
            q_text = "How did you manage database transactions, indexing strategies, and ensure ACID compliance during concurrent write operations in your application?"
            return {"question": q_text, "stage": "Database Concurrency", "category": "Transactions & Indexing", "difficulty": "Medium", "feedback_on_previous": "Good overview of backend service boundary design."}

        elif question_index == 2:
            q_text = "How did you implement authentication and authorization (e.g. JWT, RBAC), and how did your services protect against token tampering and replay attacks?"
            return {"question": q_text, "stage": "Security & Auth", "category": "Authentication Security", "difficulty": "Medium", "feedback_on_previous": "Detailed explanation of concurrency control and indexing."}

        elif question_index == 3:
            q_text = "When caching responses with Redis or in-memory layers, how did you handle cache invalidation, cache stampedes, and data synchronization with the primary database?"
            return {"question": q_text, "stage": "Caching & Performance", "category": "Caching Architecture", "difficulty": "Hard" if not struggled else "Medium", "feedback_on_previous": "Solid grasp of token security and session hygiene."}

        elif question_index == 4:
            q_text = "If an upstream service experiences latency spikes or network partitions in an isolated DRDO military network, how would you design circuit breakers, retry backoffs, and fallback queues?"
            return {"question": q_text, "stage": "Resilience & Fault Tolerance", "category": "Distributed Systems", "difficulty": "Hard", "feedback_on_previous": "Effective strategy for cache consistency and eviction."}

        elif question_index == 5:
            q_text = "How do you design database schema migrations with zero downtime and ensure backward compatibility across active service replicas during rolling deployments?"
            return {"question": q_text, "stage": "Scalability & Deployment", "category": "Zero-Downtime Operations", "difficulty": "Hard", "feedback_on_previous": "Understands network partitioning and circuit breaker mechanics."}

        else: # Question 7
            q_text = "Suppose an audit right before release uncovers a potential SQL injection or privilege escalation vector in a core backend module under tight delivery deadlines. How do you patch, audit, and communicate the incident to DRDO leadership?"
            return {"question": q_text, "stage": "Techno-managerial", "category": "Incident Response & Governance", "difficulty": "Hard", "feedback_on_previous": "High engineering standards for schema evolution and deployment safety."}

    # --- PATH D: CORE DRDO / ELECTRONICS / EMBEDDED / SYSTEMS ---
    else:
        proj_label = primary_project if primary_project else f"your engineering work in {primary_techs}"

        if question_index == 0:
            q_text = f"Welcome to your interview for {position} at DRDO. Reviewing your technical background in {primary_techs}, could you describe the most demanding engineering project or system you have designed, outlining the core architecture and your role?"
            return {"question": q_text, "stage": "Opening & Core Engineering", "category": "System Architecture", "difficulty": "Easy", "feedback_on_previous": "Initiating interview across core domain background."}

        elif question_index == 1:
            q_text = f"In {proj_label}, what were the principal hardware-software constraints (such as clock rates, memory boundaries, or real-time latency), and how did you verify them?"
            return {"question": q_text, "stage": "Technical Specifications", "category": "Timing & Resource Constraints", "difficulty": "Medium", "feedback_on_previous": "Structured overview of system components."}

        elif question_index == 2:
            q_text = "How did you ensure deterministic real-time response, interrupt handling, or synchronization between asynchronous modules without race conditions or memory corruption?"
            return {"question": q_text, "stage": "Real-Time Determinism", "category": "Concurrency & Timing", "difficulty": "Medium", "feedback_on_previous": "Clear technical discussion of resource management."}

        elif question_index == 3:
            q_text = "What was the most challenging sensor noise, signal degradation, or hardware edge-case you encountered during testing, and how did you filter or compensate for it?"
            return {"question": q_text, "stage": "Signal & Fault Analysis", "category": "Signal Integrity", "difficulty": "Medium", "feedback_on_previous": "Solid approach to determinism and interrupt isolation."}

        elif question_index == 4:
            q_text = "At DRDO, equipment must endure harsh military environmental conditions (EMI, thermal cycling, and high-vibration). What design practices did you employ to ensure reliability in such hostile operating conditions?"
            return {"question": q_text, "stage": "Defence Environmental Standards", "category": "Ruggedization & Standards", "difficulty": "Hard", "feedback_on_previous": "Practical engineering rationale for signal filtering."}

        elif question_index == 5:
            q_text = "How did you structure Hardware-in-the-Loop (HIL) or automated unit simulation testbenches to validate fault recovery before physical deployment?"
            return {"question": q_text, "stage": "Verification & Testbenches", "category": "HIL Testing", "difficulty": "Hard", "feedback_on_previous": "Applies rigorous military standards to system hardening."}

        else: # Question 7
            q_text = "Suppose during field trials in Leh/Ladakh at sub-zero temperatures, the unit experiences an intermittent clock jitter or sensor drift. As technical lead, how do you coordinate troubleshooting under tight mission readiness deadlines?"
            return {"question": q_text, "stage": "Techno-managerial", "category": "Field Triage & Leadership", "difficulty": "Hard", "feedback_on_previous": "Excellent verification methodology and fault diagnosis."}
