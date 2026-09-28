/* RAC Candidate Portal - behavior only. Existing HTML/CSS UI is preserved. */
const API_BASE = "http://127.0.0.1:8000";
const APPLICATION_KEY = "racApplications";
const INTERVIEW_KEY = "racInterviews";
const QUESTION_KEY = "racQuestionBank";
const PROFILE_KEY = "candidateProfile";
let activeInterviewId = null;
let currentQuestionIndex = 0;
let interviewQuestions = [];
let mediaRecorder = null;
let audioChunks = [];
let activeScreeningJob = null;
let screeningBusy = false;

function portalMessage(message, type = "info") {
    let el = document.getElementById("portalStatusMessage");
    if (!el) {
        el = document.createElement("div");
        el.id = "portalStatusMessage";
        el.style.cssText = "position:fixed;bottom:22px;right:22px;z-index:9999;max-width:420px;padding:12px 16px;border-radius:10px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.12);font-size:14px;border-left:4px solid #257044;";
        document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.borderLeftColor = type === "error" ? "#b42318" : type === "success" ? "#257044" : "#2563eb";
    clearTimeout(window.__portalMessageTimer);
    window.__portalMessageTimer = setTimeout(() => { if (el) el.remove(); }, 3500);
}

function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new StorageEvent("storage", {key, newValue: JSON.stringify(value)})); }
function getApplications() { return readJSON(APPLICATION_KEY, []); }
function getInterviews() { return readJSON(INTERVIEW_KEY, []); }
function getProfile() { return readJSON(PROFILE_KEY, {name:"Divya Pai",email:"candidate@example.com",phone:"+91 XXXXX XXXXX",skills:"JavaScript, Java, HTML, CSS",resume:""}); }

function showSection(sectionId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
    const section = document.getElementById(sectionId); if (section) section.classList.add("active-page");
    const titles = {dashboard:"Dashboard",jobs:"Find Jobs",resumeScreening:"Resume Screening",applications:"My Applications",interviews:"Interviews",profile:"My Profile"};
    const title = document.getElementById("pageTitle"); if (title) title.innerText = titles[sectionId] || "Dashboard";
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    const map = {dashboard:0,jobs:1,applications:2,interviews:3,profile:4};
    if (map[sectionId] !== undefined) document.querySelectorAll(".nav-item")[map[sectionId]]?.classList.add("active");
    if (sectionId === "applications") renderApplications();
    if (sectionId === "interviews") renderInterviews();
}

function jobByTitle(title) { return (typeof DRDO_POSITIONS !== "undefined" ? DRDO_POSITIONS : []).find(p => p.title === title); }
function jobDescription(job) { return `${job.title}. Required skills: ${job.skills.join(", ")}. Department/lab: ${job.lab}. Location: ${job.location}. Relevant technical knowledge, problem solving and communication are required.`; }

function seedQuestionBank() {
    const existing = readJSON(QUESTION_KEY, null);
    if (existing && Object.keys(existing).length) return existing;
    const bank = {};
    (DRDO_POSITIONS || []).forEach(job => {
        const skills = job.skills || [];
        bank[job.id] = [
            {id:`${job.id}-i1`,stage:"Ice-breaking",category:"Ice-breaking",text:"Please introduce yourself and briefly describe the experience or project you are most proud of."},
            {id:`${job.id}-i2`,stage:"Ice-breaking",category:"Ice-breaking",text:`What attracted you to the ${job.title} role and this area of work?`},
            {id:`${job.id}-t1`,stage:"Technical",category:"Technical",text:`Explain the core concepts you know in ${skills[0] || "your primary technical area"} and where you have applied them.`},
            {id:`${job.id}-t2`,stage:"Technical",category:"Technical",text:`Describe a technical problem related to ${skills[1] || skills[0] || "your field"} that you solved. What approach did you take?`},
            {id:`${job.id}-t3`,stage:"Technical",category:"Technical",text:`If a system involving ${skills[2] || skills[0] || "your specialization"} failed in production, how would you investigate and improve it?`},
            {id:`${job.id}-m1`,stage:"Techno-managerial",category:"Techno-managerial",text:"Suppose you are leading a small technical team under a strict deadline. How would you balance technical quality, risk and delivery?"}
        ];
    });
    writeJSON(QUESTION_KEY, bank); return bank;
}

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read the resume file."));
        reader.readAsDataURL(file);
    });
}

async function saveResumeToProfile(file) {
    const profile = getProfile();
    profile.resume = file.name;
    profile.resumeData = await fileToDataURL(file);
    writeJSON(PROFILE_KEY, profile);
    loadProfile();
    return profile;
}

function getStoredResumeBlob(profile) {
    if (!profile?.resumeData) return null;
    try {
        const parts = profile.resumeData.split(",");
        const mime = (parts[0].match(/data:([^;]+);/) || [])[1] || "application/pdf";
        const binary = atob(parts[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], {type:mime});
    } catch {
        return null;
    }
}

async function analyzeResumeFile(file, job) {
    const fd = new FormData();
    fd.append("file", file, file.name || "resume.pdf");
    fd.append("job_description", jobDescription(job));
    fd.append("job_skills", JSON.stringify(job.skills || []));
    const res = await fetch(`${API_BASE}/analyze-resume`, {method:"POST", body:fd});
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data.detail || "Resume analysis service is not running. Start the Python backend and try again.");
    return data;
}

function hasSystemwideInterviewConflict(interviews, interviewTime) {
    const target = new Date(interviewTime).getTime();
    if (!Number.isFinite(target)) return true;
    return (interviews || []).some(i => {
        if (!i?.interviewTime) return false;
        const existing = new Date(i.interviewTime).getTime();
        if (!Number.isFinite(existing)) return false;
        return Math.abs(existing - target) < (15 * 60 * 1000);
    });
}

function scheduleInterviewTime(existingInterviews = []) {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(11, 0, 0, 0);

    // Keep at least a 15-minute gap between every interview in the system.
    // Move forward in 15-minute slots until the candidate has a conflict-free time.
    while (hasSystemwideInterviewConflict(existingInterviews, date.toISOString())) {
        date.setMinutes(date.getMinutes() + 15);
    }
    return date.toISOString();
}

async function applyJob(jobName) {
    const job = jobByTitle(jobName);
    if (!job) return portalMessage("Position details could not be loaded.", "error");

    const profile = getProfile();
    const applications = getApplications();
    if (applications.some(a => a.positionId === job.id && a.candidateEmail === profile.email)) {
        return portalMessage("You have already applied for this position.");
    }

    activeScreeningJob = job;
    resetScreeningPage();
    const title = document.getElementById("screeningJobTitle");
    const details = document.getElementById("screeningJobDetails");
    if (title) title.textContent = job.title;
    if (details) details.textContent = `${job.lab} • ${job.location} • Required: ${job.skills.join(" · ")}`;
    showSection("resumeScreening");
}

function resetScreeningPage() {
    screeningBusy = false;
    const input = document.getElementById("applicationResumeInput");
    if (input) input.value = "";
    const name = document.getElementById("screeningFileName");
    if (name) name.textContent = "No resume selected";
    const result = document.getElementById("screeningResult");
    if (result) result.innerHTML = "";
    const status = document.getElementById("screeningStatus");
    if (status) status.textContent = "Upload a PDF resume to continue.";
    const button = document.getElementById("screenResumeButton");
    if (button) { button.disabled = false; button.textContent = "Scan Resume"; }
}

function updateScreeningFileName() {
    const input = document.getElementById("applicationResumeInput");
    const name = document.getElementById("screeningFileName");
    if (name) name.textContent = input?.files?.[0]?.name || "No resume selected";
}

