function showLandingMessage(message){let e=document.getElementById("landingStatusMessage");if(!e){e=document.createElement("div");e.id="landingStatusMessage";e.style.cssText="position:fixed;bottom:22px;right:22px;z-index:9999;padding:12px 16px;border-radius:10px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.12);border-left:4px solid #257044";document.body.appendChild(e);}e.textContent=message;clearTimeout(window.__landingTimer);window.__landingTimer=setTimeout(()=>e.remove(),3000);}
/* ================= LOGIN & ROLE SELECTION ================= */

let currentSelectedRole = localStorage.getItem("hirelyRole") || "candidate";
let currentSignupRole = "candidate";


function openLogin() {
    document.getElementById("loginModal").style.display = "flex";
    const savedRole = localStorage.getItem("hirelyRole");
    selectLoginRole(savedRole === "expert" ? "expert" : "candidate");
}


function closeLogin() {

    document
        .getElementById("loginModal")
        .style.display = "none";

}


function selectLoginRole(role) {

    currentSelectedRole = role;

    let candidateBtn = document.getElementById("roleCandidateBtn");
    let expertBtn = document.getElementById("roleExpertBtn");
    let tag = document.getElementById("loginTag");
    let heading = document.getElementById("loginHeading");
    let subtext = document.getElementById("loginSubtext");
    let submitBtn = document.getElementById("loginSubmitBtn");


    if (role === "expert") {

        if (candidateBtn) candidateBtn.classList.remove("active");
        if (expertBtn) expertBtn.classList.add("active");
        if (tag) tag.innerText = "Expert / Recruiter Portal";
        if (heading) heading.innerText = "Recruiter Login";
        if (subtext) subtext.innerText = "Login to evaluate candidates and monitor AI interviews.";
        if (submitBtn) submitBtn.innerText = "Login as Expert";

    } else {

        if (expertBtn) expertBtn.classList.remove("active");
        if (candidateBtn) candidateBtn.classList.add("active");
        if (tag) tag.innerText = "Candidate Portal";
        if (heading) heading.innerText = "Welcome back";
        if (subtext) subtext.innerText = "Login to manage your applications and interviews.";
        if (submitBtn) submitBtn.innerText = "Login as Candidate";

    }

}


function handleRoleLogin(event) {

    event.preventDefault();

    localStorage.setItem("hirelyRole", currentSelectedRole);

    if (currentSelectedRole === "expert") {
        window.location.href = "expert.html";
    } else {
        window.location.href = "candidate.html";
    }

}


/* ================= CANDIDATE LOGIN (FALLBACK) ================= */

function candidateLogin(event) {

    event.preventDefault();

    window.location.href = "candidate.html";

}


/* ================= VIEW JOB ================= */

function viewJob(jobName) {

    showLandingMessage("This action is handled inside the portal.");

}


/* ================= CONTACT ================= */

function submitContact(event) {

    event.preventDefault();

    showLandingMessage("This action is handled inside the portal.");

    event.target.reset();

}


/* ================= FILTER JOBS ================= */

function filterJobs() {

    let search =
        document
            .getElementById("jobSearch")
            .value
            .toLowerCase();


    let location =
        document
            .getElementById("locationFilter")
            .value;


    let mode =
        document
            .getElementById("modeFilter")
            .value;


    let type =
        document
            .getElementById("typeFilter")
            .value;


    let jobs =
        document.querySelectorAll(
            ".searchable-job"
        );


    let count = 0;


    jobs.forEach(function(job) {

        let title =
            job.dataset.title
                .toLowerCase();


        let jobLocation =
            job.dataset.location;


        let jobMode =
            job.dataset.mode;


        let jobType =
            job.dataset.type;


        let matchesSearch =
            title.includes(search);


        let matchesLocation =
            location === "all" ||
            jobLocation === location;


        let matchesMode =
            mode === "all" ||
            jobMode === mode;


        let matchesType =
            type === "all" ||
            jobType === type;


        if (
            matchesSearch &&
            matchesLocation &&
            matchesMode &&
            matchesType
        ) {

            job.style.display = "block";

            count++;

        }

        else {

            job.style.display = "none";

        }

    });


    document
        .getElementById("jobCount")
        .innerText =
        count +
        " positions available";

}


/* ================= CLOSE LOGIN
   WHEN CLICKING OUTSIDE ================= */

window.addEventListener(
    "click",
    function(event) {

        let modal =
            document.getElementById(
                "loginModal"
            );


        if (event.target === modal) {

            modal.style.display = "none";

        }

    }
);

/* ================= SIGNUP ================= */

function openSignup(event) {

    event.preventDefault();

    document.getElementById("loginModal").style.display = "none";

    document.getElementById("signupModal").style.display = "flex";
}


