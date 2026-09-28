import re


DEFAULT_KEYWORDS = [
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "html",
    "css",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "git",
    "github",
    "rest api",
    "api",
    "node.js",
    "node",
    "fastapi",
    "django",
    "spring boot",
    "docker",
    "aws",
    "machine learning",
    "data structures",
    "algorithms",
]


def clean_text(text):
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def contains_keyword(text, keyword):
    """Match a keyword/phrase without accidental substring matches."""
    text = clean_text(text)
    keyword = clean_text(keyword)
    if not keyword:
        return False
    pattern = r"(?<![a-z0-9])" + re.escape(keyword).replace(r"\ ", r"\s+") + r"(?![a-z0-9])"
    return bool(re.search(pattern, text, re.IGNORECASE))


JOB_SKILL_ALIASES = {
    "ai/ml": ["ai/ml", "ai ml", "artificial intelligence", "machine learning"],
    "cyber security": ["cyber security", "cybersecurity", "information security", "cyber-security"],
    "uavs": ["uavs", "uav", "unmanned aerial vehicle", "unmanned aerial vehicles", "drone", "drones"],
    "electronics": ["electronics", "electronic systems"],
    "communication": ["communication", "communications", "communication systems"],
    "radar": ["radar", "radar systems"],
    "software systems": ["software systems", "software development", "software engineering"],
    "flight systems": ["flight systems", "flight control", "flight dynamics"],
    "advanced computing": ["advanced computing", "high performance computing", "hpc"],
    "computer science": ["computer science", "computer sciences", "cse"],
}


def normalize_job_skill(skill):
    return re.sub(r"\s+", " ", str(skill or "").lower().strip())


def job_skill_variants(skill):
    normalized = normalize_job_skill(skill)
    variants = JOB_SKILL_ALIASES.get(normalized, [normalized])
    # Always include the original skill even if no alias exists.
    return list(dict.fromkeys([normalized] + variants))


def extract_keywords(text):
    """
    Find technical keywords from our predefined
    keyword list.
    """

    text = clean_text(text)

    found = []

    for keyword in DEFAULT_KEYWORDS:

        if contains_keyword(text, keyword):
            found.append(keyword)

    return found


def calculate_job_match(
    resume_text,
    job_description,
    job_skills=None
):

    resume_text = clean_text(resume_text)

    job_description = clean_text(
        job_description
    )

    # Start with recognized technical keywords from the job description,
    # then add the job's explicit skills so every local job can be matched
    # against its actual requirements.
    required_keywords = extract_keywords(job_description)
    explicit_skills = job_skills if isinstance(job_skills, list) else []
    for skill in explicit_skills:
        normalized = normalize_job_skill(skill)
        if normalized and normalized not in required_keywords:
            required_keywords.append(normalized)

    # Keep the result deterministic and readable.
    required_keywords = list(dict.fromkeys(required_keywords))

    if not required_keywords:
        return {
            "score": 0,
            "matched": [],
            "missing": [],
            "required": [],
            "message": "No recognizable job skills were detected in the job description."
        }

    matched = []
    missing = []

    for keyword in required_keywords:
        variants = job_skill_variants(keyword)
        if any(contains_keyword(resume_text, variant) for variant in variants):
            matched.append(keyword)
        else:
            missing.append(keyword)


    score = round(
        (len(matched) / len(required_keywords))
        * 100
    )


    return {
        "score": score,
        "matched": matched,
        "missing": missing,
        "required": required_keywords,
        "message": "Job description analyzed successfully."
    }