async function screenApplicationResume() {
    if (screeningBusy) return;
    if (!activeScreeningJob) return portalMessage("Please select a job before uploading a resume.", "error");

    const input = document.getElementById("applicationResumeInput");
    const file = input?.files?.[0];
    if (!file) return portalMessage("Please select a PDF resume.", "error");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        return portalMessage("Please select a PDF resume.", "error");
    }

    const button = document.getElementById("screenResumeButton");
    const status = document.getElementById("screeningStatus");
    const result = document.getElementById("screeningResult");
    screeningBusy = true;
    if (button) { button.disabled = true; button.textContent = "Scanning..."; }
    if (status) status.textContent = "Scanning your resume against this job...";
    if (result) result.innerHTML = "";

    try {
        const data = await analyzeResumeFile(file, activeScreeningJob);
        const analysis = data.analysis || {};
        const atsScore = Number(analysis.score || 0);
        const jobMatch = Number(analysis.job_match?.score || 0);
        const eligible = Boolean(analysis.eligible);

        if (result) {
            result.innerHTML = `
                <div class="screening-score-grid">
                    <div class="screening-score-card"><span>ATS Score</span><strong>${atsScore}/100</strong><small>Required: 70+</small></div>
                    <div class="screening-score-card"><span>Job Match</span><strong>${jobMatch}%</strong><small>Required: 50%+</small></div>
                </div>
                <div class="screening-decision ${eligible ? "eligible" : "not-eligible"}">
                    <strong>${eligible ? "✓ Resume is eligible for this job" : "✕ Resume is not eligible for this job"}</strong>
                    <p>${eligible ? "Your application can now be submitted and the interview will be scheduled." : "You can upload another resume and run the screening again."}</p>
                </div>`;
        }

        if (eligible) {
            if (status) status.textContent = "Screening passed. Submitting your application...";
            submitApplication(activeScreeningJob, file.name, analysis);
        } else {
            if (status) status.textContent = "Screening complete. You can upload another resume.";
            if (button) { button.disabled = false; button.textContent = "Scan Another Resume"; }
            screeningBusy = false;
        }
    } catch (error) {
        screeningBusy = false;
        if (button) { button.disabled = false; button.textContent = "Scan Resume"; }
        if (status) status.textContent = "Resume screening could not be completed.";
        portalMessage(error.message || "Could not scan the resume.", "error");
    }
}

function submitApplication(job, resumeName, screening) {
    const profile = getProfile();
    const applications = getApplications();
    if (applications.some(a => a.positionId === job.id && a.candidateEmail === profile.email)) {
        screeningBusy = false;
        return portalMessage("You have already applied for this position.");
    }

    const existingInterviews = getInterviews();
    const interviewTime = scheduleInterviewTime(existingInterviews);
    const app = {
        id: "app-" + Date.now(),
        candidateEmail: profile.email,
        candidateName: profile.name,
        position: job.title,
        positionId: job.id,
        company: "DRDO",
        appliedOn: new Date().toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"}),
        status: "Interview Scheduled",
        statusClass: "approved",
        resumeName: resumeName || "Resume.pdf",
        resumeScreening: {
            atsScore: Number(screening?.score || 0),
            jobMatch: Number(screening?.job_match?.score || 0),
            eligible: Boolean(screening?.eligible)
        },
        interviewTime,
        expertDecision: "Pending"
    };

    applications.unshift(app);
    writeJSON(APPLICATION_KEY, applications);

    const interviews = getInterviews();
    interviews.push({
        id: app.id,
        applicationId: app.id,
        position: app.position,
        positionId: app.positionId,
        candidateName: app.candidateName,
        startedAt: null,
        currentQuestion: 0,
        answers: [],
        questions: [],
        status: "Scheduled",
        interviewTime,
        evaluation: null
    });
    writeJSON(INTERVIEW_KEY, interviews);

    seedQuestionBank();
    renderApplications();
    renderInterviews();
    activeScreeningJob = null;
    screeningBusy = false;
    portalMessage(`Application submitted. Your interview is scheduled for ${new Date(interviewTime).toLocaleString()}.`, "success");
    showSection("applications");
}

function renderApplications() {
    const container = document.getElementById("applicationRows"); if (!container) return;
    const apps = getApplications();
    if (!apps.length) { container.innerHTML='<div class="application-row"><span>No applications yet.</span><span>DRDO</span><span>—</span><span class="status review">Start applying</span></div>'; return; }
    container.innerHTML = apps.map(app => `<div class="application-row"><span>${app.position}</span><span>${app.company}</span><span>${app.appliedOn}</span><span class="status ${app.statusClass||"review"}">${app.status}${app.interviewTime?` • ${new Date(app.interviewTime).toLocaleString()}`:""}</span></div>`).join("");
}

function renderInterviews() {
    const list = document.querySelector("#interviews .interview-list"); if (!list) return;
    const apps = getApplications().filter(a => a.status === "Interview Scheduled" || a.status === "Completed");
    if (!apps.length) return;
    list.innerHTML = apps.map(app => `<div class="interview-card large"><div><span class="status ${app.status==='Completed'?'completed':'upcoming'}">${app.status}</span><h2>${app.position}</h2><p>${app.company}</p><div class="interview-details">📅 ${new Date(app.interviewTime).toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})}<br>🕐 ${new Date(app.interviewTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}<br>🤖 AI Interview</div></div><button onclick="openInterview('${app.id}')" class="${app.status==='Completed'?'secondary-btn':'primary-btn'}">${app.status==='Completed'?'View Result':'Enter Interview'}</button></div>`).join("");
}

/* ================= ADAPTIVE AI INTERVIEW ENGINE & SETTINGS ================= */
const DOMAIN_TECH_KEYWORDS = [
    "python", "c++", "c", "java", "javascript", "typescript", "react", "node", "fastapi",
    "django", "flask", "docker", "kubernetes", "sql", "postgresql", "mongodb", "redis",
    "linux", "git", "aws", "microservices", "rest api", "graphql", "kafka", "rabbitmq",
    "data structures", "algorithms", "operating systems", "networking", "distributed systems",
    "machine learning", "deep learning", "nlp", "computer vision", "pytorch", "tensorflow",
    "keras", "opencv", "yolo", "yolov8", "bert", "llm", "transformers", "langchain",
    "rag", "chromadb", "embeddings", "reinforcement learning", "neural network", "scikit-learn",
    "cyber security", "cryptography", "encryption", "penetration testing", "wireshark",
    "reverse engineering", "malware analysis", "firewall", "ids", "ips", "snort",
    "vlsi", "fpga", "verilog", "vhdl", "dsp", "signal processing", "embedded c", "microcontroller",
    "arm", "arduino", "raspberry pi", "pcb", "radar", "rf", "telemetry", "rtos", "sensors",
    "cad", "ansys", "solidworks", "catia", "thermodynamics", "fluid mechanics", "fea",
    "aerodynamics", "cfd", "robotics", "actuators", "vehicle dynamics", "mechatronics",
    "uav", "drone", "flight dynamics", "avionics", "aerodynamics", "propulsion", "airframe",
    "guidance system", "navigation", "autopilot", "composite materials"
];

function getInterviewQuestionCount() {
    return parseInt(localStorage.getItem("racQuestionCount") || "5", 10);
}
function getAiEngineMode() {
    return localStorage.getItem("racAiEngine") || "adaptive";
}
function getGeminiApiKey() {
    return localStorage.getItem("racGeminiApiKey") || "";
}
function isAutoSpeakEnabled() {
    return localStorage.getItem("racAutoSpeak") !== "false";
}

