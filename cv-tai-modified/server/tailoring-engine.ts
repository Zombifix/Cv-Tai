import type OpenAI from "openai";
import type { Experience, Bullet, Skill } from "@shared/schema";

export const MODEL = "gpt-4o-mini";
const BASE_URL = "https://api.openai.com/v1";

function log(step: string, data?: any) {
  const summary = data ? (typeof data === "string" ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500)) : "";
  console.log(`[TAILOR] ${step}${summary ? ": " + summary : ""}`);
}

export function normalizeLinkedInUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try { const url = new URL(rawUrl); if (!url.hostname.includes("linkedin.com")) return rawUrl; const j = url.searchParams.get("currentJobId"); if (j) return `https://www.linkedin.com/jobs/view/${j}`; return rawUrl; } catch { return rawUrl; }
}

export interface LLMHealthResult { provider: string; model: string; baseUrl: string; apiKeyPresent: boolean; success: boolean; rawText: string; responseTimeMs: number; error?: string; }
export async function checkLLMHealth(openai: OpenAI | null): Promise<LLMHealthResult> {
  const r: LLMHealthResult = { provider: "OpenAI", model: MODEL, baseUrl: BASE_URL, apiKeyPresent: !!process.env.OPENAI_API_KEY, success: false, rawText: "", responseTimeMs: 0 };
  if (!openai) { r.error = "OPENAI_API_KEY not set"; return r; }
  const start = Date.now();
  try { const res = await openai.chat.completions.create({ model: MODEL, messages: [{ role: "user", content: "Reply OK" }], max_tokens: 10 }); r.rawText = res.choices[0]?.message?.content || ""; r.success = true; } catch (e: any) { r.error = e.message; }
  r.responseTimeMs = Date.now() - start; return r;
}

// â”€â”€â”€ Shared helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function normalizeSkillKey(s: string): string {
  return s.toLowerCase().replace(/[/\-]/g, " ").replace(/\s+/g, " ").replace(/s$/, "").trim();
}

function cloneStructuredCV(cv: StructuredCV): StructuredCV {
  return {
    ...cv,
    experiences: cv.experiences.map(exp => ({ ...exp, bullets: [...exp.bullets] })),
    skills: [...cv.skills],
    formations: cv.formations.map(f => ({ ...f })),
    languages: cv.languages.map(l => ({ ...l })),
  };
}

function normalizeEvidenceText(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueItems(items: string[]): string[] {
  return [...new Set(items.map(item => item?.trim()).filter(Boolean))];
}

export interface RoleFrame {
  workObjects: string[];
  deliverables: string[];
  decisions: string[];
  collaborators: string[];
  environments: string[];
  scopeSignals: string[];
}

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface ParsedJob {
  title: string; company: string; seniority: string; domain: string;
  requiredSkills: string[]; preferredSkills: string[]; responsibilities: string[];
  keywords: string[]; criticalKeywords: string[]; language: "EN" | "FR";
  intentions: string[];
  positioning: "consultant" | "lead" | "ic" | "manager";
  roleFrame: RoleFrame;
}
export interface ScoredBullet { bullet: Bullet; experience: Experience; deterministicScore: number; llmScore: number; totalScore: number; matchedTags: string[]; matchedKeywords: string[]; dimension: string; }
export interface ScoredExperience { experience: Experience; score: number; reason: string; matchedAspects: string[]; selectedBullets: ScoredBullet[]; charBudget: number; }
export interface CompositionPlan { targetTitle: string; summary: string; sections: { experience: Experience; experienceScore: number; experienceReason: string; bullets: ScoredBullet[]; }[]; relevantSkills: string[]; rejectedBullets: { text: string; score: number; reason: string }[]; rejectedExperiences: { title: string; company: string; score: number; reason: string }[]; }
export interface StructuredCV { name?: string; targetTitle: string; summary: string; experiences: { title: string; company: string; contractType?: string; dates: string; bullets: string[]; description?: string; }[]; skills: string[]; formations: { degree: string; school: string; year?: string }[]; languages: { name: string; level?: string }[]; }

// â”€â”€â”€ Step 1: Parse Job (with intentions + positioning) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function parseJobDescription(jobText: string, openai: OpenAI): Promise<ParsedJob> {
  log("parseJobDescription", `${jobText.length} chars`);
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: `Extract structured info from a job posting. Return JSON:
- title, company, seniority (junior/mid/senior/lead/director), domain
- requiredSkills[], preferredSkills[], responsibilities[]
- keywords[] (10-20 ATS terms: concrete tools, technologies, methodologies â€” max 3 words each, NO soft skills, NO descriptive phrases)
- criticalKeywords[] (5-8 ROLE-DISCRIMINATING must-haves â€” CRITICAL RULE: choose terms that a professional from an ADJACENT but different field would NOT have. Examples:
  * For Product Owner: "Backlog Management", "Sprint Planning", "User Stories", "Roadmap" â€” NOT "User Research" (designers have this too)
  * For Product Designer: "Figma", "Prototyping", "Design System", "Usability Testing" â€” NOT "Stakeholder Management" (POs have this too)
  * For Chef de Projet: "Gestion de projet", "Planning", "Budget", "Reporting" â€” NOT "Product Discovery"
  * For Data Analyst: "SQL", "Python", "Data Viz", "Dashboard" â€” NOT "Analytics" (too generic)
  The goal: if someone with the wrong background reads these 5-8 keywords, they should immediately know they don't qualify.)
- language ("EN"/"FR")
- intentions[] (5-10 phrases: what the role REALLY needs beyond keywords. Ex: "structurer les pratiques design", "influencer les stakeholders", "mesurer l'impact business du design". VERBS + OUTCOMES.)
- positioning: "consultant" (conseil, accompagnement, formation) | "lead" (management, vision, equipe) | "ic" (craft, delivery) | "manager" (people management)
- roleFrame: {
  workObjects[] (3-6 concrete nouns / short phrases for what this role works on daily. Ex: "user flows", "cloud sourcing", "editorial calendar")
  deliverables[] (2-5 outputs produced by the role. Ex: "wireframes", "roadmap", "plan de transformation")
  decisions[] (2-5 decisions / arbitrages expected from the role. Ex: "priorisation produit", "arbitrage UX", "choix de sourcing")
  collaborators[] (2-5 stakeholders or teams. Ex: "PM", "DSI", "marketing", "clients")
  environments[] (2-5 business / technical contexts. Ex: "e-commerce", "banque", "DSI", "retail")
  scopeSignals[] (2-5 scope markers. Ex: "execution", "structuration", "conseil", "management")
}
Important: roleFrame must describe the REAL WORK in the body of the posting, not only the title. If the title is noisy but the body clearly points elsewhere, trust the body.` },
      { role: "user", content: jobText.slice(0, 6000) },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });
  const p = JSON.parse(response.choices[0].message.content || "{}");
  const result: ParsedJob = {
    title: p.title || "Unknown", company: p.company || "Unknown", seniority: p.seniority || "mid",
    domain: p.domain || "General", requiredSkills: p.requiredSkills || [], preferredSkills: p.preferredSkills || [],
    responsibilities: p.responsibilities || [], keywords: p.keywords || [],
    criticalKeywords: p.criticalKeywords || (p.keywords || []).slice(0, 5),
    language: p.language === "FR" ? "FR" : "EN",
    intentions: p.intentions || [],
    positioning: (["consultant", "lead", "ic", "manager"].includes(p.positioning) ? p.positioning : "ic") as any,
    roleFrame: {
      workObjects: uniqueItems(p.roleFrame?.workObjects || []),
      deliverables: uniqueItems(p.roleFrame?.deliverables || []),
      decisions: uniqueItems(p.roleFrame?.decisions || []),
      collaborators: uniqueItems(p.roleFrame?.collaborators || []),
      environments: uniqueItems(p.roleFrame?.environments || [p.domain || ""]),
      scopeSignals: uniqueItems(p.roleFrame?.scopeSignals || [p.positioning || ""]),
    },
  };
  log("parseJobDescription DONE", { title: result.title, positioning: result.positioning, intentions: result.intentions.length, roleFrame: result.roleFrame });
  return result;
}

