import type OpenAI from "openai";
import type { Experience, Bullet, Skill } from "@shared/schema";

export const MODEL = "llama-3.3-70b-versatile";
const BASE_URL = "https://api.groq.com/openai/v1";

function log(step: string, data?: any) {
  const summary = data
    ? typeof data === "string"
      ? data.slice(0, 500)
      : JSON.stringify(data).slice(0, 500)
    : "";
  console.log(`[TAILOR] ${step}${summary ? ": " + summary : ""}`);
}

export function normalizeLinkedInUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    if (!url.hostname.includes("linkedin.com")) return rawUrl;
    const jobIdParam = url.searchParams.get("currentJobId");
    if (jobIdParam) {
      const normalized = `https://www.linkedin.com/jobs/view/${jobIdParam}`;
      log("normalizeLinkedInUrl", `Converted → ${normalized}`);
      return normalized;
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

// ─── LLM Health Check ────────────────────────────────────────────────────────

export interface LLMHealthResult {
  provider: string;
  model: string;
  baseUrl: string;
  apiKeyPresent: boolean;
  success: boolean;
  rawText: string;
  responseTimeMs: number;
  error?: string;
}

export async function checkLLMHealth(openai: OpenAI | null): Promise<LLMHealthResult> {
  const result: LLMHealthResult = {
    provider: "Groq",
    model: MODEL,
    baseUrl: BASE_URL,
    apiKeyPresent: !!process.env.GROQ_API_KEY,
    success: false,
    rawText: "",
    responseTimeMs: 0,
  };

  if (!openai) {
    result.error = "GROQ_API_KEY not set";
    console.log("[LLM-HEALTH]", JSON.stringify(result));
    return result;
  }

  const start = Date.now();
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 5,
    });
    result.responseTimeMs = Date.now() - start;
    result.rawText = response.choices[0]?.message?.content?.trim() || "";
    result.success = result.rawText.toUpperCase().includes("OK");
  } catch (err: any) {
    result.responseTimeMs = Date.now() - start;
    result.error = err.message;
  }

  console.log("[LLM-HEALTH]", JSON.stringify(result));
  return result;
}

// ─── Pipeline Config ─────────────────────────────────────────────────────────

const COMPOSITION_LIMITS: Record<string, { maxExps: number; maxBulletsPerExp: number; maxTotal: number }> = {
  compact:  { maxExps: 2, maxBulletsPerExp: 2, maxTotal: 4 },
  balanced: { maxExps: 3, maxBulletsPerExp: 3, maxTotal: 8 },
  detailed: { maxExps: 4, maxBulletsPerExp: 4, maxTotal: 12 },
};

// ─── Step 1: Parse Job Description ───────────────────────────────────────────

export interface ParsedJob {
  title: string;
  company: string;
  seniority: string;
  domain: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  keywords: string[];
  language: "EN" | "FR";
}

export async function parseJobDescription(
  text: string,
  openai: OpenAI
): Promise<ParsedJob> {
  log("parseJobDescription", `Input: ${text.length} chars`);

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a job description parser. Extract structured information from job postings accurately. If a field cannot be determined from the text, use reasonable inference but never hallucinate. For seniority, use one of: Junior, Mid-level, Senior, Lead, Principal, Director, VP, C-level. For domain, identify the industry sector (e.g., "Luxury Fashion", "FinTech", "SaaS", "E-commerce"). Detect the primary language of the job description: "FR" if mostly French, "EN" if mostly English or other.`,
      },
      {
        role: "user",
        content: `Parse this job description into structured JSON with these exact fields:
- title (string): the exact job title mentioned
- company (string): the company name
- seniority (string): seniority level
- domain (string): industry/domain
- responsibilities (string[]): key responsibilities listed (max 8)
- requiredSkills (string[]): explicitly required skills, tools, methodologies
- preferredSkills (string[]): nice-to-have or preferred qualifications
- keywords (string[]): the 10-15 most important keywords/phrases a recruiter would search for
- language (string): "FR" if the job description is mostly in French, "EN" otherwise

Job Description:
${text}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");

  const detectedLang = (parsed.language || "").toUpperCase().startsWith("FR") ? "FR" as const : "EN" as const;

  const job: ParsedJob = {
    title: parsed.title || "",
    company: parsed.company || "",
    seniority: parsed.seniority || "Mid-level",
    domain: parsed.domain || "",
    responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
    requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
    preferredSkills: Array.isArray(parsed.preferredSkills) ? parsed.preferredSkills : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    language: detectedLang,
  };

  if (!job.title) throw new Error("Could not extract job title from description. Please provide a clearer job description.");

  log("parseJobDescription RESULT", {
    title: job.title,
    company: job.company,
    seniority: job.seniority,
    domain: job.domain,
    language: job.language,
    requiredSkills: job.requiredSkills.length,
    keywords: job.keywords.length,
  });

  return job;
}