function openInterviewSettings() {
    const modal = document.getElementById("interviewSettingsModal");
    if (!modal) return;
    const qCount = document.getElementById("settingsQuestionCount");
    const engine = document.getElementById("settingsAiEngine");
    const key = document.getElementById("settingsGeminiApiKey");
    if (qCount) qCount.value = getInterviewQuestionCount();
    if (engine) engine.value = getAiEngineMode();
    if (key) key.value = getGeminiApiKey();
    toggleApiKeyField();
    modal.style.display = "flex";
}

function closeInterviewSettings() {
    const modal = document.getElementById("interviewSettingsModal");
    if (modal) modal.style.display = "none";
}

function toggleApiKeyField() {
    const engine = document.getElementById("settingsAiEngine")?.value;
    const grp = document.getElementById("geminiApiKeyGroup");
    if (grp) grp.style.display = (engine === "gemini") ? "block" : "none";
}

function saveInterviewSettings() {
    const qCount = document.getElementById("settingsQuestionCount")?.value || "5";
    const engine = document.getElementById("settingsAiEngine")?.value || "adaptive";
    const key = document.getElementById("settingsGeminiApiKey")?.value.trim() || "";
    localStorage.setItem("racQuestionCount", qCount);
    localStorage.setItem("racAiEngine", engine);
    if (key) localStorage.setItem("racGeminiApiKey", key);
    else localStorage.removeItem("racGeminiApiKey");
    updateAiBadge();
    closeInterviewSettings();
    portalMessage("Interview settings updated successfully.", "success");
    if (activeInterviewId) {
        updateProgressDisplay();
    }
}

function saveAutoSpeakPref() {
    const chk = document.getElementById("autoSpeakCheckbox");
    if (chk) localStorage.setItem("racAutoSpeak", chk.checked ? "true" : "false");
}

function updateAiBadge() {
    const badge = document.getElementById("aiModelBadge");
    if (!badge) return;
    const mode = getAiEngineMode();
    if (mode === "gemini" && getGeminiApiKey()) {
        badge.innerHTML = "✦ Gemini 2.0 Flash LLM";
        badge.style.color = "#4338ca";
        badge.style.background = "rgba(224, 231, 255, 0.85)";
    } else {
        badge.innerHTML = "🤖 Smart Adaptive AI Engine";
        badge.style.color = "#1e3a8a";
        badge.style.background = "rgba(219, 234, 254, 0.85)";
    }
}

function extractEntitiesFromAnswer(text) {
    const lower = (text || "").toLowerCase();
    const foundTechs = [];
    DOMAIN_TECH_KEYWORDS.forEach(tech => {
        const regex = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lower)) foundTechs.push(tech);
    });

    const projectPatterns = [
        /(?:built|developed|created|worked on|designed|implemented|made|engineered|coded)\s+(?:\b(?:an|a|the|some|various)\b\s+)?([a-zA-Z0-9_\-\s]{3,55}?)(?=\s+(?:using|with|utilizing|based on|\.|\,|$)|$)/gi,
        /(?:project|system|application|app|platform|tool|model|pipeline|prototype|bot)\s+(?:called|named|titled|about)\s+([a-zA-Z0-9_\-\s]{3,50}?)(?=\s+(?:using|with|utilizing|based on|\.|\,|$)|$)/gi,
        /(?:my|our)\s+(?:final year|capstone|semester|hackathon|research|major|minor)?\s*(?:project|system|prototype)\s+(?:is|was|on|about)?\s*([a-zA-Z0-9_\-\s]{3,50}?)(?=\s+(?:using|with|utilizing|based on|\.|\,|$)|$)/gi,
        /project(?:\s+is|\s+was)?\s+([a-zA-Z0-9_\-\s]{3,45}?)(?=\s+(?:using|with|utilizing|based on|\.|\,|$)|$)/gi
    ];

    const foundProjects = [];
    projectPatterns.forEach(pat => {
        let m;
        while ((m = pat.exec(lower)) !== null) {
            let candidate = m[1].trim()
                .replace(/^(?:a|an|the|my|our|some|various|new)\s+/i, '')
                .replace(/^(?:called|named)\s+/i, '')
                .trim();
            if (candidate.length >= 4 && !/^(?:lot|number|few|many|good|simple|nice|things|stuff)$/i.test(candidate)) {
                foundProjects.push(candidate);
            }
        }
    });

    const dedupProjects = [];
    foundProjects.forEach(p => {
        if (!dedupProjects.some(existing => existing.includes(p) || p.includes(existing))) {
            dedupProjects.push(p);
        }
    });

    return {
        projects: dedupProjects.slice(0, 3),
        technologies: foundTechs.slice(0, 8)
    };
}

