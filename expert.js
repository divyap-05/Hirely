
const RAC_APP_KEY = "racApplications";
const RAC_INT_KEY = "racInterviews";
const RAC_Q_KEY = "racQuestionBank";
function expertMessage(message,type="info"){let e=document.getElementById("expertStatusMessage");if(!e){e=document.createElement("div");e.id="expertStatusMessage";e.style.cssText="position:fixed;bottom:22px;right:22px;z-index:9999;padding:12px 16px;border-radius:10px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.12);border-left:4px solid #257044";document.body.appendChild(e);}e.textContent=message;e.style.borderLeftColor=type==="error"?"#b42318":"#257044";clearTimeout(window.__expertTimer);window.__expertTimer=setTimeout(()=>e.remove(),3500);}
function racRead(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}}
const defaultDemoCandidates = [
    { id: "divya", name: "Divya Pai", position: "Scientist ‘B’ – Computer Science & Engineering", company: "DRDO", skills: ["Computer Science", "AI/ML", "Cyber Security"], appStatus: "Shortlisted", interviewStatus: "AI Interview Completed", aiScore: 87, aiRec: "✓ Recommended", expertDecision: "Pending", appliedDate: "Sep 22, 2026", aiMetrics: { tech: 85, comm: 90, prob: 82, conf: 88 } },
    { id: "rahul", name: "Rahul Shah", position: "Scientist ‘B’ – Electronics & Communication Engineering", company: "DRDO", skills: ["Electronics", "Communication", "Radar"], appStatus: "Interview Scheduled", interviewStatus: "Scheduled (Today 12:30 PM)", aiScore: 92, aiRec: "✓ Highly Recommended", expertDecision: "Pending", appliedDate: "Sep 20, 2026", aiMetrics: { tech: 94, comm: 88, prob: 92, conf: 90 } },
    { id: "aarav", name: "Aarav Mehta", position: "Scientist ‘B’ – Mechanical Engineering", company: "DRDO", skills: ["Mechanical Systems", "CAD", "Vehicle Systems"], appStatus: "Under Review", interviewStatus: "Scheduled (Today 3:00 PM)", aiScore: 79, aiRec: "⚡ Review Needed", expertDecision: "Pending", appliedDate: "Sep 18, 2026", aiMetrics: { tech: 78, comm: 82, prob: 76, conf: 80 } },
    { id: "priya", name: "Priya Sharma", position: "Scientist ‘B’ – Aeronautical Engineering", company: "DRDO", skills: ["Aerodynamics", "UAVs", "Flight Systems"], appStatus: "Evaluation Ready", interviewStatus: "AI Interview Completed", aiScore: 94, aiRec: "✓ Highly Recommended", expertDecision: "Approved", appliedDate: "Sep 15, 2026", aiMetrics: { tech: 96, comm: 94, prob: 90, conf: 95 } },
    { id: "vikram", name: "Vikram Malhotra", position: "Scientist ‘B’ – Physics", company: "DRDO", skills: ["Physics", "Sensors", "Materials"], appStatus: "Under Review", interviewStatus: "Completed", aiScore: 82, aiRec: "✓ Recommended", expertDecision: "Pending", appliedDate: "Sep 10, 2026", aiMetrics: { tech: 84, comm: 78, prob: 83, conf: 81 } }
];

let candidatesData = [...defaultDemoCandidates];

function syncExpertCandidates(){
    const apps = racRead(RAC_APP_KEY, []);
    const ints = racRead(RAC_INT_KEY, []);
    if (!apps.length) {
        candidatesData = [...defaultDemoCandidates];
        return;
    }
    const dynamic = apps.map(a => {
        const i = ints.find(x => x.id === a.id);
        const ev = i?.evaluation || a.interviewResult || {};
        const p = (typeof DRDO_POSITIONS !== "undefined" ? DRDO_POSITIONS : []).find(x => x.id === a.positionId);
        return {
            id: a.id,
            name: a.candidateName || "Candidate",
            position: a.position,
            company: a.company || "DRDO",
            skills: p?.skills || ["Technical Specialist"],
            appStatus: a.status,
            interviewStatus: i?.status || a.status,
            aiScore: ev.overall || 0,
            aiRec: (ev.overall >= 80) ? "✓ Strong Match" : (ev.overall >= 65 ? "✓ Recommended" : "Review Needed"),
            expertDecision: a.expertDecision || "Pending",
            appliedDate: a.appliedOn || "",
            aiMetrics: { tech: ev.technical || 70, comm: ev.communication || 70, prob: ev.relevance || 70, conf: ev.confidence || 70 }
        };
    });
    const rest = defaultDemoCandidates.filter(c => !dynamic.some(d => d.id === c.id || d.name.toLowerCase() === c.name.toLowerCase()));
    candidatesData = [...dynamic, ...rest];
}

function persistExpertDecision(id, decision) {
    const apps = racRead(RAC_APP_KEY, []).map(a => a.id === id ? {
        ...a,
        expertDecision: decision,
        status: decision === "Approved" ? "Hired" : decision === "Rejected" ? "Rejected" : "Under Review",
        statusClass: decision === "Approved" ? "approved" : decision === "Rejected" ? "rejected" : "review"
    } : a);
    localStorage.setItem(RAC_APP_KEY, JSON.stringify(apps));
    window.dispatchEvent(new StorageEvent("storage", { key: RAC_APP_KEY, newValue: JSON.stringify(apps) }));
}

let questionsData = [
    { id: 1, text: "Explain the difference between REST and SOAP.", category: "Technical", difficulty: "Medium", starred: true },
    { id: 2, text: "Tell me about a difficult technical problem you solved.", category: "Behavioral", difficulty: "Medium", starred: false },
    { id: 3, text: "How would you optimize a slow loading website?", category: "Situational", difficulty: "Hard", starred: true },
    { id: 4, text: "Explain the concept of closures in JavaScript and a practical use case.", category: "Technical", difficulty: "Hard", starred: false },
    { id: 5, text: "How do you handle conflicting priorities during a fast-paced sprint?", category: "Communication", difficulty: "Easy", starred: false },
    { id: 6, text: "Describe your experience with microservices architecture and state management.", category: "Role Specific", difficulty: "Hard", starred: false }
];

questionsData = racRead(RAC_Q_KEY, questionsData);
questionsData = Object.values(questionsData).flat();