// â”€â”€â”€ Step 2: Hybrid Score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function inferDimension(tags: string[]): string {
  const t = tags.map(x => x.toLowerCase());
  if (t.some(x => ["impact","chiffres","resultats","metrics","kpi","conversion","revenue"].includes(x))) return "impact";
  if (t.some(x => ["collaboration","stakeholders","equipe","alignement","communication"].includes(x))) return "collaboration";
  if (t.some(x => ["leadership","management","mentorat","recrutement","lead"].includes(x))) return "leadership";
  if (t.some(x => ["methode","process","agile","discovery","research","user-research"].includes(x))) return "methode";
  if (t.some(x => ["deploiement","delivery","lancement","migration","rollout"].includes(x))) return "delivery";
  return "craft";
}

function deterministicScore(bullet: Bullet, experience: Experience, allKw: string[], critKw: string[], intentions: string[]): { score: number; matchedTags: string[]; matchedKeywords: string[] } {
  const tags = (bullet.tags || []).filter(Boolean).map(t => t.toLowerCase());
  const text = bullet.text.toLowerCase();
  const desc = (experience.description || "").toLowerCase();
  const kwLow = allKw.map(k => k.toLowerCase());
  const critLow = critKw.map(k => k.toLowerCase());
  let score = 5;
  const mTags: string[] = []; const mKw: string[] = [];

  for (const tag of tags) { for (const kw of kwLow) { if (tag.includes(kw) || kw.includes(tag) || tag === kw) { score += 8; mTags.push(tag); mKw.push(kw); break; } } }
  for (const ck of critLow) { if (text.includes(ck) || tags.some(t => t.includes(ck) || ck.includes(t))) { score += 6; if (!mKw.includes(ck)) mKw.push(ck); } }
  for (const kw of kwLow) { if (kw.length >= 3 && text.includes(kw) && !mKw.includes(kw)) { score += 5; mKw.push(kw); } }
  // Description context boost
  for (const kw of kwLow) { if (kw.length >= 3 && desc.includes(kw) && !mKw.includes(kw)) { score += 2; } }
  // Intention matching
  for (const intent of intentions) {
    const words = intent.toLowerCase().split(/\s+/).filter(w => w.length >= 4);
    if (words.filter(w => text.includes(w) || tags.some(t => t.includes(w))).length >= 2) score += 4;
  }
  if (tags.length > 0 && !tags.every(t => ["imported","libre","general"].includes(t))) score += 5;
  if (/\d+/.test(bullet.text)) score += 3;
  return { score: Math.min(70, score), matchedTags: [...new Set(mTags)], matchedKeywords: [...new Set(mKw)] };
}

export async function hybridScoreAllBullets(parsedJob: ParsedJob, allExps: Experience[], allBullets: Bullet[], openai: OpenAI): Promise<ScoredBullet[]> {
  log("hybridScore", `${allBullets.length} bullets, ${allExps.length} exps`);
  if (allBullets.length === 0) return [];
  const expMap = new Map(allExps.map(e => [e.id, e]));
  const allKw = [...parsedJob.keywords, ...parsedJob.requiredSkills, ...parsedJob.preferredSkills];

  const scored = allBullets.map(b => {
    const exp = expMap.get(b.experienceId);
    if (!exp) return null;
    const det = deterministicScore(b, exp, allKw, parsedJob.criticalKeywords, parsedJob.intentions);
    return { bullet: b, experience: exp, deterministicScore: det.score, llmScore: 0, totalScore: det.score, matchedTags: det.matchedTags, matchedKeywords: det.matchedKeywords, dimension: inferDimension((b.tags || []).filter(Boolean)) } as ScoredBullet;
  }).filter(Boolean) as ScoredBullet[];

  const toScore = scored.length <= 30 ? scored : [...scored].sort((a, b) => b.deterministicScore - a.deterministicScore).slice(0, 30);
  if (toScore.length > 0) {
    const list = toScore.map((sb, i) => `[${i}] (${sb.experience.title} @ ${sb.experience.company}): ${sb.bullet.text}${(sb.bullet.tags||[]).length ? ` [${(sb.bullet.tags||[]).join(",")}]` : ""}`).join("\n");
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: `Score each CV bullet 0-50 for relevance to the target job. Consider:
1. Direct skill match 2. Transferable competencies 3. Impact/metrics 4. Seniority alignment
5. POSITIONING: this is a ${parsedJob.positioning} role. Bullets showing ${parsedJob.positioning === "consultant" ? "accompagnement, structuration, formation, conseil" : parsedJob.positioning === "lead" ? "vision, leadership, strategie" : "delivery, craft, conception"} score HIGHER.
6. Intent match: the job needs someone who can: ${parsedJob.intentions.slice(0, 5).join("; ")}
Score generously for bullets matching the SPIRIT of the role.` },
          { role: "user", content: `Target: "${parsedJob.title}" at "${parsedJob.company}" (${parsedJob.domain})\nRequired: ${parsedJob.requiredSkills.join(", ")}\nResponsibilities: ${parsedJob.responsibilities.slice(0,5).join(", ")}\n\nBullets:\n${list}\n\nReturn JSON: {"scores": [{"index": 0, "score": 0-50}]}` },
        ],
        response_format: { type: "json_object" }, temperature: 0,
      });
      const r = JSON.parse(res.choices[0].message.content || "{}");
      for (const s of (r.scores || [])) { if (s.index >= 0 && s.index < toScore.length) { toScore[s.index].llmScore = Math.min(50, s.score || 0); toScore[s.index].totalScore = toScore[s.index].deterministicScore + toScore[s.index].llmScore; } }
    } catch (e: any) { log("hybridScore LLM failed", e.message); }
  }
  scored.sort((a, b) => b.totalScore - a.totalScore);
  log("hybridScore DONE", scored.slice(0, 5).map(s => ({ s: s.totalScore, c: s.experience.company, t: s.bullet.text.slice(0, 50) })));
  return scored;
}

// â”€â”€â”€ Step 3: Budget Allocator (pertinence-weighted) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface BudgetAlloc { experience: Experience; charBudget: number; maxBullets: number; importance: "critical" | "standard" | "minimal"; }