function clientGenerateAdaptiveQuestion({ position, questionIndex, totalQuestions, history, lastAnswer, jobSkills }) {
    const curEntities = extractEntitiesFromAnswer(lastAnswer || "");
    const allProjects = [...curEntities.projects];
    const allTechs = [...curEntities.technologies];

    (history || []).forEach(h => {
        const prevEnts = extractEntitiesFromAnswer(h.answer || "");
        prevEnts.projects.forEach(p => { if (!allProjects.includes(p)) allProjects.push(p); });
        prevEnts.technologies.forEach(t => { if (!allTechs.includes(t)) allTechs.push(t); });
    });

    const primaryProject = allProjects[0] || null;
    const primaryTechs = allTechs.slice(0, 3).join(", ") || (jobSkills || ["core engineering disciplines"]).slice(0, 2).join(", ");

    let stageMap;
    if (totalQuestions <= 3) {
        stageMap = { 0: "Ice-breaking", 1: "Project & Technical Deep Dive", 2: "DRDO Defence & Leadership" };
    } else if (totalQuestions <= 5) {
        stageMap = {
            0: "Ice-breaking",
            1: "Project Deep Dive",
            2: "Technical Drill-down",
            3: "Defence Systems & Resilience",
            4: "Techno-managerial"
        };
    } else {
        stageMap = {
            0: "Ice-breaking",
            1: "Project Deep Dive",
            2: "Technical Architecture",
            3: "Performance & Edge Cases",
            4: "Defence Systems & Resilience",
            5: "Failure Analysis",
            6: "Techno-managerial"
        };
    }

    const stage = stageMap[questionIndex] || "Technical Follow-up";

    // Question 1: Opening
    if (questionIndex === 0) {
        return {
            question: `Welcome to your interview for ${position} at DRDO. Could you please introduce yourself, summarize your core technical background, and tell us about the most significant project or system you have engineered?`,
            stage: "Ice-breaking",
            category: "Introduction & Background",
            feedback_on_previous: "Starting interview session."
        };
    }

    // Question 2: Project Deep Dive
    if (questionIndex === 1) {
        if (primaryProject) {
            return {
                question: `You highlighted your work on "${primaryProject}" involving ${primaryTechs}. Could you walk us through the system architecture, your specific technical contributions, and the key architectural trade-offs you made during development?`,
                stage: "Project Deep Dive",
                category: "System Architecture",
                feedback_on_previous: `Good introduction. The candidate emphasized practical implementation experience with ${primaryTechs}.`
            };
        } else if (allTechs.length) {
            return {
                question: `You mentioned strong familiarity with ${primaryTechs}. Could you detail a complex technical project or problem where you implemented these technologies, explaining the core architecture and your role?`,
                stage: "Project Deep Dive",
                category: "Technical Experience",
                feedback_on_previous: `Clear background summary highlighting ${primaryTechs}.`
            };
        } else {
            return {
                question: `In the context of the ${position} role, what is the most technically demanding project or coursework implementation you have undertaken, and what challenges did you solve?`,
                stage: "Project Deep Dive",
                category: "Technical Experience",
                feedback_on_previous: "Response noted. Exploring practical project depth."
            };
        }
    }

    // Question 3: Technical Drill-down
    if (questionIndex === 2) {
        const focus = primaryProject ? `"${primaryProject}"` : `your work with ${primaryTechs}`;
        let drillQ;
        if (allTechs.some(t => ["pytorch", "tensorflow", "yolo", "opencv", "machine learning", "deep learning", "nlp", "rag"].includes(t))) {
            drillQ = `In developing ${focus}, how did you approach model accuracy versus inference latency trade-offs, and what specific validation pipeline or edge-case testing did you implement?`;
        } else if (allTechs.some(t => ["docker", "kubernetes", "fastapi", "microservices", "redis", "postgresql", "kafka", "distributed systems"].includes(t))) {
            drillQ = `When architecting ${focus}, how did you address high concurrency, database bottlenecks, and data consistency under unexpected load spikes or service disconnects?`;
        } else if (allTechs.some(t => ["fpga", "verilog", "dsp", "embedded c", "rtos", "radar", "sensors", "uav"].includes(t))) {
            drillQ = `Regarding ${focus}, what timing constraints, hardware memory limits, or sensor noise challenges did you encounter, and how did you verify deterministic real-time performance?`;
        } else {
            drillQ = `What was the most critical bug, edge-case failure, or performance bottleneck you uncovered while building ${focus}, and what systematic debugging methodology did you use to fix it?`;
        }

        return {
            question: drillQ,
            stage: "Technical Drill-down",
            category: "Engineering Challenges",
            feedback_on_previous: "Structured architectural overview provided with good technical context."
        };
    }

    // Question 4: DRDO Defence Systems
    if (questionIndex === 3) {
        const contextPhrase = primaryProject ? `your experience with "${primaryProject}"` : `your technical expertise in ${primaryTechs}`;
        return {
            question: `At DRDO, mission-critical systems operate under extreme conditions—including electromagnetic interference, zero-trust cybersecurity threats, and strict real-time deadlines. How would you adapt ${contextPhrase} to guarantee fail-safe operation, fault tolerance, and data integrity in an adversarial defense deployment?`,
            stage: "Defence Systems & Resilience",
            category: "Mission-Critical Systems",
            feedback_on_previous: "Demonstrates practical engineering troubleshooting and sound technical rationale."
        };
    }

    // Question 5 / Final Question: Techno-managerial
    if (questionIndex === 4 || questionIndex === totalQuestions - 1) {
        return {
            question: `Suppose two weeks prior to an important DRDO field trial, an unexpected performance regression or security vulnerability is uncovered in your module, while operational deadlines cannot be extended. As the technical lead, how would you triage the risk, coordinate with multi-disciplinary lab teams, and communicate with senior leadership?`,
            stage: "Techno-managerial",
            category: "Leadership & Risk Management",
            feedback_on_previous: "Candidate successfully aligned system reliability principles with defense standards."
        };
    }

    return {
        question: `Reflecting on your engineering approach in ${primaryProject || primaryTechs}, how do you establish automated testing, continuous verification, and documentation so that other DRDO scientists can maintain and scale your work over long lifecycle deployments?`,
        stage: "Lifecycle & Standards",
        category: "Engineering Quality",
        feedback_on_previous: "Thorough techno-managerial response reflecting maturity and team accountability."
    };
}

async function getNextInterviewQuestion(payload) {
    const engine = getAiEngineMode();
    const apiKey = getGeminiApiKey();
    payload.geminiApiKey = apiKey;

    // If Gemini mode is selected with an API key, we can try calling backend or direct
    try {
        const res = await fetch(`${API_BASE}/generate-question`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.question) return data;
        }
    } catch (e) {
        console.warn("Backend /generate-question not reachable, using local adaptive AI engine:", e);
    }

    // Fallback directly to client-side adaptive engine
    return clientGenerateAdaptiveQuestion(payload);
}

/* ================= VOICE SYNTHESIS (TEXT-TO-SPEECH) ================= */
let isSpeaking = false;

function speakText(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("David") || v.name.includes("Zira"))) || voices.find(v => v.lang.startsWith("en"));
    if (englishVoice) utterance.voice = englishVoice;

    const btn = document.getElementById("speakQuestionBtn");
    utterance.onstart = () => {
        isSpeaking = true;
        if (btn) btn.innerHTML = "⏹ Stop Audio";
    };
    utterance.onend = utterance.onerror = () => {
        isSpeaking = false;
        if (btn) btn.innerHTML = "🔊 Listen to Question";
    };
    window.speechSynthesis.speak(utterance);
}

function toggleSpeakQuestion() {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        const btn = document.getElementById("speakQuestionBtn");
        if (btn) btn.innerHTML = "🔊 Listen to Question";
    } else {
        const qText = document.getElementById("questionText")?.innerText || "";
        speakText(qText);
    }
}

/* ================= VOICE RECOGNITION (SPEECH-TO-TEXT) ================= */
let speechRecognizer = null;
let isSpeechRecognizing = false;

function toggleVoiceInput() {
    if (isSpeechRecognizing) {
        stopVoiceInput();
    } else {
        startVoiceInput();
    }
}

function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = document.getElementById("voiceToggleBtn");
    const indicator = document.getElementById("voiceStatusIndicator");
    const answerEl = document.getElementById("answer");

    if (SpeechRecognition) {
        try {
            speechRecognizer = new SpeechRecognition();
            speechRecognizer.continuous = true;
            speechRecognizer.interimResults = true;
            speechRecognizer.lang = "en-US";

            let baseText = answerEl.value ? answerEl.value.trim() + " " : "";

            speechRecognizer.onstart = () => {
                isSpeechRecognizing = true;
                if (btn) {
                    btn.innerHTML = "⏹ Stop Voice";
                    btn.classList.add("recording");
                }
                if (indicator) indicator.style.display = "flex";
            };

            speechRecognizer.onresult = (event) => {
                let interimTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    interimTranscript += event.results[i][0].transcript;
                }
                answerEl.value = baseText + interimTranscript;
            };

            speechRecognizer.onerror = (e) => {
                console.warn("Speech recognition error:", e);
                stopVoiceInput();
                portalMessage("Microphone input ended: " + (e.error || "Ready"), "info");
            };

            speechRecognizer.onend = () => {
                stopVoiceInput();
            };

            speechRecognizer.start();
            return;
        } catch (err) {
            console.warn("Web Speech API failed, falling back to audio recording", err);
        }
    }

    // Fallback to mediaRecorder
    startVoice();
}

function stopVoiceInput() {
    if (speechRecognizer) {
        try { speechRecognizer.stop(); } catch {}
        speechRecognizer = null;
    }
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        stopVoice();
    }
    isSpeechRecognizing = false;
    const btn = document.getElementById("voiceToggleBtn");
    const indicator = document.getElementById("voiceStatusIndicator");
    if (btn) {
        btn.innerHTML = "🎤 Answer by Voice";
        btn.classList.remove("recording");
    }
    if (indicator) indicator.style.display = "none";
}

/* ================= INTERVIEW ROOM DIALOGUE & PROGRESS ================= */
let activeCurrentQuestionObj = null;