// ─── Step 2: Score Experiences ────────────────────────────────────────────────

export interface ScoredExperience {
  experience: Experience;
  score: number;
  reason: string;
  matchedAspects: string[];
}

export async function scoreExperiences(
  parsedJob: ParsedJob,
  experiences: Experience[],
  openai: OpenAI
): Promise<ScoredExperience[]> {
  log("scoreExperiences", `Scoring ${experiences.length} experiences`);

  if (experiences.length === 0) return [];

  const expSummaries = experiences
    .map(
      (e, i) =>
        `[${i}] "${e.title}" at "${e.company}" (${e.startDate || "?"} → ${e.endDate || "Present"})${e.description ? ` — ${e.description.slice(0, 150)}` : ""}`
    )
    .join("\n");

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a CV optimization expert. Score how relevant each work experience is for a specific job application. Consider these signals with balanced weighting:
- Role similarity: title and function alignment (strongest signal)
- Industry similarity: same or adjacent industry increases relevance (e.g., banking experience for a bank job, luxury for luxury)
- Brand proximity: recognized companies in the same domain get a slight boost, but do NOT overweight brand prestige alone
- Seniority match: matching seniority level
- Skill overlap: relevant tools, methodologies, competencies
- Recency: more recent experiences score higher
Be strict: if an experience is unrelated, give it a low score. Include "industry" and "brand" in matchedAspects when applicable.`,
      },
      {
        role: "user",
        content: `Target Job: "${parsedJob.title}" at "${parsedJob.company}"
Seniority: ${parsedJob.seniority}
Domain: ${parsedJob.domain}
Required Skills: ${parsedJob.requiredSkills.join(", ")}
Key Responsibilities: ${parsedJob.responsibilities.join(", ")}

Candidate Experiences:
${expSummaries}

For each experience, return JSON with:
- "scores": array of objects with:
  - "index": number
  - "score": number 0-100
  - "reason": string (1-2 sentences explaining why this experience is/isn't relevant)
  - "matchedAspects": string[] (which aspects match: "role", "industry", "seniority", "skills", "recency")`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  const scores = result.scores || [];

  const scored: ScoredExperience[] = experiences.map((exp, i) => {
    const entry = scores.find((s: any) => s.index === i) || {
      score: 30,
      reason: "Not evaluated",
      matchedAspects: [],
    };

    const now = new Date();
    const endDate = exp.endDate ? new Date(exp.endDate) : now;
    const yearsAgo = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const recencyBonus = yearsAgo <= 1 ? 5 : yearsAgo <= 3 ? 2 : 0;

    return {
      experience: exp,
      score: Math.min(100, (entry.score || 0) + recencyBonus),
      reason: entry.reason || "Not evaluated",
      matchedAspects: entry.matchedAspects || [],
    };
  });

  scored.sort((a, b) => b.score - a.score);

  log("scoreExperiences RESULT", scored.map((s) => ({
    title: s.experience.title,
    company: s.experience.company,
    score: s.score,
    aspects: s.matchedAspects,
  })));

  return scored;
}

// ─── Step 3: Score Bullets Within Top Experiences ────────────────────────────

export interface ScoredBullet {
  bullet: Bullet;
  experience: Experience;
  score: number;
  matchedKeywords: string[];
  reason: string;
}

export async function scoreBulletsInExperiences(
  parsedJob: ParsedJob,
  topExperiences: ScoredExperience[],
  bulletsByExp: Map<string, Bullet[]>,
  openai: OpenAI
): Promise<ScoredBullet[]> {
  const allBullets: { bullet: Bullet; experience: Experience }[] = [];
  for (const se of topExperiences) {
    const expBullets = bulletsByExp.get(se.experience.id) || [];
    for (const b of expBullets) {
      allBullets.push({ bullet: b, experience: se.experience });
    }
  }

  log("scoreBulletsInExperiences", `Scoring ${allBullets.length} bullets across ${topExperiences.length} experiences`);

  if (allBullets.length === 0) return [];

  const bulletSummaries = allBullets
    .map(
      (b, i) =>
        `[${i}] (${b.experience.title} @ ${b.experience.company}): ${b.bullet.text}`
    )
    .join("\n");

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a CV bullet point optimizer. Score each bullet for relevance to the target job. Prioritize bullets that demonstrate: direct skill matches, quantified achievements, relevant responsibilities, transferable competencies. Be strict about relevance.`,
      },
      {
        role: "user",
        content: `Target Job: "${parsedJob.title}" at "${parsedJob.company}"
Domain: ${parsedJob.domain}
Required Skills: ${parsedJob.requiredSkills.join(", ")}
Responsibilities: ${parsedJob.responsibilities.join(", ")}
Keywords: ${parsedJob.keywords.join(", ")}

Candidate Bullets:
${bulletSummaries}

Return JSON with:
- "scores": array of objects with:
  - "index": number
  - "score": number 0-100
  - "matchedKeywords": string[] (which job keywords this bullet addresses)
  - "reason": string (why this bullet is/isn't relevant)`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  const scores = result.scores || [];

  const scored: ScoredBullet[] = allBullets.map((ab, i) => {
    const entry = scores.find((s: any) => s.index === i) || {
      score: 0,
      matchedKeywords: [],
      reason: "Not scored",
    };

    return {
      bullet: ab.bullet,
      experience: ab.experience,
      score: entry.score || 0,
      matchedKeywords: entry.matchedKeywords || [],
      reason: entry.reason || "Not evaluated",
    };
  });

  scored.sort((a, b) => b.score - a.score);

  log("scoreBulletsInExperiences RESULT", scored.slice(0, 8).map((s) => ({
    score: s.score,
    exp: s.experience.title,
    text: s.bullet.text.slice(0, 80),
  })));

  return scored;
}

// ─── Step 4: Build Composition Plan ──────────────────────────────────────────

export interface CompositionPlan {
  targetTitle: string;
  summary: string;
  sections: {
    experience: Experience;
    experienceScore: number;
    experienceReason: string;
    bullets: ScoredBullet[];
  }[];
  relevantSkills: string[];
  rejectedBullets: { text: string; score: number; reason: string }[];
  rejectedExperiences: { title: string; company: string; score: number; reason: string }[];
  fallbackUsed: boolean;
  confidenceReasoning: string;
}

export async function buildCompositionPlan(
  parsedJob: ParsedJob,
  scoredExperiences: ScoredExperience[],
  scoredBullets: ScoredBullet[],
  userSkills: Skill[],
  mode: "original" | "polished" | "adaptive",
  openai: OpenAI,
  outputLength: "compact" | "balanced" | "detailed" = "balanced"
): Promise<CompositionPlan> {
  log("buildCompositionPlan", `Mode: ${mode}, Length: ${outputLength}`);

  const { maxExps: MAX_EXPERIENCES, maxBulletsPerExp: MAX_BULLETS_PER_EXPERIENCE, maxTotal: MAX_TOTAL_BULLETS } =
    COMPOSITION_LIMITS[outputLength] || COMPOSITION_LIMITS.balanced;

  let fallbackUsed = false;
  const confidenceReasons: string[] = [];

  const selectedExps = scoredExperiences.slice(0, MAX_EXPERIENCES);
  const rejectedExps = scoredExperiences.slice(MAX_EXPERIENCES);

  const selectedExpIds = new Set(selectedExps.map((se) => se.experience.id));
  const eligibleBullets = scoredBullets.filter(
    (sb) => selectedExpIds.has(sb.experience.id) && sb.score >= 20
  );

  const bulletsByExp = new Map<string, ScoredBullet[]>();
  for (const sb of eligibleBullets) {
    const expId = sb.experience.id;
    if (!bulletsByExp.has(expId)) bulletsByExp.set(expId, []);
    bulletsByExp.get(expId)!.push(sb);
  }

  let sections = selectedExps
    .map((se) => {
      const expBullets = (bulletsByExp.get(se.experience.id) || []).slice(0, MAX_BULLETS_PER_EXPERIENCE);
      if (expBullets.length === 0) return null;
      return {
        experience: se.experience,
        experienceScore: se.score,
        experienceReason: se.reason,
        bullets: expBullets,
      };
    })
    .filter(Boolean) as CompositionPlan["sections"];

  if (sections.length === 0 && scoredBullets.length > 0) {
    fallbackUsed = true;
    confidenceReasons.push("No bullets met threshold (score >= 20). Using top bullets from best experience as fallback.");
    log("buildCompositionPlan", "FALLBACK: No qualifying bullets. Using top bullets from best experience.");

    const bestExp = scoredExperiences[0];
    const bestExpBullets = bestExp
      ? scoredBullets.filter((sb) => sb.experience.id === bestExp.experience.id).slice(0, MAX_BULLETS_PER_EXPERIENCE)
      : [];

    const fallbackBullets = bestExpBullets.length > 0
      ? bestExpBullets
      : scoredBullets.slice(0, MAX_BULLETS_PER_EXPERIENCE);

    if (fallbackBullets.length > 0) {
      const fallbackExp = bestExp || scoredExperiences[0];
      sections = [{
        experience: fallbackBullets[0].experience,
        experienceScore: fallbackExp?.score || 0,
        experienceReason: (fallbackExp?.reason || "Best available") + " (fallback)",
        bullets: fallbackBullets,
      }];
      if (bestExpBullets.length === 0) {
        confidenceReasons.push("Used any available bullets as last-resort fallback.");
      }
    }
  }

  if (sections.length === 0) {
    fallbackUsed = true;
    confidenceReasons.push("No bullets available in library. Generated empty CV structure.");
    log("buildCompositionPlan", "EMPTY: No bullets found at all.");
  }

  let totalBullets = sections.reduce((acc, s) => acc + s.bullets.length, 0);
  if (totalBullets > MAX_TOTAL_BULLETS) {
    let remaining = MAX_TOTAL_BULLETS;
    for (const section of sections) {
      const allowed = Math.min(section.bullets.length, remaining);
      section.bullets = section.bullets.slice(0, allowed);
      remaining -= allowed;
    }
    sections = sections.filter((s) => s.bullets.length > 0);
    totalBullets = sections.reduce((acc, s) => acc + s.bullets.length, 0);
    confidenceReasons.push(`Total bullets capped at ${MAX_TOTAL_BULLETS}.`);
  }

  const usedBulletIds = new Set(
    sections.flatMap((s) => s.bullets.map((b) => b.bullet.id))
  );
  const rejectedBullets = scoredBullets
    .filter((sb) => !usedBulletIds.has(sb.bullet.id))
    .slice(0, 10)
    .map((sb) => ({
      text: sb.bullet.text,
      score: sb.score,
      reason: sb.reason,
    }));

  const rejectedExperiences = rejectedExps.map((se) => ({
    title: se.experience.title,
    company: se.experience.company,
    score: se.score,
    reason: se.reason,
  }));

  const allJobSkills = [
    ...parsedJob.requiredSkills,
    ...parsedJob.preferredSkills,
  ].map((s) => s.toLowerCase());

  const selectedBulletTexts = sections
    .flatMap((s) => s.bullets.map((b) => b.bullet.text.toLowerCase()));

  const relevantSkills = userSkills
    .filter((skill) => {
      const skillLower = skill.name.toLowerCase();
      const isJobRelevant = allJobSkills.some(
        (js) =>
          js.includes(skillLower) ||
          skillLower.includes(js) ||
          js === skillLower
      );
      const isMentionedInBullets = selectedBulletTexts.some((bt) =>
        bt.includes(skillLower)
      );
      return isJobRelevant || isMentionedInBullets;
    })
    .map((s) => s.name);

  if (sections.length >= MAX_EXPERIENCES) {
    confidenceReasons.push(`Selected top ${sections.length} experiences (max ${MAX_EXPERIENCES}).`);
  }
  if (!fallbackUsed) {
    const avgBulletScore = totalBullets > 0
      ? Math.round(sections.reduce((acc, s) => acc + s.bullets.reduce((a, b) => a + b.score, 0), 0) / totalBullets)
      : 0;
    confidenceReasons.push(`Average bullet score: ${avgBulletScore}/100 across ${totalBullets} bullets.`);
    if (avgBulletScore >= 60) confidenceReasons.push("Strong bullet relevance.");
    else if (avgBulletScore >= 35) confidenceReasons.push("Moderate bullet relevance — transferable skills help.");
    else confidenceReasons.push("Weak bullet relevance — profile may not align well.");
  }

  let summary = "";
  if (sections.length > 0) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `Write a 1-2 sentence professional summary for a CV. Be specific to the target role. Mention the candidate's years of domain experience and 2-3 most relevant skills. No first person. No generic filler. Maximum 40 words.${parsedJob.language === "FR" ? " Write entirely in French." : " Write entirely in English."}`,
          },
          {
            role: "user",
            content: `Target: "${parsedJob.title}" at "${parsedJob.company}" (${parsedJob.domain})
Experiences: ${sections.map((s) => `${s.experience.title} at ${s.experience.company}`).join(", ")}
Skills: ${relevantSkills.slice(0, 6).join(", ")}
Key requirements: ${parsedJob.requiredSkills.slice(0, 5).join(", ")}

Write a professional summary (1-2 sentences, max 40 words, no first person, specific to this exact role).`,
          },
        ],
      });
      summary = (response.choices[0].message.content || "").trim();
    } catch (err: any) {
      log("buildCompositionPlan", `Summary generation failed: ${err.message}. Using empty summary.`);
      confidenceReasons.push("Summary generation failed — using minimal output.");
    }
  }
  const confidenceReasoning = confidenceReasons.join(" ");

  const plan: CompositionPlan = {
    targetTitle: parsedJob.title,
    summary,
    sections,
    relevantSkills,
    rejectedBullets,
    rejectedExperiences,
    fallbackUsed,
    confidenceReasoning,
  };

  log("buildCompositionPlan RESULT", {
    sections: sections.length,
    totalBullets,
    relevantSkills: relevantSkills.length,
    rejected: rejectedBullets.length,
    rejectedExps: rejectedExperiences.length,
    fallbackUsed,
  });

  return plan;
}