export function allocateCharBudget(exps: Experience[], scored: ScoredBullet[], totalChars: number): BudgetAlloc[] {
  const OVERHEAD = 500; const EXP_HEADER = 80;
  const pool = totalChars - OVERHEAD - exps.length * EXP_HEADER;
  const sorted = [...exps].sort((a, b) => { const dA = a.endDate ? new Date(a.endDate).getTime() : Date.now(); const dB = b.endDate ? new Date(b.endDate).getTime() : Date.now(); return dB - dA; });

  const expData = sorted.map(exp => {
    const bullets = scored.filter(sb => sb.experience.id === exp.id);
    const avg = bullets.length > 0 ? bullets.reduce((s, b) => s + b.totalScore, 0) / bullets.length : 0;
    const best = bullets.length > 0 ? Math.max(...bullets.map(b => b.totalScore)) : 0;
    const strongBullets = bullets.filter(b => b.totalScore >= 30).length;
    const end = exp.endDate ? new Date(exp.endDate) : new Date();
    const years = (Date.now() - end.getTime()) / (365.25 * 24 * 3600 * 1000);
    const recency = years <= 1 ? 1.5 : years <= 3 ? 1.2 : years <= 5 ? 1.0 : 0.7;
    const pertinence = (best * 0.4 + avg * 0.3 + strongBullets * 8 * 0.3);
    const minScore = years <= 5 ? 10 : 2;
    return { exp, score: Math.max(minScore, pertinence * recency), years, bulletCount: bullets.length, strongBullets };
  });

  // Budget mode: compact (â‰¤2000) = impact only, standard (2001-3000) = balanced, rich (>3000) = storytelling
  const budgetMode: "compact" | "standard" | "rich" = totalChars <= 2000 ? "compact" : totalChars <= 3000 ? "standard" : "rich";

  const totalScore = expData.reduce((s, e) => s + e.score, 0);
  return expData.map(ed => {
    const prop = ed.score / totalScore;
    let budget = Math.round(pool * prop);
    const minBudget = ed.years <= 5 ? 250 : 120;
    budget = Math.max(minBudget, Math.min(Math.round(pool * 0.4), budget));

    // Adaptive maxBullets: compact = impact bullets only, rich = allow storytelling
    let maxB: number;
    if (budgetMode === "compact") {
      // Only strong bullets (score â‰¥ 30 or has numbers)
      maxB = Math.max(1, Math.min(ed.strongBullets, Math.floor(budget / 120)));
    } else if (budgetMode === "rich") {
      // Allow more bullets including context/storytelling
      maxB = Math.max(1, Math.min(Math.max(ed.bulletCount, 2), Math.floor(budget / 80)));
    } else {
      maxB = Math.max(1, Math.min(Math.max(ed.strongBullets, 1), Math.floor(budget / 100)));
    }

    const imp: "critical" | "standard" | "minimal" = ed.score > totalScore * 0.2 ? "critical" : ed.years > 6 ? "minimal" : "standard";
    return { experience: ed.exp, charBudget: budget, maxBullets: maxB, importance: imp };
  });
}

// â”€â”€â”€ Narrative dedup helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-zÃ Ã¢Ã§Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Ã±Ã¦Å“0-9]/g, " ").split(/\s+/).filter(w => w.length >= 4));
}
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter(w => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function tokenizeNormalized(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter(w => w.length >= 4),
  );
}

// â”€â”€â”€ Step 4: Select & Deduplicate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function selectBullets(scored: ScoredBullet[], allocs: BudgetAlloc[]): ScoredExperience[] {
  const dimCounts = new Map<string, number>();
  // First pass: select per experience
  const result = allocs.map(alloc => {
    const bullets = scored.filter(sb => sb.experience.id === alloc.experience.id).sort((a, b) => b.totalScore - a.totalScore);
    const sel: ScoredBullet[] = []; let chars = 0;
    for (const sb of bullets) {
      if (sel.length >= alloc.maxBullets) break;
      if (chars + sb.bullet.text.length > alloc.charBudget && sel.length > 0) break;
      const dc = dimCounts.get(sb.dimension) || 0;
      if (dc >= 2 && sb.totalScore < 40) continue;
      sel.push(sb); chars += sb.bullet.text.length;
      dimCounts.set(sb.dimension, dc + 1);
    }
    const avg = sel.length > 0 ? sel.reduce((s, b) => s + b.totalScore, 0) / sel.length : 0;
    return { experience: alloc.experience, score: avg, reason: alloc.importance === "critical" ? "Highly relevant" : alloc.importance === "minimal" ? "Timeline continuity" : "Relevant", matchedAspects: [...new Set(sel.flatMap(sb => sb.matchedKeywords))], selectedBullets: sel, charBudget: alloc.charBudget };
  });

  // Second pass: cross-experience narrative dedup (Jaccard > 0.45 = too similar)
  const seenTokens: Set<string>[] = [];
  for (const se of result) {
    se.selectedBullets = se.selectedBullets.filter(sb => {
      const tokens = tokenizeNormalized(sb.bullet.text);
      const tooSimilar = seenTokens.some(prev => jaccardSimilarity(prev, tokens) > 0.45);
      if (!tooSimilar) seenTokens.push(tokens);
      return !tooSimilar;
    });
  }
  return result;
}

// â”€â”€â”€ Step 5: Build Structured CV (adaptive) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function buildStructuredCV(job: ParsedJob, selExps: ScoredExperience[], skills: Skill[], mode: string, openai: OpenAI, extras?: { profileName?: string; profileTitle?: string; profileSummary?: string; formations?: any[]; languages?: any[] }): Promise<StructuredCV> {
  const allKw = [...job.requiredSkills, ...job.preferredSkills, ...job.keywords].map(k => k.toLowerCase());
  const allTags = selExps.flatMap(se => se.selectedBullets.flatMap(sb => (sb.bullet.tags || []).filter(Boolean).map(t => t.toLowerCase())));
  const relSkills = skills.filter(s => { const sl = s.name.toLowerCase(); return allKw.some(k => k.includes(sl) || sl.includes(k)) || allTags.some(t => t.includes(sl) || sl.includes(t)); }).map(s => s.name).slice(0, 12);
  const seen = new Set<string>(); const dedupSkills = relSkills.filter(s => { const l = normalizeSkillKey(s); if (seen.has(l)) return false; seen.add(l); return true; });

  let summary = extras?.profileSummary || "";
  const topExps = selExps.filter(se => se.selectedBullets.length > 0).slice(0, 3);
  const posGuide: Record<string, string> = {
    consultant: "Emphasize: conseil, accompagnement, structuration des pratiques, montee en maturite design.",
    lead: "Emphasize: vision, leadership, team building, design strategy.",
    ic: "Emphasize: craft, delivery, impact, technical expertise.",
    manager: "Emphasize: people management, hiring, org design.",
  };
  if (topExps.length > 0) {
    try {
      const res = await openai.chat.completions.create({ model: MODEL, messages: [
        { role: "system", content: `Write a 2-3 sentence CV summary. Max 45 words. No first person. ${posGuide[job.positioning]} ${job.language === "FR" ? "In French." : "In English."} IMPORTANT: Only reference companies listed in the experiences below. Do not invent metrics, achievements, or projects not explicitly mentioned in the provided context. Write in flowing prose only; do NOT use labels like "Competences:" or "Skills:" in the text.` },
        { role: "user", content: `Target: "${job.title}" at "${job.company}" (${job.domain})\nPositioning: ${job.positioning}\n${extras?.profileSummary ? `Bio: ${extras.profileSummary}\n` : ""}Exps: ${topExps.map(se => `${se.experience.title} at ${se.experience.company}`).join(", ")}\nSkills: ${dedupSkills.slice(0,6).join(", ")}\nRequired: ${job.requiredSkills.slice(0,5).join(", ")}\nIntentions: ${job.intentions.slice(0,3).join("; ")}` },
      ], temperature: 0 });
      summary = (res.choices[0].message.content || summary).trim();
    } catch (e: any) {
      log("summary LLM failed - deterministic fallback", e.message);
      if (!summary) {
        const expStr = topExps.slice(0, 2).map(se => `${se.experience.title} chez ${se.experience.company}`).join(", ");
        const skillStr = dedupSkills.slice(0, 3).join(", ");
        summary = job.language === "FR"
          ? `Profil ${job.title} avec experience en ${expStr}${skillStr ? `. Competences : ${skillStr}` : ""}.`
          : `${job.title} profile with experience at ${expStr}${skillStr ? `. Skills: ${skillStr}` : ""}.`;
      }
    }
  }

  const fmtDate = (d: string | null | undefined, lang: string) => { if (!d) return "Present"; try { return new Date(d).toLocaleDateString(lang === "FR" ? "fr-FR" : "en-US", { month: "short", year: "numeric" }); } catch { return d; } };
  return {
    name: extras?.profileName || undefined, targetTitle: job.title, summary,
    experiences: selExps.map(se => ({ title: se.experience.title, company: se.experience.company, contractType: (se.experience as any).contractType || undefined, dates: `${fmtDate(se.experience.startDate, job.language)} - ${fmtDate(se.experience.endDate, job.language)}`, bullets: se.selectedBullets.map(sb => sb.bullet.text), description: se.experience.description || undefined })),
    skills: dedupSkills,
    formations: (extras?.formations || []).map((f: any) => ({ degree: f.degree, school: f.school, year: f.year })),
    languages: (extras?.languages || []).map((l: any) => ({ name: l.name, level: l.level })),
  };
}