function toggleDialogueDrawer() {
    const list = document.getElementById("dialogueList");
    const icon = document.getElementById("dialogueToggleIcon");
    if (!list) return;
    const isHidden = list.style.display === "none";
    list.style.display = isHidden ? "flex" : "none";
    if (icon) icon.innerText = isHidden ? "▲" : "▼";
}

function renderDialogueHistory(interview) {
    const list = document.getElementById("dialogueList");
    const countBadge = document.getElementById("answeredCountBadge");
    if (!list) return;
    const answers = interview?.answers || [];
    if (countBadge) countBadge.innerText = answers.length;

    if (!answers.length) {
        list.innerHTML = '<div style="color:#64748b;font-size:12px;text-align:center;padding:10px;">No answers submitted yet. Your conversation history will appear here.</div>';
        return;
    }

    list.innerHTML = answers.map((ans, idx) => {
        const ev = ans.evaluation || {};
        return `
            <div class="dialogue-item">
                <div class="dialogue-q">Q${idx + 1} (${ans.stage || "Technical"}): ${ans.question}</div>
                <div class="dialogue-a">" ${ans.answer} "</div>
                <div class="dialogue-feedback-row">
                    <span class="score-chip ${ev.overall >= 75 ? 'good' : ''}">Score: ${ev.overall || 70}%</span>
                    <span class="score-chip">Relevance: ${ev.relevance || 70}%</span>
                    <span class="score-chip">Tech Depth: ${ev.technical || 70}%</span>
                    <span style="font-size:11px;color:#64748b;margin-left:auto;">${ev.feedback || ""}</span>
                </div>
            </div>
        `;
    }).join("");
}

function updateProgressDisplay() {
    const totalQ = getInterviewQuestionCount();
    const qIndex = currentQuestionIndex;
    const stage = activeCurrentQuestionObj?.stage || "Technical";
    const label = document.getElementById("progressTextLabel");
    const numLabel = document.getElementById("questionNumLabel");
    const catTag = document.getElementById("questionCategoryTag");
    const stageBadge = document.getElementById("aiStageBadge");
    const bar = document.getElementById("progressBar");

    if (label) label.innerText = `Question ${qIndex + 1} of ${totalQ} • ${stage}`;
    if (numLabel) numLabel.innerText = `Question ${qIndex + 1} of ${totalQ}`;
    if (catTag) catTag.innerText = activeCurrentQuestionObj?.category || stage;
    if (stageBadge) stageBadge.innerText = `Stage: ${stage}`;
    if (bar) bar.style.width = `${Math.min(100, Math.round(((qIndex) / totalQ) * 100))}%`;
}

/* ================= OPEN & RUN INTERVIEW ================= */
async function openInterview(appId) {
    const apps = getApplications();
    const app = apps.find(a => a.id === appId) || apps.find(a => a.status === "Interview Scheduled");
    if (!app) return portalMessage("No scheduled interview is available.", "error");
    if (app.status === "Completed") return viewInterviewResult(app.id);

    const job = jobByTitle(app.position);
    activeInterviewId = app.id;
    const totalQ = getInterviewQuestionCount();

    // Update modal header
    const head = document.getElementById("interviewPositionHeading");
    const labSub = document.getElementById("interviewLabSubtext");
    if (head) head.innerText = `${app.position} Interview`;
    if (labSub) labSub.innerText = `DRDO Lab: ${job?.lab || "Defence Establishment"} • Location: ${job?.location || "India"}`;

    updateAiBadge();

    const interviews = getInterviews();
    let interview = interviews.find(i => i.id === app.id);
    if (!interview) {
        interview = {
            id: app.id,
            applicationId: app.id,
            position: app.position,
            positionId: app.positionId,
            candidateName: getProfile().name,
            startedAt: new Date().toISOString(),
            currentQuestion: 0,
            answers: [],
            questions: [],
            status: "Live",
            liveLastSeen: Date.now(),
            evaluation: null
        };
        interviews.push(interview);
    } else if (interview.status !== "Completed") {
        interview.status = "Live";
        interview.startedAt = interview.startedAt || new Date().toISOString();
        interview.liveLastSeen = Date.now();
    }
    writeJSON(INTERVIEW_KEY, interviews);

    currentQuestionIndex = interview.answers.length;
    renderDialogueHistory(interview);

    document.getElementById("interviewModal").style.display = "flex";

    // Load or generate question for current index
    await loadOrGenerateQuestion(interview, job);
}

async function loadOrGenerateQuestion(interview, job) {
    const totalQ = getInterviewQuestionCount();
    const pos = interview.position;
    const candidateName = interview.candidateName || getProfile().name;
    const jobSkills = job?.skills || [];
    const history = interview.answers || [];
    const lastAnswer = history.length ? history[history.length - 1].answer : "";

    const thinking = document.getElementById("aiThinkingIndicator");
    const thinkingText = document.getElementById("aiThinkingText");
    if (thinking && thinkingText) {
        thinkingText.innerText = currentQuestionIndex === 0 ? "AI Interviewer is preparing your opening question..." : "AI Interviewer is formulating an adaptive follow-up question...";
        thinking.style.display = "flex";
    }

    const qData = await getNextInterviewQuestion({
        position: pos,
        candidateName,
        questionIndex: currentQuestionIndex,
        totalQuestions: totalQ,
        history,
        lastAnswer,
        jobSkills
    });

    if (thinking) thinking.style.display = "none";

    activeCurrentQuestionObj = qData;
    const qEl = document.getElementById("questionText");
    if (qEl) qEl.innerText = qData.question;

    const answer = document.getElementById("answer");
    if (answer) answer.value = "";

    updateProgressDisplay();

    // Auto-read aloud if enabled
    const autoSpeak = document.getElementById("autoSpeakCheckbox")?.checked ?? isAutoSpeakEnabled();
    if (autoSpeak) {
        setTimeout(() => speakText(qData.question), 300);
    }
}

function closeInterview() {
    stopVoiceInput();
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
    }
    document.getElementById("interviewModal").style.display = "none";
}