function closeSignup() {

    document.getElementById("signupModal").style.display = "none";

}


function switchToLogin(event) {

    event.preventDefault();

    document.getElementById("signupModal").style.display = "none";

    document.getElementById("loginModal").style.display = "flex";

}


function selectSignupRole(role) {
    currentSignupRole = role;
    const candidateBtn = document.getElementById("signupCandidateBtn");
    const expertBtn = document.getElementById("signupExpertBtn");
    const hint = document.getElementById("signupRoleHint");

    if (candidateBtn) candidateBtn.classList.toggle("active", role === "candidate");
    if (expertBtn) expertBtn.classList.toggle("active", role === "expert");

    if (hint) {
        hint.innerText = role === "expert"
            ? "You will review candidates, conduct technical interviews, and evaluate DRDO-oriented positions as a DRDO Technical Expert."
            : "You will apply for DRDO-oriented positions, track applications, and attend interviews as a candidate.";
    }
}

function createAccount(event) {
    event.preventDefault();

    const inputs = event.target.querySelectorAll("input");
    const name = inputs[0].value.trim();
    const email = inputs[1].value.trim();
    const password = inputs[2].value;
    const confirmPassword = inputs[3].value;

    if (password !== confirmPassword) {
        showLandingMessage("This action is handled inside the portal.");
        return;
    }

    localStorage.setItem("hirelyRole", currentSignupRole);
    localStorage.setItem("hirelyAccount", JSON.stringify({ name, email, role: currentSignupRole }));

    if (currentSignupRole === "candidate") {
        localStorage.setItem("candidateProfile", JSON.stringify({
            name, email, phone: "+91 XXXXX XXXXX", skills: "JavaScript, Java, HTML, CSS, React", resume: "Divya_Pai_Resume.pdf"
        }));
    }

    showLandingMessage("This action is handled inside the portal.");

    event.target.reset();
    document.getElementById("signupModal").style.display = "none";
    selectLoginRole(currentSignupRole);
    document.getElementById("loginModal").style.display = "flex";
}

/* ================= DRDO LANDING PAGE POSITIONS ================= */
function renderDRDOOpenPositions() {
    const grid = document.getElementById("drdoOpenPositions");
    const location = document.getElementById("locationFilter");
    if (!grid || typeof DRDO_POSITIONS === "undefined") return;

    if (location && location.options.length <= 1) {
        DRDO_LOCATIONS.forEach(function(city) {
            const opt = document.createElement("option");
            opt.value = city;
            opt.textContent = city;
            location.appendChild(opt);
        });
    }

    grid.innerHTML = DRDO_POSITIONS.map(function(pos) {
        const grade = DRDO_GRADES.find(g => g.grade === pos.grade);
        return `
        <div class="job-card searchable-job" data-title="${(pos.title+' '+pos.skills.join(' ')+' '+pos.lab).toLowerCase()}" data-grade="${pos.grade}" data-location="${pos.location}" data-mode="On-site">
            <div class="job-top"><span class="job-type">${pos.grade}</span><span class="closing">${grade ? grade.route : 'DRDO Position'}</span></div>
            <h3>${pos.title}</h3>
            <p class="company">Defence Research & Development Organisation</p>
            <p>${pos.lab} · ${grade ? grade.experience : ''}</p>
            <div class="job-info"><span>📍 ${pos.location}</span><span>💻 On-site</span></div>
            <div class="skills">${pos.skills.map(s => `<span>${s}</span>`).join('')}</div>
            <button onclick="viewJob('${pos.title.replace(/'/g, "\\'")}')">View Position</button>
        </div>`;
    }).join("");
    filterJobs();
}

function filterJobs() {
    const searchEl=document.getElementById("jobSearch");
    const locEl=document.getElementById("locationFilter");
    const modeEl=document.getElementById("modeFilter");
    const gradeEl=document.getElementById("gradeFilter");
    const countEl=document.getElementById("jobCount");
    const jobs=document.querySelectorAll("#drdoOpenPositions .searchable-job");
    if(!searchEl || !locEl || !modeEl || !countEl) return;
    const search=searchEl.value.toLowerCase().trim();
    const loc=locEl.value, mode=modeEl.value, grade=gradeEl ? gradeEl.value : "all";
    let count=0;
    jobs.forEach(function(job){
        const visible=(job.dataset.title||"").includes(search) && (loc==="all"||job.dataset.location===loc) && (mode==="all"||job.dataset.mode===mode) && (grade==="all"||job.dataset.grade===grade);
        job.style.display=visible?"block":"none";
        if(visible) count++;
    });
    countEl.innerText=count+" positions available";
}

document.addEventListener("DOMContentLoaded", renderDRDOOpenPositions);