// â”€â”€â”€ Step 6: Reformulate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function reformulateBullets(cv: StructuredCV, job: ParsedJob, openai: OpenAI): Promise<StructuredCV> {
  const all = cv.experiences.flatMap((exp, ei) => exp.bullets.map((b, bi) => ({ ei, bi, text: b, ctx: `${exp.title} @ ${exp.company}`, desc: exp.description ? exp.description.slice(0, 150) : "" })));
  if (all.length === 0) return cv;
  const list = all.map((b, i) => `[${i}] (${b.ctx}${b.desc ? ` | context: ${b.desc}` : ""}): ${b.text}`).join("\n");
  const lang = job.language === "FR" ? "Reformule en francais." : "Reformulate in English.";
  try {
    const res = await openai.chat.completions.create({ model: MODEL, messages: [
      { role: "system", content: `CV optimization. Reformulate bullets:\n1. Embed keywords naturally: ${job.criticalKeywords.join(", ")}\n2. Start with an action verb\n3. NO invention; only use information present in the bullet or its context\n4. Preserve proper nouns, brand names, and specific numbers exactly\n5. Do NOT change the nature of activities: "tests utilisateurs" is not "A/B testing", and "interviews" is not "surveys"\n6. If a bullet already starts with an action verb and is <=160 chars, return it unchanged\n7. Max 200 chars\n8. ${lang}\n9. ${job.positioning} role: ${job.positioning === "consultant" ? "emphasize accompagnement, structuration, impact on teams" : job.positioning === "lead" ? "emphasize vision, leadership" : "emphasize delivery, results"}` },
      { role: "user", content: `Target: "${job.title}" at "${job.company}"\nKeywords: ${job.keywords.slice(0,10).join(", ")}\nIntentions: ${job.intentions.slice(0,3).join("; ")}\n\nBullets (with experience context when available):\n${list}\n\nReturn JSON: {"bullets": [{"index": 0, "text": "..."}]}` },
    ], response_format: { type: "json_object" }, temperature: 0.2 });
    const r = JSON.parse(res.choices[0].message.content || "{}");
    for (const rb of (r.bullets || [])) { if (rb.index >= 0 && rb.index < all.length && rb.text?.length > 10) { cv.experiences[all[rb.index].ei].bullets[all[rb.index].bi] = rb.text; } }
  } catch (e: any) { log("reformulate FAILED", e.message); }
  return cv;
}

// â”€â”€â”€ Step 7: Post Rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface PostRuleResult {
  keywordsCovered: string[];
  keywordsMissing: string[];
  evidenceKeywordsCovered: string[];
  evidenceKeywordsMissing: string[];
  injectedKeywords: string[];
  longBullets: number;
  bulletsWithNumbers: number;
  totalBullets: number;
  rulesApplied: string[];
}
export function applyPostRules(cv: StructuredCV, job: ParsedJob): PostRuleResult {
  const rules: string[] = [];
  const initialText = [cv.summary, ...cv.experiences.flatMap(e => e.bullets), cv.skills.join(" ")].join(" ").toLowerCase();
  const missingBeforeInjection = job.criticalKeywords.filter(kw => !initialText.includes(kw.toLowerCase()));
  const evidenceCovered = job.criticalKeywords.filter(kw => initialText.includes(kw.toLowerCase()));
  const isSkillLike = (kw: string) =>
    kw.length <= 35 &&
    kw.split(/\s+/).length <= 3 &&
    !/\d+\+?\s*years?/i.test(kw) &&
    !/\b(experience|communication|portfolio|environments?|solution|quality|skills?|management|ability|knowledge|insights?|fidelity|deliverables?|approaches?|practices?|iterative|exceptional|strong|proven|thinking|mindset|oriented)\b/i.test(kw);
  const injectedKeywords: string[] = [];
  for (const kw of missingBeforeInjection) {
    if (isSkillLike(kw) && !cv.skills.some(s => normalizeSkillKey(s) === normalizeSkillKey(kw))) {
      cv.skills.push(kw);
      injectedKeywords.push(kw);
      rules.push(`Injected "${kw}" into skills`);
    }
  }
  let longCount = 0;
  for (const exp of cv.experiences) { for (let i = 0; i < exp.bullets.length; i++) { if (exp.bullets[i].length > 200) { exp.bullets[i] = exp.bullets[i].slice(0, 200).replace(/[,;]?\s*\S*$/, ""); longCount++; rules.push(`Truncated bullet in ${exp.company}`); } } }
  const total = cv.experiences.reduce((s, e) => s + e.bullets.length, 0);
  const withNums = cv.experiences.reduce((s, e) => s + e.bullets.filter(b => /\d+/.test(b)).length, 0);
  const finalText = [cv.summary, ...cv.experiences.flatMap(e => e.bullets), cv.skills.join(" ")].join(" ").toLowerCase();
  const covered: string[] = []; const missing: string[] = [];
  for (const kw of job.criticalKeywords) { (finalText.includes(kw.toLowerCase()) ? covered : missing).push(kw); }
  return {
    keywordsCovered: covered,
    keywordsMissing: missing,
    evidenceKeywordsCovered: evidenceCovered,
    evidenceKeywordsMissing: missingBeforeInjection,
    injectedKeywords,
    longBullets: longCount,
    bulletsWithNumbers: withNums,
    totalBullets: total,
    rulesApplied: rules,
  };
}