async function submitAnswer() {
    const answerEl = document.getElementById("answer");
    const answer = (answerEl?.value || "").trim();
    if (!answer) return portalMessage("Please provide an answer before submitting.", "error");

    stopVoiceInput();
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
    }

    const interviews = getInterviews();
    const interview = interviews.find(i => i.id === activeInterviewId);
    if (!interview || !activeCurrentQuestionObj) return;

    const totalQ = getInterviewQuestionCount();
    const q = activeCurrentQuestionObj;

    const thinking = document.getElementById("aiThinkingIndicator");
    const thinkingText = document.getElementById("aiThinkingText");
    if (thinking && thinkingText) {
        thinkingText.innerText = "Evaluating response & analyzing technical depth...";
        thinking.style.display = "flex";
    }

    let evaluation;
    try {
        const r = await fetch(`${API_BASE}/evaluate-answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: q.question, answer, stage: q.stage })
        });
        evaluation = await r.json();
    } catch {
        // Local evaluation fallback
        const wordCount = (answer.match(/\b\w+\b/g) || []).length;
        const techMatch = DOMAIN_TECH_KEYWORDS.filter(k => answer.toLowerCase().includes(k)).length;
        const relevance = Math.min(100, Math.max(50, 60 + techMatch * 8 + Math.min(20, wordCount / 5)));
        const technical = Math.min(100, Math.max(50, 55 + techMatch * 10 + Math.min(25, wordCount / 4)));
        const communication = Math.min(100, Math.max(55, 60 + Math.min(30, wordCount / 3)));
        const confidence = Math.min(100, Math.max(60, 65 + (answer.length > 80 ? 15 : 0)));
        const completeness = Math.min(100, Math.max(50, 50 + Math.min(45, wordCount * 1.2)));
        const overall = Math.round(relevance * 0.25 + technical * 0.30 + confidence * 0.15 + communication * 0.15 + completeness * 0.15);
        evaluation = {
            overall,
            relevance: Math.round(relevance),
            technical: Math.round(technical),
            confidence: Math.round(confidence),
            communication: Math.round(communication),
            completeness: Math.round(completeness),
            feedback: overall >= 75 ? "Direct, relevant response with practical technical context." : "Good response; deeper technical specifics will strengthen this answer."
        };
    }

    interview.answers.push({
        questionId: `q-${Date.now()}`,
        question: q.question,
        stage: q.stage,
        category: q.category || q.stage,
        answer,
        evaluation,
        submittedAt: new Date().toISOString()
    });

    interview.currentQuestion = interview.answers.length;
    writeJSON(INTERVIEW_KEY, interviews);

    renderDialogueHistory(interview);

    if (interview.answers.length < totalQ) {
        currentQuestionIndex = interview.answers.length;
        const job = jobByTitle(interview.position);
        await loadOrGenerateQuestion(interview, job);
        portalMessage("Response evaluated. Next adaptive question generated.", "success");
    } else {
        if (thinking) thinking.style.display = "none";
        await finishInterview(interview);
    }
}

async function finishInterview(interview) {
    let evaluation;
    try {
        const r = await fetch(`${API_BASE}/evaluate-interview`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: interview.answers })
        });
        evaluation = await r.json();
    } catch {
        const vals = interview.answers.map(a => a.evaluation || {});
        const avg = k => Math.round(vals.reduce((s, x) => s + (x[k] || 0), 0) / Math.max(1, vals.length));
        evaluation = {
            overall: avg("overall"),
            technical: avg("technical"),
            confidence: avg("confidence"),
            communication: avg("communication"),
            relevance: avg("relevance"),
            completeness: avg("completeness"),
            feedback: "Interview completed. Evaluated locally using question-answer relevance, domain keywords, and engineering depth."
        };
    }

    interview.evaluation = evaluation;
    interview.status = "Completed";
    interview.completedAt = new Date().toISOString();

    const interviews = getInterviews().map(i => i.id === interview.id ? interview : i);
    writeJSON(INTERVIEW_KEY, interviews);

    const apps = getApplications().map(a => a.id === interview.applicationId ? { ...a, status: "Completed", statusClass: "approved", interviewResult: evaluation } : a);
    writeJSON(APPLICATION_KEY, apps);

    closeInterview();
    renderApplications();
    renderInterviews();
    portalMessage(`🎉 Interview Completed! Overall AI Evaluation: ${evaluation.overall}%. Details saved to your portal.`, "success");
    showSection("interviews");
}

/* Fallback audio recording when Web Speech API is unavailable */
async function startVoice() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return portalMessage("Audio recording is not supported by this browser. You can type your answer.", "error");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorder.ondataavailable = e => { if (e.data.size) audioChunks.push(e.data); };
        mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            const blob = new Blob(audioChunks, { type: "audio/webm" });
            const fd = new FormData();
            fd.append("file", blob, "answer.webm");
            portalMessage("Transcribing speech locally...");
            try {
                const r = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: fd });
                const d = await r.json();
                if (!r.ok) throw new Error(d.detail || "Transcription failed");
                document.getElementById("answer").value += (document.getElementById("answer").value ? " " : "") + d.text;
                portalMessage("Voice answer added to the answer box.", "success");
            } catch (e) {
                portalMessage(e.message, "error");
            }
        };
        mediaRecorder.start();
        portalMessage("Recording started. Click the voice button again to stop.");
        const btn = document.getElementById("voiceToggleBtn");
        if (btn) {
            btn.textContent = "⏹ Stop Voice";
            btn.classList.add("recording");
        }
    } catch (e) {
        portalMessage("Microphone permission was not granted.", "error");
    }
}

function stopVoice() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    const btn = document.getElementById("voiceToggleBtn");
    if (btn) {
        btn.textContent = "🎤 Answer by Voice";
        btn.classList.remove("recording");
    }
}

function viewInterviewResult(appId) {
    const app = getApplications().find(a => a.id === appId) || getApplications().find(a => a.status === "Completed");
    const result = app?.interviewResult;
    if (!result) return portalMessage("Interview evaluation is not available yet.");
    portalMessage(`AI Interview Score: ${result.overall}% • Technical: ${result.technical}% • Communication: ${result.communication}% • Relevance: ${result.relevance}%`, "success");
}

function loadProfile(){ const p=getProfile(); [["profileName",p.name],["profileEmail",p.email],["profilePhone",p.phone],["profileSkills",p.skills]].forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.value=v});const av=document.getElementById("profileAvatar");if(av)av.innerText=(p.name||"D").trim().charAt(0).toUpperCase();const r=document.getElementById("resumeFileName");if(r)r.innerText=p.resume||"No resume uploaded"; }
function saveProfile(){ const p={name:document.getElementById("profileName")?.value.trim()||"Candidate",email:document.getElementById("profileEmail")?.value.trim()||"candidate@example.com",phone:document.getElementById("profilePhone")?.value.trim()||"",skills:document.getElementById("profileSkills")?.value.trim()||"",resume:getProfile().resume||""};writeJSON(PROFILE_KEY,p);loadProfile();portalMessage("Profile updated successfully.","success"); }
function replaceResume(){ const input=document.getElementById("racResumeProfileInput")||document.body.appendChild(Object.assign(document.createElement("input"),{type:"file",accept:".pdf,application/pdf",id:"racResumeProfileInput"}));input.style.display="none";input.value="";input.onchange=async()=>{const f=input.files?.[0];if(!f)return;if(f.type!=="application/pdf"&&!f.name.toLowerCase().endsWith(".pdf"))return portalMessage("Please select a PDF resume.","error");try{await saveResumeToProfile(f);portalMessage("Resume saved to your profile.","success")}catch(e){portalMessage(e.message||"Could not save resume.","error")}};input.click(); }
function logout(){ localStorage.removeItem("hirelyRole"); window.location.href="index.html"; }
function searchCandidateJobs(){const s=document.getElementById("candidateSearch")?.value.toLowerCase().trim()||"",l=document.getElementById("candidateLocation")?.value||"all",m=document.getElementById("candidateMode")?.value||"all",g=document.getElementById("candidateGrade")?.value||"all";let c=0;document.querySelectorAll("#candidateJobsList .portal-job").forEach(j=>{const v=(j.dataset.title||"").includes(s)&&(l==="all"||j.dataset.location===l)&&(m==="all"||j.dataset.mode===m)&&(g==="all"||j.dataset.grade===g);j.style.display=v?"flex":"none";if(v)c++});const e=document.getElementById("candidateJobCount");if(e)e.innerText=c+" positions available";}
function renderCandidateJobs(){const list=document.getElementById("candidateJobsList");if(!list||typeof DRDO_POSITIONS==="undefined")return;const loc=document.getElementById("candidateLocation");if(loc&&loc.options.length<=1)DRDO_LOCATIONS.forEach(x=>loc.append(new Option(x,x)));list.innerHTML=DRDO_POSITIONS.map(pos=>{const grade=DRDO_GRADES.find(g=>g.grade===pos.grade);return `<div class="portal-job" data-title="${(pos.title+' '+pos.skills.join(' ')+' '+pos.lab).toLowerCase()}" data-grade="${pos.grade}" data-location="${pos.location}" data-mode="On-site"><div><span class="tag">DRDO • ${pos.grade}</span><h3>${pos.title}</h3><p>Defence Research & Development Organisation</p><p>📍 ${pos.location} · On-site</p><p class="skills">${pos.skills.join(' · ')}</p><small>${pos.lab} • ${grade?grade.experience:''}</small></div><div class="job-right"><span class="closing">${grade?grade.route:'DRDO Scientist Position'}</span><button onclick="applyJob('${pos.title.replace(/'/g,"\\'")}')" class="primary-btn">View & Apply</button></div></div>`}).join("");searchCandidateJobs();}

document.addEventListener("DOMContentLoaded",()=>{
    if(!localStorage.getItem(PROFILE_KEY)) writeJSON(PROFILE_KEY,{name:"Divya Pai",email:"candidate@example.com",phone:"+91 XXXXX XXXXX",skills:"JavaScript, Java, HTML, CSS",resume:"",resumeData:""});
    seedQuestionBank();
    renderCandidateJobs();
    loadProfile();
    renderApplications();
    renderInterviews();
});
window.addEventListener("storage",e=>{if([APPLICATION_KEY,INTERVIEW_KEY].includes(e.key)){renderApplications();renderInterviews();}});

/* ================= LOCAL LIVE EXPERT INTERVIEW BRIDGE ================= */
(function(){
const RAC_LIVE_EVENT_KEY = "racLiveInterviewEvent";
const RAC_AUDIO_MAX = 6 * 1024 * 1024;
let liveRecordingPromise = null;
let liveRecordingResolve = null;
let liveRecordingStream = null;
let liveRecordingChunks = [];

function racLiveEmit(type, interviewId, data={}) {
    localStorage.setItem(RAC_LIVE_EVENT_KEY, JSON.stringify({type, interviewId, at:Date.now(), ...data}));
}
function racGetInterview(id){ return getInterviews().find(i=>i.id===id); }
function racSaveInterview(interview){
    const list=getInterviews().map(i=>i.id===interview.id?interview:i);
    writeJSON(INTERVIEW_KEY,list);
}
function racEnsureLiveFields(interview){
    if(!interview) return;
    if(typeof interview.aiQuestionIndex !== "number") interview.aiQuestionIndex=(interview.answers||[]).filter(a=>a.source!=="expert"&&a.source!=="expert-replaced").length;
    if(!Array.isArray(interview.questions)) interview.questions=[];
    if(!interview.mode) interview.mode="ai";
    if(typeof interview.expertEndConfirmed!=="boolean") interview.expertEndConfirmed=false;
    if(typeof interview.candidateEndConfirmed!=="boolean") interview.candidateEndConfirmed=false;
}

function racTouchLiveInterview(){
    if(!activeInterviewId)return;
    const interview=racGetInterview(activeInterviewId);
    if(!interview||interview.status!=="Live")return;
    interview.liveLastSeen=Date.now();
    racSaveInterview(interview);
}
setInterval(racTouchLiveInterview,2000);
window.addEventListener("beforeunload",function(){
    if(!activeInterviewId)return;
    const interview=racGetInterview(activeInterviewId);
    if(!interview||interview.status!=="Live")return;
    interview.status="Scheduled";
    interview.liveLastSeen=0;
    racSaveInterview(interview);
});
function racPersistLiveDraft(value){
    if(!activeInterviewId) return;
    const interview=racGetInterview(activeInterviewId); if(!interview)return;
    racEnsureLiveFields(interview);
    interview.liveDraft={text:value||"",updatedAt:new Date().toISOString()};
    racSaveInterview(interview);
}
function racStartAudioCapture(){
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || liveRecordingPromise) return;
    liveRecordingPromise=new Promise(resolve=>{liveRecordingResolve=resolve;});
    navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
        liveRecordingStream=stream; liveRecordingChunks=[];
        let opts={}; try{if(MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))opts={mimeType:"audio/webm;codecs=opus"};}catch{}
        try{
            mediaRecorder=new MediaRecorder(stream,opts);
            mediaRecorder.ondataavailable=e=>{if(e.data?.size)liveRecordingChunks.push(e.data);};
            mediaRecorder.onstop=()=>{
                const blob=new Blob(liveRecordingChunks,{type:mediaRecorder.mimeType||"audio/webm"});
                const reader=new FileReader();
                reader.onloadend=()=>{
                    const dataUrl=reader.result||"";
                    liveRecordingStream?.getTracks().forEach(t=>t.stop()); liveRecordingStream=null;
                    const resolve=liveRecordingResolve; liveRecordingResolve=null; liveRecordingPromise=null;
                    if(dataUrl.length>RAC_AUDIO_MAX){resolve("");portalMessage("Voice recording was too large for localStorage; the text answer is still saved.","info");}
                    else resolve(dataUrl);
                }; reader.readAsDataURL(blob);
            };
            mediaRecorder.start();
        }catch{stream.getTracks().forEach(t=>t.stop());liveRecordingPromise=null;liveRecordingResolve=null;}
    }).catch(()=>{liveRecordingPromise=null;liveRecordingResolve=null;});
}
function racStopAudioCapture(){
    if(mediaRecorder&&mediaRecorder.state!=="inactive")mediaRecorder.stop();
    else if(liveRecordingResolve){const r=liveRecordingResolve;liveRecordingResolve=null;liveRecordingPromise=null;r("");}
    return liveRecordingPromise||Promise.resolve("");
}