let scheduleData = [
    { id: "s1", candidateId: "divya", candidateName: "Divya Pai", position: "Scientist ‘B’ – Computer Science & Engineering", time: "10:00 AM", status: "🟢 Live Now" },
    { id: "s2", candidateId: "rahul", candidateName: "Rahul Shah", position: "Scientist ‘B’ – Electronics & Communication Engineering", time: "12:30 PM", status: "⏰ Upcoming" },
    { id: "s3", candidateId: "aarav", candidateName: "Aarav Mehta", position: "Scientist ‘B’ – Mechanical Engineering", time: "03:00 PM", status: "⏰ Scheduled" },
    { id: "s4", candidateId: "priya", candidateName: "Priya Sharma", position: "Scientist ‘B’ – Aeronautical Engineering", time: "04:30 PM", status: "⏰ Scheduled" }
];

let positionsData = DRDO_POSITIONS.map(function(pos, index) {
    return {
        id: pos.id,
        title: pos.title,
        grade: pos.grade,
        department: "DRDO • " + pos.lab,
        location: pos.location + " • On-site",
        applicants: 4 + (index % 17),
        interviews: 1 + (index % 6),
        benchmark: (76 + (index % 14)) + "% AI Score",
        skills: pos.skills
    };
});

let isInterviewPaused = false;
let currentSelectedCandidateId = "";
// ================= DOM LOAD INITIALIZATION =================

document.addEventListener("DOMContentLoaded", function() {
    renderRecentCandidatesTable();
    renderCandidates();
    renderPositions();
    renderQuestions();
    renderSchedule();
    updateStatsSummary();
});


// ================= SECTION NAVIGATION =================

function showSection(sectionId) {
    let pages = document.querySelectorAll(".page");
    pages.forEach(function(page) {
        page.classList.remove("active-page");
    });

    let targetPage = document.getElementById(sectionId);
    if (targetPage) {
        targetPage.classList.add("active-page");
    }

    let titles = {
        dashboard: { title: "Expert Dashboard", sub: "Welcome back, Expert 👋" },
        candidates: { title: "Candidate Management", sub: "Review AI scores & manage hiring approvals" },
        positions: { title: "Job Positions", sub: "Manage active recruitment listings & skill benchmarks" },
        interviews: { title: "Live AI Interview Monitoring", sub: "Real-time candidate evaluation studio" },
        evaluations: { title: "Candidate Evaluations", sub: "Combine AI analytics with Expert ratings" },
        questions: { title: "Question Bank", sub: "Manage candidate evaluation question categories" },
        schedule: { title: "Interview Schedule", sub: "Track live and upcoming candidate interviews" },
        profile: { title: "Expert Profile", sub: "Manage recruiter credentials & specialization" }
    };

    if (titles[sectionId]) {
        document.getElementById("pageTitle").innerText = titles[sectionId].title;
        document.getElementById("pageSubTitle").innerText = titles[sectionId].sub;
    }

    // Live Monitoring must always read the current LocalStorage state when opened.
    // Do not rely on a previously loaded selector/list or cached candidate data.
    if (sectionId === "interviews") {
        syncExpertCandidates();
        refreshLiveSelector();
        if (typeof updateDashboardLiveWidget === "function") updateDashboardLiveWidget();
    }

    let navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(function(btn) {
        btn.classList.remove("active");
    });

    let navMap = {
        dashboard: 0,
        candidates: 1,
        positions: 2,
        interviews: 3,
        evaluations: 4,
        questions: 5,
        schedule: 6,
        profile: 7
    };

    if (navMap[sectionId] !== undefined && navItems[navMap[sectionId]]) {
        navItems[navMap[sectionId]].classList.add("active");
    }
}


// ================= STATS SUMMARY UPDATE =================

function updateStatsSummary() {
    let total = candidatesData.length;
    let pending = candidatesData.filter(c => c.expertDecision === "Pending").length;
    let approved = candidatesData.filter(c => c.expertDecision === "Approved").length;

    document.getElementById("statCandidates").innerText = total;
    document.getElementById("statPending").innerText = pending;
    document.getElementById("statEvaluations").innerText = total - pending;
}


// ================= RECENT CANDIDATES TABLE =================