// â”€â”€â”€ Step 8: Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function renderCVText(cv: StructuredCV, job: ParsedJob): string {
  const fr = job.language === "FR"; const l: string[] = [];
  if (cv.name) l.push(cv.name);
  l.push(cv.targetTitle, "");
  if (cv.summary) { l.push(fr ? "RESUME PROFESSIONNEL" : "PROFESSIONAL SUMMARY"); l.push(cv.summary, ""); }
  l.push(fr ? "EXPERIENCE PROFESSIONNELLE" : "EXPERIENCE", "");
  for (const exp of cv.experiences) { const ct = exp.contractType ? ` (${exp.contractType})` : ""; l.push(`${exp.title} | ${exp.company}${ct}`); l.push(exp.dates); for (const b of exp.bullets) l.push(`- ${b}`); l.push(""); }
  if (cv.skills.length) { l.push(`${fr ? "COMPETENCES" : "SKILLS"}: ${cv.skills.join(" | ")}`); l.push(""); }
  if (cv.formations.length) { l.push(fr ? "FORMATION" : "EDUCATION"); for (const f of cv.formations) l.push(`${f.degree} - ${f.school}${f.year ? ` (${f.year})` : ""}`); l.push(""); }
  if (cv.languages.length) { l.push(fr ? "LANGUES" : "LANGUAGES"); for (const la of cv.languages) l.push(`${la.name}${la.level ? ` - ${la.level}` : ""}`); }
  return l.join("\n").trim();
}

// â”€â”€â”€ Report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type PrimaryDiagnosis =
  | "Bon alignement global"
  | "Mismatch de metier"
  | "Competences metier critiques absentes"
  | "Experience proche mais preuves trop faibles"
  | "Bibliotheque insuffisamment detaillee";

export type RecruiterCredibility = "forte" | "correcte" | "fragile" | "faible";

export type DiagnosisCause =
  | "job_parsing_issue"
  | "library_too_thin"
  | "bullets_too_generic"
  | "mission_context_too_weak"
  | "evidence_vs_ats_gap"
  | "scoring_calibration_gap";

export interface DiagnosticSummary {
  primaryDiagnosis: PrimaryDiagnosis;
  verdict: string;
  whatMatches: string[];
  whatMissing: string[];
  nextActions: string[];
  primaryCause: DiagnosisCause;
  secondaryCauses: DiagnosisCause[];
  recommendedAction: string;
}

export interface OptimizationReport { jobTitle: string; jobCompany: string; jobSeniority: string; jobDomain: string; detectedKeywords: { requiredSkills: string[]; preferredSkills: string[]; responsibilities: string[]; keywords: string[]; criticalKeywords: string[]; }; matchedSkills: string[]; missingSkills: string[]; selectedExperiences: { title: string; company: string; score: number; reason: string; matchedAspects: string[]; bulletCount: number; charBudget: number; }[]; rejectedExperiences: { title: string; company: string; score: number; reason: string }[]; selectedBullets: { text: string; experienceTitle: string; score: number; deterministicScore: number; llmScore: number; matchedKeywords: string[]; dimension: string; }[]; postRules: PostRuleResult; confidence: number; confidenceReasoning: string; fallbackUsed: boolean; detectedLanguage: "EN" | "FR"; positioning: string; intentions: string[]; tips: string[]; diagnosis: DiagnosticSummary; scoreBreakdown: { fitOffer: number; ats: number; atsOptimized: number; atsBoost: number; contextSupport: number; semantic: number; recruiterCredibility: RecruiterCredibility; domainMismatch?: string; cappedByKeywords: boolean; cappedByEvidence: boolean; }; }

function topItems(items: string[], count: number): string[] {
  const tally = new Map<string, number>();
  for (const item of items.filter(Boolean)) tally.set(item, (tally.get(item) || 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, count).map(([item]) => item);
}

function joinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} et ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

function collectMissionContextSupport(selExps: ScoredExperience[], criticalKeywords: string[], directKeywords: string[]): { contextKeywords: string[]; contextOnlyKeywords: string[] } {
  const descText = selExps.map(se => se.experience.description || "").join(" ").toLowerCase();
  if (!descText.trim() || criticalKeywords.length === 0) return { contextKeywords: [], contextOnlyKeywords: [] };
  const directSet = new Set(directKeywords.map(k => k.toLowerCase()));
  const contextKeywords = criticalKeywords.filter(kw => descText.includes(kw.toLowerCase()));
  const contextOnlyKeywords = contextKeywords.filter(kw => !directSet.has(kw.toLowerCase()));
  return { contextKeywords, contextOnlyKeywords };
}

function getEvidenceProgressiveCap(evidenceScore: number, criticalKeywordCount: number): number {
  if (criticalKeywordCount < 4) return 100;
  if (evidenceScore <= 10) return 28;
  if (evidenceScore <= 20) return 36;
  if (evidenceScore < 25) return 40;
  if (evidenceScore < 35) return 48;
  if (evidenceScore < 45) return 58;
  return 100;
}

function getAtsGapCap(atsBoost: number, fitBase: number, evidenceScore: number): number {
  if (atsBoost < 15 || fitBase >= 55) return 100;
  if (atsBoost >= 35 && evidenceScore < 25) return 45;
  if (atsBoost >= 25 && evidenceScore < 35) return 52;
  if (atsBoost >= 20 && evidenceScore < 45) return 60;
  return 100;
}

function getRecruiterCredibility(params: {
  fitOffer: number;
  evidenceScore: number;
  semanticScore: number;
  domainMismatch?: string;
  evidenceGapIsHigh: boolean;
  libraryLooksThin: boolean;
  evidenceIsWeak: boolean;
}): RecruiterCredibility {
  const { fitOffer, evidenceScore, semanticScore, domainMismatch, evidenceGapIsHigh, libraryLooksThin, evidenceIsWeak } = params;
  if (domainMismatch || fitOffer < 35 || (evidenceGapIsHigh && evidenceScore < 35)) return "faible";
  if (fitOffer < 50 || libraryLooksThin || evidenceIsWeak || evidenceGapIsHigh) return "fragile";
  if (fitOffer < 70 || semanticScore < 70) return "correcte";
  return "forte";
}

function rankDiagnosisCauses(params: {
  job: ParsedJob;
  selExps: ScoredExperience[];
  fitOffer: number;
  legacyConfidence: number;
  evidenceScore: number;
  atsOptimized: number;
  atsBoost: number;
  semanticScore: number;
  contextSupport: number;
  libraryLooksThin: boolean;
  evidenceIsWeak: boolean;
  domainMismatch?: string;
}): DiagnosisCause[] {
  const { job, selExps, fitOffer, legacyConfidence, evidenceScore, atsOptimized, atsBoost, semanticScore, contextSupport, libraryLooksThin, evidenceIsWeak, domainMismatch } = params;
  const ranked: DiagnosisCause[] = [];
  const roleFrameItems = [
    ...job.roleFrame.workObjects,
    ...job.roleFrame.deliverables,
    ...job.roleFrame.decisions,
    ...job.roleFrame.collaborators,
    ...job.roleFrame.environments,
  ].filter(Boolean);
  const genericSignals = ["communication", "collaboration", "management", "strategie", "strategy", "business", "digital", "transformation", "project", "process", "operations", "delivery"];
  const genericRoleFrameCount = roleFrameItems.filter(item => {
    const normalized = normalizeEvidenceText(item);
    return genericSignals.some(signal => normalized.includes(signal));
  }).length;
  const parsingLooksWeak = (job.responsibilities.length >= 4 && roleFrameItems.length < 4)
    || (roleFrameItems.length > 0 && genericRoleFrameCount >= Math.ceil(roleFrameItems.length * 0.7))
    || job.criticalKeywords.some(keyword => normalizeEvidenceText(keyword).split(" ").length > 4);
  const descriptionsPresent = selExps.filter(se => normalizeEvidenceText(se.experience.description || "").split(" ").filter(Boolean).length >= 6).length;
  const missionContextTooWeak = descriptionsPresent >= 2 && contextSupport === 0 && evidenceScore < 45;
  const evidenceVsAtsGap = atsOptimized >= 70 && fitOffer < 45 && atsBoost >= 20;
  const bulletsTooGeneric = !libraryLooksThin && !domainMismatch && semanticScore >= 55 && evidenceScore < 45;
  const calibrationGap = Math.abs(legacyConfidence - fitOffer) >= 18;

  if (evidenceVsAtsGap) ranked.push("evidence_vs_ats_gap");
  if (libraryLooksThin) ranked.push("library_too_thin");
  if (bulletsTooGeneric || evidenceIsWeak) ranked.push("bullets_too_generic");
  if (missionContextTooWeak) ranked.push("mission_context_too_weak");
  if (parsingLooksWeak) ranked.push("job_parsing_issue");
  if (calibrationGap) ranked.push("scoring_calibration_gap");
  return uniqueItems(ranked) as DiagnosisCause[];
}