const racBaseStartVoiceInput=startVoiceInput;
startVoiceInput=function(){racStartAudioCapture();return racBaseStartVoiceInput();};

const racBaseLoadOrGenerateQuestion=loadOrGenerateQuestion;
loadOrGenerateQuestion=async function(interview,job){
    racEnsureLiveFields(interview);
    if(interview.pendingExpertQuestion){
        currentQuestionIndex=interview.aiQuestionIndex||0;
        activeCurrentQuestionObj=interview.pendingExpertQuestion;
        const q=document.getElementById("questionText");if(q)q.innerText=activeCurrentQuestionObj.question;
        const a=document.getElementById("answer");if(a)a.value=interview.liveDraft?.text||"";
        updateProgressDisplay();
        if(isAutoSpeakEnabled())setTimeout(()=>speakText(activeCurrentQuestionObj.question),200);
        racLiveEmit("expert-question-shown",interview.id,{question:activeCurrentQuestionObj.question});
        return;
    }
    if(interview.mode==="expert"){
        activeCurrentQuestionObj=null;
        const q=document.getElementById("questionText");if(q)q.innerText="Waiting for the expert to send the next question...";
        const thinking=document.getElementById("aiThinkingIndicator");if(thinking)thinking.style.display="none";
        return;
    }
    const savedIndex=currentQuestionIndex; currentQuestionIndex=interview.aiQuestionIndex||0;
    await racBaseLoadOrGenerateQuestion(interview,job);
    currentQuestionIndex=interview.aiQuestionIndex||savedIndex;

    // The original generator updates activeCurrentQuestionObj and the Candidate UI,
    // but intentionally does not return qData. Persist that actual displayed
    // question so the Expert Live Monitor can see exactly the same question.
    const displayedQuestion=activeCurrentQuestionObj;
    if(displayedQuestion?.question){
        const latest=racGetInterview(interview.id);
        if(latest){
            racEnsureLiveFields(latest);
            const questionId=displayedQuestion.questionId||displayedQuestion.id||`ai-${Date.now()}`;
            const question={...displayedQuestion,id:questionId,questionId,source:displayedQuestion.source||"ai"};
            latest.currentQuestionObj=question;
            latest.mode="ai";
            latest.liveDraft={text:"",updatedAt:new Date().toISOString()};
            if(!latest.questions.some(q=>q.id===questionId)){
                latest.questions.push({id:questionId,question:question.question,stage:question.stage,category:question.category,source:question.source,answerId:null,askedAt:new Date().toISOString()});
            }
            racSaveInterview(latest);
        }
    }
    return displayedQuestion;
};