function renderRecentCandidatesTable() {
    let tbody = document.getElementById("recentCandidatesTbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    candidatesData.slice(0, 4).forEach(function(cand) {
        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${cand.name}</strong></td>
            <td>${cand.position}</td>
            <td><strong style="color: #257044;">${cand.aiScore}%</strong></td>
            <td><span class="status ${getStatusClass(cand.interviewStatus)}">${cand.interviewStatus}</span></td>
            <td><span class="status ${getDecisionClass(cand.expertDecision)}">${cand.expertDecision}</span></td>
            <td>
                <div class="action-cell-btns">
                    <button class="secondary-btn btn-sm" onclick="viewCandidateResume('${cand.id}')">Resume</button>
                    <button class="primary-btn btn-sm" onclick="showCandidateEval('${cand.id}')">Evaluate</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


// ================= CANDIDATE MANAGEMENT =================

function renderCandidates() {
    let grid = document.getElementById("candidatesGrid");
    if (!grid) return;

    let search = document.getElementById("candidateSearchInput") ? document.getElementById("candidateSearchInput").value.toLowerCase() : "";
    let posFilter = document.getElementById("candidatePositionFilter") ? document.getElementById("candidatePositionFilter").value : "all";
    let decFilter = document.getElementById("candidateDecisionFilter") ? document.getElementById("candidateDecisionFilter").value : "all";

    grid.innerHTML = "";

    let filtered = candidatesData.filter(function(cand) {
        let matchesSearch = cand.name.toLowerCase().includes(search) || cand.position.toLowerCase().includes(search) || cand.skills.some(s => s.toLowerCase().includes(search));
        let matchesPos = posFilter === "all" || cand.position === posFilter;
        let matchesDec = decFilter === "all" || cand.expertDecision === decFilter;
        return matchesSearch && matchesPos && matchesDec;
    });

    document.getElementById("candidateCountLabel").innerText = `Showing ${filtered.length} Candidates`;

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="glass-card" style="text-align: center; color: #777;">No candidates match the selected filters.</div>`;
        return;
    }

    filtered.forEach(function(cand) {
        let card = document.createElement("div");
        card.className = "candidate-card";

        let skillsHtml = cand.skills.map(s => `<span class="skill-tag">${s}</span>`).join(" ");
        let initials = cand.name.split(" ").map(n => n[0]).join("");

        card.innerHTML = `
            <div class="cand-left">
                <div class="cand-avatar">${initials}</div>
                <div class="cand-info">
                    <h3>${cand.name}</h3>
                    <p class="cand-position">${cand.position} • <em>${cand.company}</em></p>
                    <div class="cand-skills">${skillsHtml}</div>
                </div>
            </div>

            <div class="cand-middle">
                <div class="score-box">
                    <span class="score-val">${cand.aiScore}%</span>
                    <span class="score-lbl">AI Match</span>
                </div>
                <div>
                    <span class="status ${getDecisionClass(cand.expertDecision)}">Decision: ${cand.expertDecision}</span>
                    <p style="font-size: 11px; color: #666; margin-top: 4px;">Rec: ${cand.aiRec}</p>
                </div>
            </div>

            <div class="cand-actions">
                <div class="btn-group-row">
                    <button class="secondary-btn btn-sm" onclick="viewCandidateResume('${cand.id}')">📄 Resume</button>
                    <button class="secondary-btn btn-sm" onclick="showCandidateEval('${cand.id}')">📝 Review</button>
                </div>
                <div class="btn-group-row">
                    <button class="btn-approve" onclick="approveCandidate('${cand.id}')">✓ Approve</button>
                    <button class="btn-reject" onclick="rejectCandidate('${cand.id}')">✕ Reject</button>
                    <button class="btn-review" onclick="requestReviewCandidate('${cand.id}')">↻ Review</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterCandidates() {
    renderCandidates();
}

function approveCandidate(id) {
    let cand = candidatesData.find(c => c.id === id);
    if (!cand) return;

    if (true) {
        cand.expertDecision = "Approved"; persistExpertDecision(id,"Approved");
        expertMessage(`Candidate ${cand.name} has been approved by the expert.`);
        renderCandidates();
        renderRecentCandidatesTable();
        updateStatsSummary();
    }
}

function rejectCandidate(id) {
    let cand = candidatesData.find(c => c.id === id);
    if (!cand) return;

    if (true) {
        cand.expertDecision = "Rejected"; persistExpertDecision(id,"Rejected");
        expertMessage(`Candidate ${cand.name} has been rejected by the expert.`);
        renderCandidates();
        renderRecentCandidatesTable();
        updateStatsSummary();
    }
}

function requestReviewCandidate(id) {
    let cand = candidatesData.find(c => c.id === id);
    if (!cand) return;

    cand.expertDecision = "Review Requested"; persistExpertDecision(id,"Review Requested");
    expertMessage(`Another review has been requested for ${cand.name}.`);
    renderCandidates();
    renderRecentCandidatesTable();
    updateStatsSummary();
}

function showCandidateEval(id) {
    let select = document.getElementById("evalCandidateSelect");
    if (select) {
        select.value = id;
    }
    showSection("evaluations");
    loadCandidateEvaluation();
}


// ================= LIVE AI INTERVIEW MONITORING STUDIO =================

function changeLiveCandidate() {
    let select = document.getElementById("liveCandidateSelect");
    if (!select) return;

    let val = select.value;
    let cand = candidatesData.find(c => c.id === val);
    if (cand) {
        document.getElementById("liveCandidateName").innerText = cand.name;
        document.getElementById("liveCandidatePos").innerText = `${cand.position} • ${cand.company}`;
        document.getElementById("liveCandidateInitials").innerText = cand.name.split(" ").map(n => n[0]).join("");
        document.getElementById("liveCandidateLabel").innerText = `${cand.name} (Candidate)`;
    }
}

function togglePauseInterview() {
    let badge = document.getElementById("liveStatusBadge");
    let btn = document.getElementById("pauseBtn");

    if (isInterviewPaused) {
        isInterviewPaused = false;
        badge.innerText = "🟢 LIVE";
        badge.style.background = "#257044";
        btn.innerText = "⏸ Pause Interview";
        document.getElementById("typingStatus").innerText = "● Transcribing speech...";
    } else {
        isInterviewPaused = true;
        badge.innerText = "⏸ PAUSED";
        badge.style.background = "#d97706";
        btn.innerText = "▶ Resume Interview";
        document.getElementById("typingStatus").innerText = "⏸ Interview Paused by Expert";
    }
}

function skipQuestion() {
    expertMessage("Live interview controls are initializing. Please select an active live interview.","info");
}

function openAskQuestionModal() {
    document.getElementById("askQuestionModal").style.display = "flex";
}

function closeAskQuestionModal() {
    document.getElementById("askQuestionModal").style.display = "none";
}

function sendExpertQuestion(event) {
    event.preventDefault();
    let qInput = document.getElementById("expertQuestionInput");
    let questionText = qInput.value.trim();

    if (!questionText) return;

    let logList = document.getElementById("injectedQuestionsList");
    let emptyLog = logList.querySelector(".empty-log");
    if (emptyLog) emptyLog.remove();

    let timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let logItem = document.createElement("div");
    logItem.className = "log-item";
    logItem.innerHTML = `
        <strong>Expert Injected Question (${timeStr}):</strong>
        <p>"${questionText}"</p>
        <span class="typing-indicator">Status: Question sent to candidate. Awaiting answer...</span>
    `;
    logList.prepend(logItem);

    closeAskQuestionModal();
    qInput.value = "";

    expertMessage("Question sent to the candidate.","success");

    // SIMULATE CANDIDATE ANSWER TO EXPERT QUESTION AFTER 2 SECONDS
    setTimeout(function() {
        logItem.querySelector(".typing-indicator").innerHTML = `<span style="color: #257044; font-weight: bold;">✓ Candidate Answer Received:</span> "I faced a situation where an unexpected async state race condition was occurring in production. I solved it by implementing proper cleanup callbacks and debouncing."`;
    }, 2000);
}

function openAddNoteModal() {
    document.getElementById("addNoteModal").style.display = "flex";
}

function closeAddNoteModal() {
    document.getElementById("addNoteModal").style.display = "none";
}

function saveInterviewNote(event) {
    event.preventDefault();
    let noteInput = document.getElementById("expertNoteInput");
    let text = noteInput.value.trim();

    if (!text) return;

    let logList = document.getElementById("injectedQuestionsList");
    let emptyLog = logList.querySelector(".empty-log");
    if (emptyLog) emptyLog.remove();

    let timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let logItem = document.createElement("div");
    logItem.className = "log-item";
    logItem.style.borderLeftColor = "#d97706";
    logItem.innerHTML = `
        <strong style="color: #d97706;">📝 Private Recruiter Note (${timeStr}):</strong>
        <p>${text}</p>
    `;
    logList.prepend(logItem);

    closeAddNoteModal();
    noteInput.value = "";
    expertMessage("Private recruiter note saved.","success");
}

function flagResponse() {
    expertMessage("Response flagged for secondary review.","success");
}

function endInterview() {
    if (true) {
        expertMessage("Interview session completed and saved to evaluations.","success");
        showSection("evaluations");
    }
}


// ================= EVALUATIONS =================

function loadCandidateEvaluation() {
    let select = document.getElementById("evalCandidateSelect");
    if (!select) return;

    let candId = select.value;
    let cand = candidatesData.find(c => c.id === candId);
    if (!cand) return;

    document.getElementById("evalAiScore").innerText = `${cand.aiScore}%`;
    document.getElementById("evalAiRec").innerText = cand.aiRec;

    document.getElementById("evalAiTech").innerText = `${cand.aiMetrics.tech}%`;
    document.getElementById("evalAiTechBar").style.width = `${cand.aiMetrics.tech}%`;

    document.getElementById("evalAiComm").innerText = `${cand.aiMetrics.comm}%`;
    document.getElementById("evalAiCommBar").style.width = `${cand.aiMetrics.comm}%`;

    document.getElementById("evalAiProb").innerText = `${cand.aiMetrics.prob}%`;
    document.getElementById("evalAiProbBar").style.width = `${cand.aiMetrics.prob}%`;

    document.getElementById("evalAiConf").innerText = `${cand.aiMetrics.conf}%`;
    document.getElementById("evalAiConfBar").style.width = `${cand.aiMetrics.conf}%`;

    document.getElementById("combAiRec").innerText = `${cand.aiRec} (${cand.aiScore}%)`;

    let statusEl = document.getElementById("combExpertStatus");
    statusEl.innerText = cand.expertDecision;
    statusEl.className = `status ${getDecisionClass(cand.expertDecision)}`;
}

function updateSliderVal(sliderId, labelId) {
    let val = document.getElementById(sliderId).value;
    document.getElementById(labelId).innerText = `${val}%`;
}

function setCandidateDecision(decision) {
    let select = document.getElementById("evalCandidateSelect");
    let candId = select ? select.value : "divya";

    let cand = candidatesData.find(c => c.id === candId);
    if (cand) {
        cand.expertDecision = decision; persistExpertDecision(cand.id,decision);
        expertMessage(`Expert decision updated to "${decision}" for ${cand.name}.`,"success");
        loadCandidateEvaluation();
        renderCandidates();
        renderRecentCandidatesTable();
        updateStatsSummary();
    }
}

function submitExpertEvaluation(event) {
    event.preventDefault();
    expertMessage("Expert evaluation form saved successfully!","success");
}


// ================= QUESTION BANK =================

function renderQuestions(catFilter = "All") {
    let list = document.getElementById("questionsList");
    if (!list) return;

    list.innerHTML = "";

    let filtered = questionsData.filter(q => catFilter === "All" || q.category === catFilter);

    filtered.forEach(function(q) {
        let item = document.createElement("div");
        item.className = "question-item-card";

        let starIcon = q.starred ? "⭐" : "☆";

        item.innerHTML = `
            <div class="q-details">
                <h4>"${q.text}"</h4>
                <div class="q-tags">
                    <span class="q-cat-tag">${q.category}</span>
                    <span class="q-diff-tag ${q.difficulty}">${q.difficulty}</span>
                </div>
            </div>
            <div class="q-actions">
                <button class="secondary-btn btn-sm" onclick="toggleStarQuestion(${q.id})">${starIcon}</button>
                <button class="secondary-btn btn-sm" onclick="editQuestion(${q.id})">✏ Edit</button>
                <button class="secondary-btn btn-sm" style="color: #b92b2b;" onclick="deleteQuestion(${q.id})">🗑 Delete</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function filterQuestions(cat) {
    let tabs = document.querySelectorAll(".cat-tab");
    tabs.forEach(t => t.classList.remove("active"));
    event.target.classList.add("active");
    renderQuestions(cat);
}

function openAddQuestionModal() {
    document.getElementById("addQuestionModal").style.display = "flex";
}

function closeAddQuestionModal() {
    document.getElementById("addQuestionModal").style.display = "none";
}

function saveNewQuestion(event) {
    event.preventDefault();
    let cat = document.getElementById("newQCat").value;
    let text = document.getElementById("newQText").value.trim();
    let diff = document.getElementById("newQDiff").value;

    if (!text) return;

    let newQ = {
        id: Date.now(),
        text: text,
        category: cat,
        difficulty: diff,
        starred: false
    };

    questionsData.push(newQ);
    localStorage.setItem(RAC_Q_KEY, JSON.stringify(groupQuestionsForStorage(questionsData)));
    closeAddQuestionModal();
    document.getElementById("newQText").value = "";
    expertMessage("New question added to Question Bank!","success");
    renderQuestions();
}

function toggleStarQuestion(id) {
    let q = questionsData.find(item => item.id === id);
    if (q) {
        q.starred = !q.starred;
        renderQuestions();
    }
}

function editQuestion(id) {
    let q = questionsData.find(item => item.id === id);
    if (!q) return;

    let updated = window.getSelection ? q.text : q.text; const next = window.prompt ? null : null; expertMessage("Inline question editing is available through the Question Bank form.");
}

function deleteQuestion(id) {
    if (true) {
        questionsData = questionsData.filter(item => item.id !== id);
        renderQuestions();
    }
}


// ================= SCHEDULE =================

function renderSchedule() {
    let container = document.getElementById("scheduleFullList");
    if (!container) return;

    container.innerHTML = "";

    scheduleData.forEach(function(item) {
        let card = document.createElement("div");
        card.className = "sched-card";

        card.innerHTML = `
            <div class="sched-time">${item.time}</div>
            <div class="sched-info">
                <h4>${item.candidateName}</h4>
                <p>${item.position} • Status: <span class="status ${getStatusClass(item.status)}">${item.status}</span></p>
            </div>
            <div class="sched-actions">
                <button class="primary-btn btn-sm" onclick="showSection('interviews')">View Interview</button>
                <button class="secondary-btn btn-sm" onclick="openRescheduleModal('${item.candidateName}')">Reschedule</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function openRescheduleModal(name) {
    document.getElementById("rescheduleCandidateName").innerText = `Candidate: ${name}`;
    document.getElementById("rescheduleModal").style.display = "flex";
}

function closeRescheduleModal() {
    document.getElementById("rescheduleModal").style.display = "none";
}

function saveReschedule(event) {
    event.preventDefault();
    let date = document.getElementById("rescheduleDate").value;
    let time = document.getElementById("rescheduleTime").value;

    expertMessage(`Interview rescheduled to ${date} at ${time}.` ,"success");
    closeRescheduleModal();
}


// ================= JOB POSITIONS =================

function renderPositions() {
    let grid = document.getElementById("positionsGrid");
    if (!grid) return;

    grid.innerHTML = "";

    positionsData.forEach(function(pos) {
        let card = document.createElement("div");
        card.className = "position-card";

        let skillsHtml = pos.skills.map(s => `<span class="skill-tag">${s}</span>`).join(" ");

        card.innerHTML = `
            <span class="tag">DRDO • ${pos.grade || "Scientist Position"}</span>
            <h3>${pos.title}</h3>
            <p class="pos-meta">${pos.department} • 📍 ${pos.location}</p>
            <div class="cand-skills" style="margin-bottom: 12px;">${skillsHtml}</div>
            <div class="pos-stats">
                <span>👥 ${pos.applicants} Applicants</span>
                <span>🎤 ${pos.interviews} Interviews</span>
                <span>⚡ ${pos.benchmark}</span>
            </div>
            <button class="secondary-btn btn-full" onclick="showSection('candidates')">View Candidates (${pos.applicants})</button>
        `;
        grid.appendChild(card);
    });
}

function openPostJobModal() {
    document.getElementById("postJobModal").style.display = "flex";
}

function closePostJobModal() {
    document.getElementById("postJobModal").style.display = "none";
}

function saveNewJobPosition(event) {
    event.preventDefault();
    let title = document.getElementById("jobPosTitle").value.trim();
    let dept = document.getElementById("jobPosDept").value.trim();
    let loc = document.getElementById("jobPosLoc").value.trim();
    let skillsRaw = document.getElementById("jobPosSkills").value.trim();

    if (!title) return;

    let skills = skillsRaw.split(",").map(s => s.trim()).filter(Boolean);

    let newPos = {
        id: "p" + Date.now(),
        title: title,
        department: dept,
        location: loc,
        applicants: 0,
        interviews: 0,
        benchmark: "85% AI Score",
        grade: "Scientist ‘B’",
        skills: skills.length ? skills : ["JavaScript"]
    };

    positionsData.unshift(newPos);
    closePostJobModal();
    expertMessage(`New Job Position "${title}" created successfully!`,"success");
    renderPositions();
}


// ================= EXPERT PROFILE =================

function saveExpertProfile(event) {
    event.preventDefault();
    let name = document.getElementById("profName").value.trim();
    let spec = document.getElementById("profSpec").value.trim();

    let initials = name.split(" ").map(n => n[0]).join("");

    document.getElementById("topExpertName").innerText = name;
    document.getElementById("topAvatar").innerText = initials;
    document.getElementById("profileBigAvatar").innerText = initials;
    document.getElementById("profileDisplayName").innerText = name;
    document.getElementById("profileDisplayTitle").innerText = spec;

    expertMessage("Profile updated successfully.","success");
}


// ================= NOTIFICATIONS & UTILITIES =================

function toggleNotifications() {
    let dd = document.getElementById("notifDropdown");
    if (dd) {
        dd.classList.toggle("show");
    }
}

function clearNotifs() {
    let badge = document.getElementById("notifBadge");
    if (badge) badge.style.display = "none";

    let unreads = document.querySelectorAll(".notif-item.unread");
    unreads.forEach(u => u.classList.remove("unread"));
}

function logout() {
    if (true) {
        window.location.href = "index.html";
    }
}

function getStatusClass(status) {
    if (!status) return "pending";
    let s = status.toLowerCase();
    if (s.includes("live") || s.includes("completed") || s.includes("shortlisted")) return "approved";
    if (s.includes("scheduled") || s.includes("upcoming")) return "upcoming";
    if (s.includes("rejected")) return "rejected";
    return "pending";
}

function getDecisionClass(decision) {
    if (!decision) return "pending";
    if (decision === "Approved") return "approved";
    if (decision === "Rejected") return "rejected";
    if (decision === "Review Requested") return "review";
    return "pending";
}

// Close modals when clicking outside modal box
window.addEventListener("click", function(event) {
    let modals = document.querySelectorAll(".modal");
    modals.forEach(function(modal) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    let notifWrap = document.querySelector(".notification-wrapper");
    let notifDd = document.getElementById("notifDropdown");
    if (notifDd && notifWrap && !notifWrap.contains(event.target)) {
        notifDd.classList.remove("show");
    }
});


function getLiveInterviews(){
    // Live Monitoring is driven ONLY by the real interview records written by candidate.js.
    // Never use demo/static candidate data here.
    const ints=racRead(RAC_INT_KEY,[]);
    const now=Date.now();
    return (Array.isArray(ints)?ints:[]).filter(i=>{
        if(!i || i.status!=="Live") return false;
        const seen=Number(i.liveLastSeen||0);
        // Candidate heartbeat is written every 2s. Allow a generous window so a
        // temporary browser/storage delay does not make a genuinely live interview disappear.
        return seen>0 && (now-seen)<=20000;
    });
}
function updateDashboardLiveWidget(){
    const live=getLiveInterviews();
    const pill=document.querySelector(".live-widget .live-pill");
    const avatar=document.querySelector(".live-widget .candidate-avatar");
    const name=document.querySelector(".live-widget .live-dashboard-candidate-name");
    const detail=document.querySelector(".live-widget .live-dashboard-candidate-detail");
    const question=document.querySelector(".live-widget .live-dashboard-question");
    const metrics=document.querySelector(".live-widget .live-dashboard-metrics");
    if(!pill||!avatar||!name||!detail||!question||!metrics)return;
    if(!live.length){
        pill.textContent="⚪ NO LIVE INTERVIEW";
        avatar.textContent="—";
        name.textContent="No interviews live";
        detail.textContent="Waiting for a live interview";
        question.textContent="No live interview is currently active.";
        metrics.innerHTML="";
        return;
    }
    const i=live[0];
    const initials=(i.candidateName||"Candidate").split(" ").filter(Boolean).map(n=>n[0]).join("").slice(0,3)||"C";
    const current=i.currentQuestionObj||i.pendingExpertQuestion||i.questions?.[i.questions.length-1]||{};
    const ev=i.evaluation||{};
    pill.textContent="🟢 LIVE NOW";
    avatar.textContent=initials;
    name.textContent=i.candidateName||"Candidate";
    detail.innerHTML=`Applied for <strong>${i.position||"Interview"}</strong>`;
    question.textContent=current.question||i.currentQuestion||"Waiting for the current question...";
    metrics.innerHTML=`<span class="metric-tag">Technical: ${Number(ev.technical||0)}%</span><span class="metric-tag">Confidence: ${Number(ev.confidence||0)}%</span><span class="metric-tag">Communication: ${Number(ev.communication||0)}%</span>`;
}
function refreshLiveSelector(){
    updateDashboardLiveWidget();
    const sel=document.getElementById("liveCandidateSelect");
    if(!sel)return;
    const old=sel.value;
    const live=getLiveInterviews();
    if(!live.length){
        sel.innerHTML='<option value="">No interviews live</option>';
        sel.value="";
        changeLiveCandidate();
        return;
    }
    sel.innerHTML=live.map(i=>`<option value="${i.id}">${i.candidateName||"Candidate"} — ${i.position||"Interview"} (🟢 Live Now)</option>`).join("");
    if(live.some(i=>i.id===old))sel.value=old;
    else sel.value=live[0].id;
    changeLiveCandidate();
}
function syncExpertSchedule(){if(!Array.isArray(candidatesData))return;scheduleData=candidatesData.filter(c=>c.interviewStatus).map(c=>({id:c.id,candidateId:c.id,candidateName:c.name,position:c.position,time:"Scheduled",status:c.interviewStatus}));}
const racOriginalChangeLiveCandidate=changeLiveCandidate;
changeLiveCandidate=function(){
    // Do not call the legacy renderer here: it can fall back to static/demo candidates.
    const id=document.getElementById("liveCandidateSelect")?.value;
    const interview=id?((typeof window.racExpertGet === "function") ? window.racExpertGet(id) : racRead(RAC_INT_KEY,[]).find(i=>i.id===id)):null;
    if(!interview || interview.status!=="Live"){
        const q=document.getElementById("currentQuestionText");
        const ans=document.getElementById("liveAnswerText");
        const cat=document.getElementById("questionCat");
        const num=document.getElementById("questionNum");
        const feedback=document.getElementById("aiRealtimeFeedback");
        if(q) q.innerText='"No interviews live"';
        if(ans) ans.innerText='"Waiting for a live interview..."';
        if(cat) cat.innerText="Live Monitoring";
        if(num) num.innerText="0";
        if(feedback) feedback.innerText="No interviews live.";
        const badge=document.getElementById("liveStatusBadge");
        if(badge) badge.innerText="NO LIVE INTERVIEW";
        const nameEl=document.getElementById("liveCandidateName");
        const posEl=document.getElementById("liveCandidatePos");
        const initialsEl=document.getElementById("liveCandidateInitials");
        const labelEl=document.getElementById("liveCandidateLabel");
        if(nameEl)nameEl.innerText="No interviews live";
        if(posEl)posEl.innerText="Waiting for a live interview";
        if(initialsEl)initialsEl.innerText="—";
        if(labelEl)labelEl.innerText="No interviews live";
        if(typeof window.racRenderInterviewLog === "function") window.racRenderInterviewLog({answers:[],questions:[],status:"No interviews live"});
        return;
    }
    const name=interview.candidateName||"Candidate";
    const position=interview.position||"Interview";
    const company=interview.company||"DRDO";
    const initials=name.split(" ").filter(Boolean).map(n=>n[0]).join("").slice(0,3)||"C";
    const nameEl=document.getElementById("liveCandidateName");
    const posEl=document.getElementById("liveCandidatePos");
    const initialsEl=document.getElementById("liveCandidateInitials");
    const labelEl=document.getElementById("liveCandidateLabel");
    if(nameEl)nameEl.innerText=name;
    if(posEl)posEl.innerText=`${position} • ${company}`;
    if(initialsEl)initialsEl.innerText=initials;
    if(labelEl)labelEl.innerText=`${name} (Candidate)`;
    const badge=document.getElementById("liveStatusBadge");
    if(badge) badge.innerText="🟢 LIVE";
    if(typeof window.racRenderCurrent === "function") window.racRenderCurrent(interview);
};

document.addEventListener("DOMContentLoaded",function(){
    syncExpertCandidates();
    syncExpertSchedule();
    refreshLiveSelector();
    updateDashboardLiveWidget();
    if (typeof seedQuestionBank === "function") seedQuestionBank();
    if (typeof renderCandidates === "function") renderCandidates();
    if (typeof renderRecentCandidatesTable === "function") renderRecentCandidatesTable();
    if (typeof updateStatsSummary === "function") updateStatsSummary();
    if (typeof renderSchedule === "function") renderSchedule();
});
window.addEventListener("storage",function(e){
    if(e.key===RAC_APP_KEY || e.key===RAC_INT_KEY){ syncExpertCandidates(); syncExpertSchedule(); refreshLiveSelector(); if(typeof renderCandidates==="function")renderCandidates(); if(typeof renderRecentCandidatesTable==="function")renderRecentCandidatesTable(); if(typeof updateStatsSummary==="function")updateStatsSummary(); if(typeof changeLiveCandidate==="function")changeLiveCandidate(); updateDashboardLiveWidget(); }
});
function groupQuestionsForStorage(list){const grouped={};list.forEach(q=>{const key=q.jobId||"general";(grouped[key]||(grouped[key]=[])).push(q)});return grouped;}
function seedQuestionBank(){let bank=racRead(RAC_Q_KEY,{});if(Object.keys(bank).length)return bank;if(typeof DRDO_POSITIONS==="undefined")return bank;DRDO_POSITIONS.forEach(j=>{const s=j.skills||[];bank[j.id]=[{id:j.id+"-i1",text:"Please introduce yourself and briefly describe your most relevant experience.",category:"Ice-breaking",stage:"Ice-breaking",difficulty:"Easy",starred:false},{id:j.id+"-i2",text:"Why are you interested in this role and this technical area?",category:"Ice-breaking",stage:"Ice-breaking",difficulty:"Easy",starred:false},{id:j.id+"-t1",text:`Explain the core concepts of ${s[0]||"your specialization"} and where you have applied them.`,category:"Technical",stage:"Technical",difficulty:"Medium",starred:false},{id:j.id+"-t2",text:`Describe a problem you solved involving ${s[1]||s[0]||"your field"}.`,category:"Technical",stage:"Technical",difficulty:"Medium",starred:false},{id:j.id+"-t3",text:`How would you troubleshoot a failed system involving ${s[2]||s[0]||"your specialization"}?`,category:"Technical",stage:"Technical",difficulty:"Hard",starred:false},{id:j.id+"-m1",text:"How would you balance technical quality, risk and delivery while leading a team under a strict deadline?",category:"Techno-managerial",stage:"Techno-managerial",difficulty:"Hard",starred:false}];});localStorage.setItem(RAC_Q_KEY,JSON.stringify(bank));return bank;}

/* ================= LOCAL EXPERT LIVE CONTROL BRIDGE ================= */
(function(){
const LIVE_KEY="racLiveInterviewEvent";
const END_KEY="racInterviewEnd";
function racExpertRead(){try{return JSON.parse(localStorage.getItem(RAC_INT_KEY)||"[]")}catch{return []}}
function racExpertSave(list){localStorage.setItem(RAC_INT_KEY,JSON.stringify(list));window.dispatchEvent(new StorageEvent("storage",{key:RAC_INT_KEY,newValue:JSON.stringify(list)}));}
function racExpertGet(id){return racExpertRead().find(i=>i.id===id);}
function racExpertUpdate(id,fn){const list=racExpertRead();const i=list.find(x=>x.id===id);if(!i)return null;fn(i);racExpertSave(list);return i;}
function racEsc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function racRenderInterviewLog(interview){
    const list=document.getElementById("injectedQuestionsList");if(!list||!interview)return;
    const questions=Array.isArray(interview.questions)?interview.questions:[];
    const answers=Array.isArray(interview.answers)?interview.answers:[];
    const answerById=new Map(answers.filter(a=>a?.id).map(a=>[a.id,a]));
    const answerByQuestion=new Map(answers.filter(a=>a?.questionId).map(a=>[a.questionId,a]));
    const pending=interview.pendingExpertQuestion||null;
    const currentFromQuestions=[...questions].reverse().find(q=>{
        if(!q)return false;
        const answer=q.answerId?answerById.get(q.answerId):answerByQuestion.get(q.id);
        return !answer;
    })||null;
    const current=pending||currentFromQuestions;
    let html="";

    if(current){
        const currentType=current.source==="expert"||current.source==="expert-replaced"?"Expert":"AI";
        html+=`<div class="log-item" style="border-left-color:#2563eb"><strong>🔵 Current ${currentType} Question:</strong><p>"${racEsc(current.question)}"</p><span class="typing-indicator">Waiting for candidate answer...</span></div>`;
    }

    if(interview.liveDraft?.text){
        html+=`<div class="log-item"><strong>🎙️ Live Candidate Response:</strong><p>${racEsc(interview.liveDraft.text)}</p><span class="typing-indicator">● Receiving live answer...</span></div>`;
    }

    let historyIndex=0;
    questions.forEach((q)=>{
        if(!q)return;
        const answer=q.answerId?answerById.get(q.answerId):answerByQuestion.get(q.id);
        if(!answer)return;
        const type=q.source==="expert"||q.source==="expert-replaced"?"Expert":"AI";
        historyIndex++;
        html+=`<div class="log-item"><strong>${type} Q${historyIndex}:</strong><p>"${racEsc(q.question)}"</p><div><strong>Candidate Answer:</strong> ${racEsc(answer.answer||"—")}</div><div style="margin-top:6px;font-size:11px;color:#64748b">Linked question ID: ${racEsc(q.id||"—")}</div></div>`;
    });

    if(!questions.length&&answers.length){
        answers.forEach((a,idx)=>{
            const type=a.source==="expert"||a.source==="expert-replaced"?"Expert":"AI";
            html+=`<div class="log-item"><strong>${type} Q${idx+1}:</strong><p>"${racEsc(a.question)}"</p><div><strong>Candidate Answer:</strong> ${racEsc(a.answer||"—")}</div></div>`;
        });
    }

    if(!html)html='<div class="log-item empty-log">No live interview activity yet.</div>';
    list.innerHTML=html;
}
function racRenderScores(interview){const ev=interview?.evaluation||{};const vals=(interview?.answers||[]).map(a=>a.evaluation||{});const avg=k=>vals.length?Math.round(vals.reduce((s,x)=>s+(Number(x[k])||0),0)/vals.length):0;const tech=ev.technical??avg("technical"),conf=ev.confidence??avg("confidence"),comm=ev.communication??avg("communication");[["techScore","techBar",tech],["confScore","confBar",conf],["commScore","commBar",comm]].forEach(([t,b,v])=>{const te=document.getElementById(t),ba=document.getElementById(b);if(te)te.innerText=`${v}%`;if(ba)ba.style.width=`${v}%`;});const fb=document.getElementById("aiRealtimeFeedback");if(fb)fb.innerText=ev.feedback||vals.at(-1)?.feedback||"Live local evaluation will appear as answers are submitted.";}
function racRenderCurrent(interview){
    if(!interview)return;
    if(interview.status!=="Live")return;
    const pending=interview.pendingExpertQuestion;
    const current=pending||interview.currentQuestionObj;
    const last=interview.answers?.at(-1);
    const q=document.getElementById("currentQuestionText");
    const cat=document.getElementById("questionCat");
    const ans=document.getElementById("liveAnswerText");
    const num=document.getElementById("questionNum");
    if(current){
        if(q)q.innerText='"'+current.question+'"';
        if(cat)cat.innerText=current.category||current.stage||"Technical";
        if(ans)ans.innerText='"'+(interview.liveDraft?.text||"Waiting for candidate response...")+'"';
    }else{
        if(q)q.innerText='"Waiting for candidate question..."';
        if(cat)cat.innerText="Live Monitoring";
        if(ans)ans.innerText='"'+(last?.answer||"Waiting for candidate response...")+'"';
    }
    if(num){
        const qs=Array.isArray(interview.questions)?interview.questions:[];
        const key=current?.id||current?.questionId;
        let currentPos=key?qs.findIndex(x=>x?.id===key||x?.questionId===key):-1;
        if(currentPos<0 && current?.question){ currentPos=qs.findIndex(x=>x?.question===current.question); }
        const answeredCount=Array.isArray(interview.answers)?interview.answers.length:0;
        num.innerText=String(currentPos>=0 ? currentPos+1 : (answeredCount+(current?1:0)));
    }
    racRenderScores(interview);
    racRenderInterviewLog(interview);
}
function racGetSelectedInterview(){const id=document.getElementById("liveCandidateSelect")?.value;return id?racExpertGet(id):null;}
window.racExpertGet=racExpertGet;
window.racRenderInterviewLog=racRenderInterviewLog;
window.racRenderCurrent=racRenderCurrent;

sendExpertQuestion=function(event){event.preventDefault();const input=document.getElementById("expertQuestionInput"),text=(input?.value||"").trim();if(!text)return;const interview=racGetSelectedInterview();if(!interview)return expertMessage("Select an active candidate interview first.","error");const q={id:"expert-"+Date.now(),question:text,stage:"Expert",category:"Expert Question",source:"expert"};racExpertUpdate(interview.id,i=>{if(!Array.isArray(i.questions))i.questions=[];i.questions.push({...q,answerId:null,askedAt:new Date().toISOString()});i.pendingExpertQuestion=q;i.currentQuestionObj=q;i.expertAnswerSubmitted=false;i.mode="expert";i.liveDraft={text:"",updatedAt:new Date().toISOString()};});localStorage.setItem(LIVE_KEY,JSON.stringify({type:"expert-question",interviewId:interview.id,question:q,at:Date.now()}));if(input)input.value="";closeAskQuestionModal();expertMessage("Question sent to the candidate immediately.","success");racRenderCurrent(racExpertGet(interview.id));};

skipQuestion=function(){const interview=racGetSelectedInterview();if(!interview)return;if(interview.pendingExpertQuestion)return expertMessage("Wait for the candidate to answer the expert question first.","error");const ok=window.confirm("Skip the current AI question?");if(!ok)return;racExpertUpdate(interview.id,i=>{i.skipCurrent=true;i.mode="ai";});localStorage.setItem(LIVE_KEY,JSON.stringify({type:"skip-question",interviewId:interview.id,at:Date.now()}));expertMessage("Current AI question skipped.","success");};

function racEditCurrentQuestion(){const interview=racGetSelectedInterview();if(!interview)return;const current=interview.pendingExpertQuestion||interview.currentQuestionObj;if(!current)return expertMessage("No active question to replace.","error");const text=window.prompt("Replace this question completely:",current.question);if(!text?.trim())return;const q={...current,id:current.id||current.questionId||("expert-replaced-"+Date.now()),questionId:current.questionId||current.id,question:text.trim(),source:"expert-replaced",replacedFrom:current.question,updatedAt:new Date().toISOString()};racExpertUpdate(interview.id,i=>{if(!Array.isArray(i.questions))i.questions=[];const history=i.questions.find(x=>x.id===q.id||x.question===current.question);if(history){history.question=q.question;history.source=q.source;}else{i.questions.push({id:q.id,question:q.question,stage:q.stage,category:q.category,source:q.source,answerId:null,askedAt:new Date().toISOString()});}i.pendingExpertQuestion=q;i.currentQuestionObj=q;i.mode="expert";i.expertAnswerSubmitted=false;});localStorage.setItem(LIVE_KEY,JSON.stringify({type:"replace-question",interviewId:interview.id,question:q,at:Date.now()}));expertMessage("Question replaced and sent to the candidate.","success");racRenderCurrent(racExpertGet(interview.id));}
function racAttachQuestionEdit(){const q=document.getElementById("currentQuestionText");if(!q||q.dataset.racEditBound)return;q.dataset.racEditBound="1";q.title="Double-click to replace this question";q.addEventListener("dblclick",racEditCurrentQuestion);}
const racOriginalTogglePause=togglePauseInterview;togglePauseInterview=function(){racOriginalTogglePause();const i=racGetSelectedInterview();if(i)racExpertUpdate(i.id,x=>{x.mode=isInterviewPaused?"expert":"ai";});};
const racOriginalEnd=endInterview;endInterview=function(){const interview=racGetSelectedInterview();if(!interview)return;const ok=window.confirm("Confirm that you want to end this interview? The candidate must also confirm.");if(!ok)return;racExpertUpdate(interview.id,i=>{i.expertEndConfirmed=true;i.status="Ending - Waiting for Candidate Confirmation";});localStorage.setItem(END_KEY,JSON.stringify({interviewId:interview.id,expertConfirmed:true,at:Date.now()}));expertMessage("Expert confirmation saved. Waiting for candidate confirmation.","success");};
function racFinalizeIfBoth(i){if(!i?.expertEndConfirmed||!i?.candidateEndConfirmed)return;racExpertUpdate(i.id,x=>{x.status="Completed";x.completedAt=new Date().toISOString();});expertMessage("Both sides confirmed. Interview completed and saved.","success");}
window.addEventListener("storage",function(e){
    if(e.key!==RAC_INT_KEY&&e.key!==LIVE_KEY&&e.key!==END_KEY)return;
    refreshLiveSelector();
    const i=racGetSelectedInterview();
    if(!i)return;
    racRenderCurrent(i);
    if(i.expertEndConfirmed&&i.candidateEndConfirmed)racFinalizeIfBoth(i);
});
setInterval(()=>{
    refreshLiveSelector();
    const i=racGetSelectedInterview();
    if(i)racRenderCurrent(i);
},700);
document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{racAttachQuestionEdit();const i=racGetSelectedInterview();if(i)racRenderCurrent(i);},250));
})();

/* Persist expert-adjusted scores using the existing evaluation controls. */
(function(){
const originalSubmitExpertEvaluation=submitExpertEvaluation;
submitExpertEvaluation=function(event){
    event.preventDefault();
    const liveId=document.getElementById("liveCandidateSelect")?.value;
    const currentList=JSON.parse(localStorage.getItem(RAC_INT_KEY)||"[]");
    const interview=liveId?currentList.find(x=>x.id===liveId):null;
    const candId=document.getElementById("evalCandidateSelect")?.value || document.getElementById("liveCandidateSelect")?.value;
    const id=interview?.id||candId;
    if(!id){expertMessage("Select a candidate interview first.","error");return;}
    const values={
        technical:Number(document.getElementById("sliderTech")?.value||0),
        communication:Number(document.getElementById("sliderComm")?.value||0),
        problemSolving:Number(document.getElementById("sliderProb")?.value||0),
        confidence:Number(document.getElementById("sliderFit")?.value||0)
    };
    const list=JSON.parse(localStorage.getItem(RAC_INT_KEY)||"[]");const item=list.find(x=>x.id===id);
    if(item){item.expertEvaluation={...values,updatedAt:new Date().toISOString()};item.finalEvaluation={
        technical:values.technical,communication:values.communication,confidence:values.confidence,
        relevance:item.evaluation?.relevance||0,completeness:item.evaluation?.completeness||0,
        overall:Math.round((values.technical+values.communication+values.problemSolving+values.confidence)/4)
    };localStorage.setItem(RAC_INT_KEY,JSON.stringify(list));window.dispatchEvent(new StorageEvent("storage",{key:RAC_INT_KEY,newValue:JSON.stringify(list)}));}
    expertMessage("Expert ratings saved and reflected in the live evaluation.","success");
};
})();