function recommendedActionForCause(cause: DiagnosisCause, fallback: string): string {
  switch (cause) {
    case "job_parsing_issue":
      return "Verifie l'annonce brute: si les mots-cles ou le role reel sont bruites, relance avec un texte plus propre ou corrige la source.";
    case "library_too_thin":
      return "Enrichis 1 ou 2 experiences proches avec 3 a 5 bullets concrets avant de retenter le tailoring.";
    case "bullets_too_generic":
      return "Rends 2 ou 3 bullets plus probants avec objets metier, scope, decisions et impact concret.";
    case "mission_context_too_weak":
      return "Reecris le contexte mission avec plus d'objets, livrables et contraintes pour aider le moteur sans surpromettre.";
    case "evidence_vs_ats_gap":
      return "Considere le CV comme ATS-compatible mais encore peu credible: ajoute des preuves reellement ancrees avant d'augmenter le score.";
    case "scoring_calibration_gap":
      return "Compare le fit offre et l'ATS plutot que le score legacy: si l'ecart persiste, il faut recalibrer le moteur plutot que le CV.";
    default:
      return fallback;
  }
}

export function generateOptimizationReport(job: ParsedJob, selExps: ScoredExperience[], skills: Skill[], postRules: PostRuleResult, cv: StructuredCV): OptimizationReport {
  const allBullets = selExps.flatMap(se => se.selectedBullets);
  const total = allBullets.length;
  const allJobSkills = [...job.requiredSkills, ...job.preferredSkills].map(s => s.toLowerCase());
  const matched = skills.filter(s => allJobSkills.some(js => js.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(js)));
  const missingSkills = allJobSkills.filter(js => !skills.some(s => s.name.toLowerCase().includes(js) || js.includes(s.name.toLowerCase())));
  const avg = total > 0 ? Math.round(allBullets.reduce((s, b) => s + b.totalScore, 0) / total) : 0;
  const atsOptimized = job.criticalKeywords.length > 0 ? Math.round(postRules.keywordsCovered.length / job.criticalKeywords.length * 100) : 50;
  const atsEvidence = job.criticalKeywords.length > 0 ? Math.round(postRules.evidenceKeywordsCovered.length / job.criticalKeywords.length * 100) : 50;
  const atsBoost = Math.max(0, atsOptimized - atsEvidence);
  const missionContextSupport = collectMissionContextSupport(selExps, job.criticalKeywords, postRules.evidenceKeywordsCovered);
  const contextSupport = job.criticalKeywords.length > 0 ? Math.round(missionContextSupport.contextOnlyKeywords.length / job.criticalKeywords.length * 100) : 0;
  const weightedEvidenceCount = postRules.evidenceKeywordsCovered.length + missionContextSupport.contextOnlyKeywords.length * 0.5;
  const evidenceScore = job.criticalKeywords.length > 0 ? Math.round(weightedEvidenceCount / job.criticalKeywords.length * 100) : atsEvidence;
  // Confidence should reflect what the source library really proves, with mission context as a secondary signal only.
  const semanticScore = Math.min(100, Math.round(avg * 100 / 120));
  const bulletBonus = total >= 6 ? Math.min(10, Math.round(evidenceScore * 0.1)) : Math.round(total * 1.5);
  const fitBase = Math.min(100, Math.round(semanticScore * 0.45 + evidenceScore * 0.45 + bulletBonus));
  const rawConfidence = Math.round(avg * 0.45 + evidenceScore * 0.45 + bulletBonus);
  // Hard cap: if less than 25% of critical keywords are present in the CV, it's a weak match regardless of bullet quality.
  // This catches cases where the profile domain is fundamentally different from the job (e.g. Designer â†’ PO).
  const critKwHardCap = getEvidenceProgressiveCap(evidenceScore, job.criticalKeywords.length);
  const evidenceGapIsHigh = atsBoost >= 25 && evidenceScore <= 50;
  const evidenceGapHardCap = getAtsGapCap(atsBoost, fitBase, evidenceScore);
  const fitOffer = Math.min(critKwHardCap, evidenceGapHardCap, fitBase);
  const confidence = Math.min(critKwHardCap, evidenceGapHardCap, Math.min(100, rawConfidence));
  const tips: string[] = [];
  if (postRules.evidenceKeywordsMissing.length) tips.push(`Keywords critiques non prouvees dans la bibliotheque: ${postRules.evidenceKeywordsMissing.join(", ")}.`);
  if (missionContextSupport.contextOnlyKeywords.length > 0) tips.push(`Le contexte mission renforce ${joinNatural(missionContextSupport.contextOnlyKeywords.slice(0, 3))}, mais ces elements restent secondaires tant qu'ils ne sont pas explicites dans les bullets ou skills source.`);
  if (atsBoost > 0) tips.push(`Le CV final gagne ${atsBoost}% de couverture ATS via optimisation de texte, mais cela ne remplace pas une preuve metier dans les bullets ou skills source.`);
  if (postRules.bulletsWithNumbers < total * 0.3) tips.push("Moins de 30% de tes bullets contiennent des chiffres.");
  if (missingSkills.length > 3) tips.push(`${missingSkills.length} competences demandees absentes.`);
  if (job.positioning === "consultant" && !allBullets.some(b => /accompagn|structur|pratiqu|form|maturit|conseil/i.test(b.bullet.text))) {
    tips.push("Offre conseil : aucun bullet ne mentionne accompagnement ou structuration de pratiques.");
  }

  // Role mismatch detection
  const jobTitleLow = job.title.toLowerCase();
  const isPOJob = /\bproduct owner\b|\bpo\b|\bchef de produit\b|\bscrum master\b|\bproduct manager\b|\bpm\b/.test(jobTitleLow);
  const isDesignJob = /\bdesigner\b|\bux\b|\bui\b|\bdesign\b/.test(jobTitleLow);
  const userIsDesigner = allBullets.some(b => /figma|maquett|prototype|design system|ux|ui|parcours|wireframe/i.test(b.bullet.text));
  const userIsPO = allBullets.some(b => /backlog|sprint|user stor|roadmap|priorisation|epic|okr/i.test(b.bullet.text));

  if (isPOJob && userIsDesigner && !userIsPO) {
    tips.push("Attention : ce poste est Product Owner/PM. Tes bullets sont orientes design. Le match est partiel, mais la gestion de backlog est absente.");
  }
  if (isDesignJob && userIsPO && !userIsDesigner) {
    tips.push("Attention : ce poste est Design mais tes bullets sont orientÃ©s Product/PO. Le match UX craft est limitÃ©.");
  }

  const domainMismatch = isPOJob && userIsDesigner && !userIsPO ? "PO/PM vs Designer"
    : isDesignJob && userIsPO && !userIsDesigner ? "Designer vs PO"
    : undefined;
  const cappedByKeywords = critKwHardCap < 100 && rawConfidence > critKwHardCap;
  const cappedByEvidence = evidenceGapHardCap < 100 && rawConfidence > evidenceGapHardCap;
  const topMatchedAspects = topItems(selExps.flatMap(se => se.matchedAspects), 3);
  const supportedKeywordSet = new Set([...postRules.evidenceKeywordsCovered, ...missionContextSupport.contextKeywords].map(kw => kw.toLowerCase()));
  const topMissingKeywords = job.criticalKeywords.filter(kw => !supportedKeywordSet.has(kw.toLowerCase())).slice(0, 3);
  const evidenceIsWeak = total > 0 && postRules.bulletsWithNumbers < Math.max(1, Math.ceil(total * 0.3));
  const libraryLooksThin = total < 4 || selExps.filter(se => se.selectedBullets.length > 0).length <= 1;

  const whatMatches: string[] = [];
  if (topMatchedAspects.length > 0) {
    whatMatches.push(`Tes experiences selectionnees couvrent deja ${joinNatural(topMatchedAspects)}.`);
  }
  if (semanticScore >= 65) {
    whatMatches.push("Plusieurs bullets racontent deja un scope proche du role vise, meme sans reprendre tous les mots-cles.");
  }
  if (postRules.bulletsWithNumbers > 0) {
    whatMatches.push(`${postRules.bulletsWithNumbers} bullet${postRules.bulletsWithNumbers > 1 ? "s" : ""} apportent deja une preuve concrete ou chiffree.`);
  }
  if (whatMatches.length === 0 && total > 0) {
    whatMatches.push("Le moteur a trouve quelques experiences pertinentes a reutiliser pour cette annonce.");
  }

  const whatMissing: string[] = [];
  if (domainMismatch === "PO/PM vs Designer") {
    whatMissing.push("Tes bullets montrent surtout du design craft, pas assez de pilotage produit, backlog ou priorisation.");
  } else if (domainMismatch === "Designer vs PO") {
    whatMissing.push("Tes bullets montrent surtout du pilotage produit, pas assez de craft UX/UI ou de design execution.");
  }
  if (topMissingKeywords.length > 0) {
    whatMissing.push(`Les competences metier critiques ${joinNatural(topMissingKeywords)} ne ressortent pas assez dans le CV genere.`);
  }
  if (evidenceGapIsHigh) {
    whatMissing.push("Le CV final reprend mieux le vocabulaire de l'annonce que ce que ta bibliotheque prouve reellement aujourd'hui.");
  }
  if (evidenceIsWeak) {
    whatMissing.push("Le fond est proche, mais les bullets retenus manquent encore de preuves concretes : scope, chiffres ou avant/apres.");
  }
  if (libraryLooksThin) {
    whatMissing.push("La bibliotheque actuelle donne peu de matiere vraiment exploitable pour cette annonce.");
  }

  let primaryDiagnosis: PrimaryDiagnosis;
  let verdict: string;
  if (domainMismatch) {
    primaryDiagnosis = "Mismatch de metier";
    verdict = "Profil adjacent : une partie de ton experience se transfere, mais le coeur du role demande est different.";
  } else if (cappedByKeywords || cappedByEvidence || evidenceScore < 40 || topMissingKeywords.length >= 2) {
    primaryDiagnosis = "Competences metier critiques absentes";
    verdict = evidenceGapIsHigh
      ? "Match fragile : le CV final couvre mieux les mots-cles de l'annonce que ce que ta bibliotheque prouve reellement."
      : "Match partiel : le fond peut coller, mais les competences metier cles de l'annonce ne ressortent pas assez dans ton CV.";
  } else if (libraryLooksThin) {
    primaryDiagnosis = "Bibliotheque insuffisamment detaillee";
    verdict = "Match difficile a juger : ta bibliotheque actuelle ne donne pas encore assez de matiere solide pour cette annonce.";
  } else if (evidenceIsWeak || semanticScore < 65) {
    primaryDiagnosis = "Experience proche mais preuves trop faibles";
    verdict = "Experience proche, mais pas encore assez prouvee dans les bullets retenus.";
  } else {
    primaryDiagnosis = "Bon alignement global";
    verdict = "Bon alignement global : ton profil colle deja bien a cette annonce.";
  }

  const nextActions: string[] = [];
  if (primaryDiagnosis === "Mismatch de metier") {
    if (jobTitleLow.includes("product")) nextActions.push("Ajoute des bullets ancres dans backlog, roadmap, priorisation ou delivery produit.");
    else nextActions.push(`Ajoute des bullets ancres dans ${joinNatural(job.criticalKeywords.slice(0, 3)) || "les attendus coeur metier du poste"}.`);
    nextActions.push("Garde les experiences transferables, mais prouve davantage le coeur du metier vise.");
  } else if (primaryDiagnosis === "Competences metier critiques absentes") {
    nextActions.push(`Fais remonter explicitement ${joinNatural(topMissingKeywords.length ? topMissingKeywords : job.criticalKeywords.slice(0, 3))} dans tes bullets ou dans ta bibliotheque.`);
    nextActions.push("Ajoute 2 ou 3 bullets qui montrent ces competences dans un contexte reel, pas seulement en liste de skills.");
  } else if (primaryDiagnosis === "Bibliotheque insuffisamment detaillee") {
    nextActions.push("Enrichis 1 ou 2 experiences proches de l'offre avec 3 a 5 bullets detailles.");
    nextActions.push("Ajoute du contexte, du scope, des resultats et des tags sur les experiences les plus proches.");
  } else if (primaryDiagnosis === "Experience proche mais preuves trop faibles") {
    nextActions.push("Reecris 2 ou 3 bullets avec du scope, des chiffres, ou un avant/apres concret.");
    nextActions.push("Precise ce que tu pilotais, pour qui, a quelle echelle, et avec quel impact.");
  } else {
    nextActions.push("Garde cette base et renforce seulement les bullets les plus faibles pour augmenter le taux de match.");
  }

  const recruiterCredibility = getRecruiterCredibility({
    fitOffer,
    evidenceScore,
    semanticScore,
    domainMismatch,
    evidenceGapIsHigh,
    libraryLooksThin,
    evidenceIsWeak,
  });
  const rankedCauses = rankDiagnosisCauses({
    job,
    selExps,
    fitOffer,
    legacyConfidence: confidence,
    evidenceScore,
    atsOptimized,
    atsBoost,
    semanticScore,
    contextSupport,
    libraryLooksThin,
    evidenceIsWeak,
    domainMismatch,
  });
  const primaryCause = rankedCauses[0] || "bullets_too_generic";
  const secondaryCauses = rankedCauses.slice(1, 3);
  const recommendedAction = recommendedActionForCause(primaryCause, nextActions[0] || "Renforce la preuve metier avant de regagner de l'ATS.");

  return { jobTitle: job.title, jobCompany: job.company, jobSeniority: job.seniority, jobDomain: job.domain, detectedKeywords: { requiredSkills: job.requiredSkills, preferredSkills: job.preferredSkills, responsibilities: job.responsibilities, keywords: job.keywords, criticalKeywords: job.criticalKeywords }, matchedSkills: matched.map(s => s.name), missingSkills: missingSkills.slice(0, 10), selectedExperiences: selExps.map(se => ({ title: se.experience.title, company: se.experience.company, score: Math.round(se.score), reason: se.reason, matchedAspects: se.matchedAspects, bulletCount: se.selectedBullets.length, charBudget: se.charBudget })), rejectedExperiences: [], selectedBullets: allBullets.map(sb => ({ text: sb.bullet.text, experienceTitle: sb.experience.title, score: sb.totalScore, deterministicScore: sb.deterministicScore, llmScore: sb.llmScore, matchedKeywords: sb.matchedKeywords, dimension: sb.dimension })), postRules, confidence, confidenceReasoning: verdict, fallbackUsed: total === 0, detectedLanguage: job.language, positioning: job.positioning, intentions: job.intentions, tips, diagnosis: { primaryDiagnosis, verdict, whatMatches: whatMatches.slice(0, 3), whatMissing: whatMissing.slice(0, 3), nextActions: nextActions.slice(0, 3), primaryCause, secondaryCauses, recommendedAction }, scoreBreakdown: { fitOffer, ats: atsEvidence, atsOptimized, atsBoost, contextSupport, semantic: semanticScore, recruiterCredibility, domainMismatch, cappedByKeywords, cappedByEvidence } };
}