// ─── Step 5: Generate Tailored CV Text ───────────────────────────────────────

const OUTPUT_LENGTH_CHARS: Record<string, number> = {
  compact: 1500,
  balanced: 3000,
  detailed: 5000,
};

export async function generateTailoredCV(
  plan: CompositionPlan,
  parsedJob: ParsedJob,
  mode: "original" | "polished" | "adaptive",
  openai: OpenAI,
  outputLength: "compact" | "balanced" | "detailed" = "balanced",
  customMaxChars?: number
): Promise<string> {
  log("generateTailoredCV", `Mode: ${mode}, Length: ${outputLength}, Sections: ${plan.sections.length}`);

  const originalFrInstruction = parsedJob.language === "FR"
    ? `\n- Write ALL structural elements in French: the target role title, section headings (use "Expérience Professionnelle", "Compétences", "Résumé Professionnel", etc.), date labels, and skill names.\n- Keep ALL bullet point text EXACTLY as written by the candidate — do not translate bullets.\n- The professional summary (already provided in French) must appear exactly as given.`
    : "";

  const originalInstructions = `ORIGINAL MODE RULES:
- Keep EVERY bullet point EXACTLY as written by the candidate. Do not change a single word.
- Only organize, order, and format the content.
- You may reorder experiences and bullets for maximum impact.
- Do NOT add, remove, or rephrase any bullet text.${originalFrInstruction}`;

  const langInstruction = parsedJob.language === "FR"
    ? "\n- Write the ENTIRE CV in French: summary, bullet rewrites, section titles, skills wording."
    : "\n- Write the ENTIRE CV in English: summary, bullet rewrites, section titles, skills wording.";

  const polishedInstructions = `POLISHED MODE RULES:
- You may lightly rephrase bullet points to naturally embed relevant keywords: ${parsedJob.keywords.slice(0, 10).join(", ")}
- Keep the factual content and achievements identical — only adjust wording and terminology.
- Use industry-standard phrasing that ATS systems recognize.
- Do NOT invent new achievements, metrics, or experience.
- Do NOT add skills the candidate doesn't demonstrate.
- Match verb tenses and professional tone.${langInstruction}`;

  const adaptiveInstructions = `ADAPTIVE MODE RULES:
- Strongly rewrite bullets to deeply adapt them to the target role and required keywords: ${parsedJob.keywords.slice(0, 10).join(", ")}
- Reframe achievements to emphasize relevant skills and competencies for this specific job.
- Use industry-specific terminology that resonates with the role.
- Maintain factual accuracy: do NOT invent achievements, but reword to highlight what's most relevant.
- Adjust phrasing to match the tone and language of the job posting.${langInstruction}`;

  const experienceSections = plan.sections
    .map(
      (section) => `
### ${section.experience.title} | ${section.experience.company}
${section.experience.startDate || ""} – ${section.experience.endDate || "Present"}

${section.bullets.map((sb) => `• ${sb.bullet.text}`).join("\n")}
`
    )
    .join("\n");

  const modeInstructions = 
    mode === "original" ? originalInstructions :
    mode === "polished" ? polishedInstructions :
    adaptiveInstructions;

  const maxChars = customMaxChars ?? OUTPUT_LENGTH_CHARS[outputLength];
  const lengthDescriptions: Record<string, string> = {
    compact: "very concise — around 1–2 bullets per experience, short summary. Total output under ~1500 characters.",
    balanced: "standard length — 2–3 bullets per experience, moderate summary. Total output under ~3000 characters.",
    detailed: "comprehensive — 3–4 bullets per experience, fuller summary. Total output under ~5000 characters.",
  };
  const lengthInstruction = customMaxChars
    ? `Keep the total CV output under ${customMaxChars} characters (custom limit).`
    : `Keep the total CV output ${lengthDescriptions[outputLength]}`;

  const langHeader = parsedJob.language === "FR"
    ? `⚠️ LANGUAGE: This CV MUST be written ENTIRELY in French (FR). Every word — the summary, all section headings, all skill labels, all bullet text (if rewritten) — must be in French. Writing in English is FORBIDDEN.\n\n`
    : `LANGUAGE: Write the CV entirely in English.\n\n`;

  const prompt = `${langHeader}Generate a professional CV for the target role: "${plan.targetTitle}"

${modeInstructions}

PROFESSIONAL SUMMARY:
${plan.summary}

EXPERIENCE:
${experienceSections}

SKILLS:
${plan.relevantSkills.join(" · ")}

FORMAT RULES:
- Output a clean, professional CV document.
- Start with the candidate's target title and professional summary.
- List each experience with title, company, and date range.
- List bullet points under each experience.
- End with a Skills section containing ONLY the skills listed above (translate skill names to ${parsedJob.language === "FR" ? "French" : "English"} if needed).
- NO introductions, labels, commentary, or JSON.
- NO "Fallback:", "Output:", "Generated CV:" or similar labels.
- Output the CV text directly.
- LENGTH: ${lengthInstruction}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  let cvText = (response.choices[0].message.content || "").trim();

  cvText = cvText
    .replace(/^(Fallback|Output|Result|CV Text|Generated CV|Here is)[:\s—-]*/gi, "")
    .replace(/^(Here's the|Below is|The following)[^\n]*\n/gi, "")
    .trim();

  log("generateTailoredCV", `Generated ${cvText.length} chars`);
  return cvText;
}

// ─── Step 6: Generate Optimization Report ────────────────────────────────────

export interface OptimizationReport {
  jobTitle: string;
  jobCompany: string;
  jobSeniority: string;
  jobDomain: string;
  detectedKeywords: {
    requiredSkills: string[];
    preferredSkills: string[];
    responsibilities: string[];
    keywords: string[];
  };
  matchedSkills: string[];
  missingSkills: string[];
  selectedExperiences: {
    title: string;
    company: string;
    score: number;
    reason: string;
    matchedAspects: string[];
    bulletCount: number;
  }[];
  rejectedExperiences: {
    title: string;
    company: string;
    score: number;
    reason: string;
  }[];
  selectedBullets: {
    text: string;
    experienceTitle: string;
    score: number;
    matchedKeywords: string[];
    reason: string;
  }[];
  rejectedBullets: {
    text: string;
    score: number;
    reason: string;
  }[];
  confidence: number;
  confidenceReasoning: string;
  fallbackUsed: boolean;
  detectedLanguage: "EN" | "FR";
  tips: string[];
}

export function generateOptimizationReport(
  parsedJob: ParsedJob,
  plan: CompositionPlan,
  scoredExperiences: ScoredExperience[],
  userSkills: Skill[]
): OptimizationReport {
  log("generateOptimizationReport", "Building report");

  const allJobSkills = [
    ...parsedJob.requiredSkills,
    ...parsedJob.preferredSkills,
  ];
  const userSkillNames = userSkills.map((s) => s.name.toLowerCase());

  const matchedSkills = allJobSkills.filter((k) =>
    userSkillNames.some(
      (s) => s === k.toLowerCase() || s.includes(k.toLowerCase()) || k.toLowerCase().includes(s)
    )
  );

  const selectedBulletTexts = plan.sections
    .flatMap((s) => s.bullets.map((b) => b.bullet.text.toLowerCase()));

  const missingSkills = parsedJob.requiredSkills.filter(
    (k) => {
      const kLower = k.toLowerCase();
      const inUserSkills = userSkillNames.some(
        (s) => s === kLower || s.includes(kLower) || kLower.includes(s)
      );
      const inBullets = selectedBulletTexts.some((bt) => bt.includes(kLower));
      return !inUserSkills && !inBullets;
    }
  );

  const selectedExperiences = plan.sections.map((s) => ({
    title: s.experience.title,
    company: s.experience.company,
    score: s.experienceScore,
    reason: s.experienceReason,
    matchedAspects: scoredExperiences.find(
      (se) => se.experience.id === s.experience.id
    )?.matchedAspects || [],
    bulletCount: s.bullets.length,
  }));

  const selectedBullets = plan.sections.flatMap((s) =>
    s.bullets.map((b) => ({
      text: b.bullet.text,
      experienceTitle: s.experience.title,
      score: b.score,
      matchedKeywords: b.matchedKeywords,
      reason: b.reason,
    }))
  );

  const totalBullets = selectedBullets.length;
  const avgBulletScore = totalBullets > 0
    ? selectedBullets.reduce((acc, b) => acc + b.score, 0) / totalBullets
    : 0;
  const avgExpScore = plan.sections.length > 0
    ? plan.sections.reduce((acc, s) => acc + s.experienceScore, 0) / plan.sections.length
    : 0;
  const skillCoverage = allJobSkills.length > 0
    ? (matchedSkills.length / allJobSkills.length) * 100
    : 50;

  let confidence = Math.round(
    (avgExpScore * 0.35 + avgBulletScore * 0.35 + skillCoverage * 0.3)
  );
  if (plan.fallbackUsed) confidence = Math.min(confidence, 25);
  confidence = Math.max(0, Math.min(100, confidence));

  const tips: string[] = [];
  if (plan.fallbackUsed) {
    tips.push("Fallback mode was used — no bullets met the relevance threshold. Consider enriching your library with more targeted bullet points.");
  }
  if (missingSkills.length > 0) {
    tips.push(
      `Missing required skills: ${missingSkills.join(", ")}. Consider adding relevant experiences.`
    );
  }
  if (plan.sections.length < 2) {
    tips.push(
      "Few relevant experiences found. Add more work history to your library for better matching."
    );
  }
  if (confidence >= 70) {
    tips.push("Strong match! Your profile aligns well with this role.");
  } else if (confidence >= 40) {
    tips.push("Moderate match. Focus on highlighting transferable skills in your cover letter.");
  } else {
    tips.push("Weak match. This role may require significant upskilling or different experience.");
  }
  if (matchedSkills.length > 0) {
    tips.push(`Key strengths for this role: ${matchedSkills.slice(0, 5).join(", ")}`);
  }

  const report: OptimizationReport = {
    jobTitle: parsedJob.title,
    jobCompany: parsedJob.company,
    jobSeniority: parsedJob.seniority,
    jobDomain: parsedJob.domain,
    detectedKeywords: {
      requiredSkills: parsedJob.requiredSkills,
      preferredSkills: parsedJob.preferredSkills,
      responsibilities: parsedJob.responsibilities,
      keywords: parsedJob.keywords,
    },
    matchedSkills,
    missingSkills,
    selectedExperiences,
    rejectedExperiences: plan.rejectedExperiences,
    selectedBullets,
    rejectedBullets: plan.rejectedBullets,
    confidence,
    confidenceReasoning: plan.confidenceReasoning,
    fallbackUsed: plan.fallbackUsed,
    detectedLanguage: parsedJob.language,
    tips,
  };

  log("generateOptimizationReport RESULT", {
    confidence,
    confidenceReasoning: plan.confidenceReasoning,
    fallbackUsed: plan.fallbackUsed,
    matched: matchedSkills.length,
    missing: missingSkills.length,
    selectedExps: selectedExperiences.length,
    rejectedExps: plan.rejectedExperiences.length,
    bullets: selectedBullets.length,
    rejectedBullets: plan.rejectedBullets.length,
  });

  return report;
}