def calculate_score(
    text,
    job_description="",
    job_skills=None
):

    text = clean_text(text)

    scores = {}

    # =================================================
    # 1. CONTACT INFORMATION - 10 POINTS
    # =================================================

    email_found = bool(
        re.search(
            r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
            text
        )
    )

    phone_found = bool(
        re.search(
            r"(\+?\d[\d\s\-]{8,14}\d)",
            text
        )
    )

    contact_score = 0

    if email_found:
        contact_score += 5

    if phone_found:
        contact_score += 5

    scores["contact"] = contact_score


    # =================================================
    # 2. IMPORTANT SECTIONS - 20 POINTS
    # =================================================

    sections = {

        "education": [
            "education",
            "academic",
            "university",
            "college"
        ],

        "experience": [
            "experience",
            "work experience",
            "employment"
        ],

        "skills": [
            "skills",
            "technical skills",
            "technologies"
        ],

        "projects": [
            "projects",
            "project"
        ],

        "certifications": [
            "certifications",
            "certificates"
        ]

    }


    section_score = 0

    missing_sections = []


    for section_name, keywords in sections.items():

        found = any(
            keyword in text
            for keyword in keywords
        )

        if found:

            section_score += 4

        else:

            missing_sections.append(
                section_name
            )


    scores["sections"] = section_score


    # =================================================
    # 3. GENERAL KEYWORD MATCH - 30 POINTS
    # =================================================

    matched_keywords = []

    missing_keywords = []


    for keyword in DEFAULT_KEYWORDS:

        if contains_keyword(
            text,
            keyword
        ):

            matched_keywords.append(
                keyword
            )

        else:

            missing_keywords.append(
                keyword
            )


    keyword_score = round(
        (
            len(matched_keywords)
            /
            len(DEFAULT_KEYWORDS)
        )
        * 30
    )


    scores["keywords"] = keyword_score


    # =================================================
    # 4. CONTENT QUALITY - 20 POINTS
    # =================================================

    action_words = [

        "developed",
        "created",
        "built",
        "designed",
        "implemented",
        "managed",
        "optimized",
        "automated",
        "integrated",
        "engineered",
        "analyzed"

    ]


    action_word_count = sum(
        1
        for word in action_words
        if word in text
    )


    content_score = min(
        action_word_count * 2,
        10
    )


    number_count = len(
        re.findall(
            r"\b\d+%?\b",
            text
        )
    )


    achievement_score = min(
        number_count,
        10
    )


    scores["content"] = (
        content_score
        +
        achievement_score
    )


    # =================================================
    # 5. ATS FORMATTING - 20 POINTS
    # =================================================

    formatting_score = 20

    formatting_issues = []


    if len(text) < 500:

        formatting_score -= 8

        formatting_issues.append(
            "Resume contains very little extractable text."
        )


    if len(text) > 12000:

        formatting_score -= 4

        formatting_issues.append(
            "Resume may contain excessive content."
        )


    if "objective" not in text and \
       "summary" not in text:

        formatting_issues.append(
            "Consider adding a short professional summary."
        )


    formatting_score = max(
        formatting_score,
        0
    )


    scores["formatting"] = formatting_score


    # =================================================
    # TOTAL ATS SCORE
    # =================================================

    total_score = (

        scores["contact"]

        +

        scores["sections"]

        +

        scores["keywords"]

        +

        scores["content"]

        +

        scores["formatting"]

    )


    # =================================================
    # JOB DESCRIPTION MATCH
    # =================================================

    job_match = calculate_job_match(
        text,
        job_description,
        job_skills
    )


    # =================================================
    # RECOMMENDATIONS
    # =================================================

    recommendations = []


    if not email_found:

        recommendations.append(
            "Add a professional email address."
        )


    if not phone_found:

        recommendations.append(
            "Add a contact phone number."
        )


    if missing_sections:

        recommendations.append(

            "Consider adding: "
            +
            ", ".join(
                missing_sections
            )
            +
            "."

        )


    if job_match["missing"]:

        recommendations.append(

            "Your resume is missing "
            "job-specific keywords: "
            +
            ", ".join(
                job_match["missing"][:6]
            )
            +
            "."

        )


    if action_word_count < 3:

        recommendations.append(

            "Use stronger action words such as "
            "developed, implemented, designed, "
            "or optimized."

        )


    if number_count < 2:

        recommendations.append(

            "Add measurable results to projects "
            "or experience where possible."

        )


    recommendations.extend(
        formatting_issues
    )


    if not recommendations:

        recommendations.append(

            "Resume structure and content "
            "look reasonably ATS-friendly."

        )


    # =================================================
    # SCREENING DECISION
    # =================================================

    threshold = 70


    eligible = (
        total_score >= threshold
        and
        (
            job_match["score"] >= 50
            or
            not job_description.strip()
        )
    )


    return {

        "score": total_score,

        "eligible": eligible,

        "threshold": threshold,

        "job_match": job_match,

        "breakdown": {

            "Contact Information":
                scores["contact"],

            "Resume Sections":
                scores["sections"],

            "Keyword Match":
                scores["keywords"],

            "Content Quality":
                scores["content"],

            "ATS Formatting":
                scores["formatting"]

        },

        "matched_keywords":
            matched_keywords,

        "missing_keywords":
            missing_keywords[:12],

        "missing_sections":
            missing_sections,

        "recommendations":
            recommendations[:8]

    }