// â”€â”€â”€ Dry Run Check (steps 1-4 only, no CV generation, no DB save) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface DryRunResult { preliminaryConfidence: number; criticalKeywords: string[]; positioning: string; jobTitle: string; }

export async function runDryRunCheck(input: Pick<TailorInput, "jobText" | "mode" | "bodyMaxChars" | "allExperiences" | "allBullets" | "allSkills">, openai: OpenAI): Promise<DryRunResult> {
  log("â•â•â•â•â•â• Dry Run Check (steps 1-4) â•â•â•â•â•â•");
  const parsedJob = await parseJobDescription(input.jobText, openai);
  const scored = await hybridScoreAllBullets(parsedJob, input.allExperiences, input.allBullets, openai);
  const allocs = allocateCharBudget(input.allExperiences, scored, input.bodyMaxChars || 3500);
  const selExps = selectBullets(scored, allocs);
  const allSelectedBullets = selExps.flatMap(se => se.selectedBullets);
  const total = allSelectedBullets.length;
  const avg = total > 0 ? Math.round(allSelectedBullets.reduce((s, b) => s + b.totalScore, 0) / total) : 0;
  // Approximate keyword coverage from matched keywords in bullets (without full applyPostRules)
  const matchedKwSet = new Set(allSelectedBullets.flatMap(sb => sb.matchedKeywords.map(k => k.toLowerCase())));
  const critLow = parsedJob.criticalKeywords.map(k => k.toLowerCase());
  const coveredCount = critLow.filter(k => matchedKwSet.has(k) || [...matchedKwSet].some(m => m.includes(k) || k.includes(m))).length;
  const kwCov = parsedJob.criticalKeywords.length > 0 ? Math.round(coveredCount / parsedJob.criticalKeywords.length * 100) : 50;
  const bulletBonus = total >= 6 ? Math.min(10, Math.round(kwCov * 0.1)) : Math.round(total * 1.5);
  const rawConfidence = Math.round(avg * 0.45 + kwCov * 0.45 + bulletBonus);
  const critKwHardCap = parsedJob.criticalKeywords.length >= 4 && kwCov < 25 ? 40 : 100;
  const preliminaryConfidence = Math.min(critKwHardCap, Math.min(100, rawConfidence));
  log(`Dry Run Done â€” ${preliminaryConfidence}% | ${parsedJob.positioning}`);
  return { preliminaryConfidence, criticalKeywords: parsedJob.criticalKeywords, positioning: parsedJob.positioning, jobTitle: parsedJob.title };
}