const racBaseOpenInterview=openInterview;
openInterview=async function(appId){
    await racBaseOpenInterview(appId);
    const interview=racGetInterview(activeInterviewId);
    if(interview){racEnsureLiveFields(interview);racSaveInterview(interview);if(interview.pendingExpertQuestion)await loadOrGenerateQuestion(interview,jobByTitle(interview.position));}
};

let racAnswerSubmissionInProgress = false;

const racBaseSubmitAnswer=submitAnswer;
submitAnswer=async function(){
    const answerEl=document.getElementById("answer");
    const answer=(answerEl?.value||"").trim();
    if(!answer)return portalMessage("Please provide an answer before submitting.","error");

    // Prevent double-clicks / duplicate submissions while the answer is being evaluated.
    if(racAnswerSubmissionInProgress)return;
    racAnswerSubmissionInProgress=true;
    const submitBtn=document.getElementById("submitAnswerBtn");
    if(submitBtn)submitBtn.disabled=true;
    let originalCountFn=null;

    try{
        const interview=racGetInterview(activeInterviewId);
        if(!interview||!activeCurrentQuestionObj)return;
        racEnsureLiveFields(interview);

        const q=activeCurrentQuestionObj;
        const isExpert=q.source==="expert"||q.source==="expert-replaced";
        const isReplacement=q.source==="expert-replaced";

        originalCountFn=getInterviewQuestionCount;
        if(isExpert)getInterviewQuestionCount=()=>originalCountFn()+1;

        const audioData=await racStopAudioCapture();
        interview.__pendingAudioData=audioData||"";
        interview.__pendingQuestionSource=q.source||"ai";

        // Advance the AI index BEFORE the original submit handler generates
        // the next question. Previously it was advanced afterwards, causing
        // Q1 to be generated again after Q1 was submitted.
        if(!isExpert){
            interview.aiQuestionIndex=(interview.aiQuestionIndex||0)+1;
        }else if(isReplacement){
            interview.aiQuestionIndex=(interview.aiQuestionIndex||0)+1;
        }

        racSaveInterview(interview);
        await racBaseSubmitAnswer();
        getInterviewQuestionCount=originalCountFn;

        const latest=racGetInterview(activeInterviewId);
        if(!latest)return;
        const last=latest.answers?.at(-1);
        if(!last)return;

        last.source=interview.__pendingQuestionSource||"ai";
        if(!last.id)last.id=`answer-${Date.now()}`;
        last.questionId=q.id||q.questionId||null;
        if(audioData)last.audioData=audioData;

        racEnsureLiveFields(latest);
        const linked=latest.questions.find(item=>item.id===last.questionId||item.question===last.question);
        if(linked)linked.answerId=last.id;

        delete latest.__pendingAudioData;
        delete latest.__pendingQuestionSource;
        latest.liveDraft={text:"",updatedAt:new Date().toISOString()};

        if(isExpert){
            latest.pendingExpertQuestion=null;
            latest.mode="ai";
            latest.expertAnswerSubmitted=true;
        }else{
            // aiQuestionIndex was already advanced before the base handler.
            latest.aiQuestionIndex=Math.max(latest.aiQuestionIndex||0, latest.answers.filter(a=>a.source!=="expert"&&a.source!=="expert-replaced").length);
        }

        racSaveInterview(latest);
        racLiveEmit("answer-submitted",latest.id,{answer:last});

        if(isExpert&&latest.status==="Live"){
            currentQuestionIndex=latest.aiQuestionIndex||0;
            setTimeout(()=>loadOrGenerateQuestion(latest,jobByTitle(latest.position)),100);
        }
    }finally{
        if(originalCountFn)getInterviewQuestionCount=originalCountFn;
        racAnswerSubmissionInProgress=false;
        if(submitBtn)submitBtn.disabled=false;
    }
};

window.addEventListener("storage",function(e){
    if(e.key!==INTERVIEW_KEY||!activeInterviewId)return;
    const interview=racGetInterview(activeInterviewId);if(!interview)return;racEnsureLiveFields(interview);
    if(interview.skipCurrent&&!interview.pendingExpertQuestion){
        interview.skipCurrent=false;interview.aiQuestionIndex=(interview.aiQuestionIndex||0)+1;racSaveInterview(interview);currentQuestionIndex=interview.aiQuestionIndex;loadOrGenerateQuestion(interview,jobByTitle(interview.position));return;
    }
    if(interview.mode==="expert"&&!interview.pendingExpertQuestion){loadOrGenerateQuestion(interview,jobByTitle(interview.position));return;}
    if(interview.mode==="ai"&&!interview.pendingExpertQuestion&&activeCurrentQuestionObj===null){loadOrGenerateQuestion(interview,jobByTitle(interview.position));return;}
    if(interview.pendingExpertQuestion&&activeCurrentQuestionObj?.question!==interview.pendingExpertQuestion.question){
        currentQuestionIndex=interview.aiQuestionIndex||0;activeCurrentQuestionObj=interview.pendingExpertQuestion;
        const q=document.getElementById("questionText");if(q)q.innerText=activeCurrentQuestionObj.question;
        const a=document.getElementById("answer");if(a)a.value="";updateProgressDisplay();
        if(isAutoSpeakEnabled())setTimeout(()=>speakText(activeCurrentQuestionObj.question),150);
    }
    if(interview.expertEndConfirmed&&!interview.candidateEndConfirmed){
        setTimeout(()=>{
            const ok=window.confirm("The expert has requested to end this interview. Confirm that you also want to end it?");
            const latest=racGetInterview(activeInterviewId);if(!latest)return;latest.candidateEndConfirmed=!!ok;racSaveInterview(latest);racLiveEmit("candidate-end-confirmed",latest.id,{confirmed:!!ok});
        },50);
    }
});
window.addEventListener("input",function(e){
    if(e.target?.id!=="answer"||!activeInterviewId)return;
    racPersistLiveDraft(e.target.value);racLiveEmit("answer-live",activeInterviewId,{text:e.target.value});
});

const racOriginalCloseInterview=closeInterview;
closeInterview=function(){
    if(activeInterviewId){
        const interview=racGetInterview(activeInterviewId);
        if(interview?.status==="Live"&&!interview.candidateEndConfirmed){
            const ok=window.confirm("End your interview session? The interview will finish only after the expert also confirms.");if(!ok)return;
            const latest=racGetInterview(activeInterviewId);latest.candidateEndConfirmed=true;racSaveInterview(latest);racLiveEmit("candidate-end-request",activeInterviewId,{confirmed:true});
        }
    }
    return racOriginalCloseInterview();
};
})();

/* Poll the answer box so SpeechRecognition interim text is visible to the expert too. */
(function(){
let lastLiveText="";
setInterval(()=>{
    if(!activeInterviewId)return;
    const modal=document.getElementById("interviewModal");
    if(!modal||modal.style.display==="none")return;
    const el=document.getElementById("answer");const text=el?.value||"";
    if(text!==lastLiveText){lastLiveText=text;racPersistLiveDraft(text);racLiveEmit("answer-live",activeInterviewId,{text});}
},350);
})();