// â”€â”€â”€ Master Pipeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface TailorInput { jobText: string; mode: string; outputLength?: string; customMaxChars?: number; introMaxChars?: number; bodyMaxChars?: number; allExperiences: Experience[]; allBullets: Bullet[]; allSkills: Skill[]; profile?: { name?: string; title?: string; summary?: string | null }; formations?: any[]; languages?: any[]; }
export interface TailorResult { cvText: string; structuredCV: StructuredCV; report: OptimizationReport; selectedExperienceIds: string[]; selectedBulletIds: string[]; }
const CHAR_LIMITS: Record<string, number> = { compact: 2000, balanced: 3500, detailed: 5500 };

export async function runTailorPipeline(input: TailorInput, openai: OpenAI): Promise<TailorResult> {
  log("Pipeline V2 Start");
  const isFidele = input.mode === "original";
  const bodyChars = input.bodyMaxChars || input.customMaxChars || CHAR_LIMITS[input.outputLength || "balanced"] || 3500;
  const introChars = input.introMaxChars || 400;
  const parsedJob = await parseJobDescription(input.jobText, openai);
  const scored = await hybridScoreAllBullets(parsedJob, input.allExperiences, input.allBullets, openai);
  const allocs = allocateCharBudget(input.allExperiences, scored, bodyChars);
  const selExps = selectBullets(scored, allocs);
  const baseCv = await buildStructuredCV(parsedJob, selExps, input.allSkills, input.mode, openai, { profileName: input.profile?.name, profileTitle: input.profile?.title, profileSummary: input.profile?.summary || undefined, formations: input.formations, languages: input.languages });
  if (baseCv.summary && baseCv.summary.length > introChars) { baseCv.summary = baseCv.summary.slice(0, introChars).replace(/[,;]?\s*\S*$/, "").trim(); }

  const baselineCv = cloneStructuredCV(baseCv);
  const baselinePostRules = applyPostRules(baselineCv, parsedJob);
  const baselineReport = generateOptimizationReport(parsedJob, selExps, input.allSkills, baselinePostRules, baselineCv);

  let finalCv = baselineCv;
  let finalReport = baselineReport;

  if (!isFidele) {
    const candidateCv = await reformulateBullets(cloneStructuredCV(baseCv), parsedJob, openai);
    const candidateReportCv = cloneStructuredCV(candidateCv);
    const candidatePostRules = applyPostRules(candidateReportCv, parsedJob);
    const candidateReport = generateOptimizationReport(parsedJob, selExps, input.allSkills, candidatePostRules, candidateReportCv);

    if (
      candidateReport.scoreBreakdown.fitOffer > baselineReport.scoreBreakdown.fitOffer
      || (candidateReport.scoreBreakdown.fitOffer === baselineReport.scoreBreakdown.fitOffer
        && candidateReport.confidence >= baselineReport.confidence)
    ) {
      finalCv = candidateReportCv;
      finalReport = candidateReport;
    } else {
      log("reformulate rejected", {
        baselineFit: baselineReport.scoreBreakdown.fitOffer,
        candidateFit: candidateReport.scoreBreakdown.fitOffer,
        baselineLegacy: baselineReport.confidence,
        candidateLegacy: candidateReport.confidence,
      });
    }
  }

  const cvText = renderCVText(finalCv, parsedJob);
  log(`Pipeline Done - ${finalReport.confidence}% | ${parsedJob.positioning} | ${cvText.length} chars`);
  return { cvText, structuredCV: finalCv, report: finalReport, selectedExperienceIds: selExps.filter(se => se.selectedBullets.length > 0).map(se => se.experience.id), selectedBulletIds: selExps.flatMap(se => se.selectedBullets.map(sb => sb.bullet.id)) };
}
