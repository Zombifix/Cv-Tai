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

// ─── Shared helpers ──────────────────────────────────────────────────────────
function normalizeSkillKey(s: string): string {
  return s.toLowerCase().replace(/[/\-]/g, " ").replace(/\s+/g, " ").replace(/s$/, "").trim();
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ParsedJob {
  title: string; company: string; seniority: string; domain: string;
  requiredSkills: string[]; preferredSkills: string[]; responsibilities: string[];
  keywords: string[]; criticalKeywords: string[]; language: "EN" | "FR";
  intentions: string[];
  positioning: "consultant" | "lead" | "ic" | "manager";
}
export interface ScoredBullet { bullet: Bullet; experience: Experience; deterministicScore: number; llmScore: number; totalScore: number; matchedTags: string[]; matchedKeywords: string[]; dimension: string; }
export interface ScoredExperience { experience: Experience; score: number; reason: string; matchedAspects: string[]; selectedBullets: ScoredBullet[]; charBudget: number; }
export interface CompositionPlan { targetTitle: string; summary: string; sections: { experience: Experience; experienceScore: number; experienceReason: string; bullets: ScoredBullet[]; }[]; relevantSkills: string[]; rejectedBullets: { text: string; score: number; reason: string }[]; rejectedExperiences: { title: string; company: string; score: number; reason: string }[]; }
export interface StructuredCV { name?: string; targetTitle: string; summary: string; experiences: { title: string; company: string; contractType?: string; dates: string; bullets: string[]; description?: string; }[]; skills: string[]; formations: { degree: string; school: string; year?: string }[]; languages: { name: string; level?: string }[]; }

// ─── Step 1: Parse Job (with intentions + positioning) ───────────────────────
export async function parseJobDescription(jobText: string, openai: OpenAI): Promise<ParsedJob> {
  log("parseJobDescription", `${jobText.length} chars`);
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: `Extract structured info from a job posting. Return JSON:
- title, company, seniority (junior/mid/senior/lead/director), domain
- requiredSkills[], preferredSkills[], responsibilities[]
- keywords[] (10-20 ATS terms: concrete tools, technologies, methodologies — max 3 words each, NO soft skills, NO descriptive phrases)
- criticalKeywords[] (5-8 ROLE-DISCRIMINATING must-haves — CRITICAL RULE: choose terms that a professional from an ADJACENT but different field would NOT have. Examples:
  * For Product Owner: "Backlog Management", "Sprint Planning", "User Stories", "Roadmap" — NOT "User Research" (designers have this too)
  * For Product Designer: "Figma", "Prototyping", "Design System", "Usability Testing" — NOT "Stakeholder Management" (POs have this too)
  * For Chef de Projet: "Gestion de projet", "Planning", "Budget", "Reporting" — NOT "Product Discovery"
  * For Data Analyst: "SQL", "Python", "Data Viz", "Dashboard" — NOT "Analytics" (too generic)
  The goal: if someone with the wrong background reads these 5-8 keywords, they should immediately know they don't qualify.)
- language ("EN"/"FR")
- intentions[] (5-10 phrases: what the role REALLY needs beyond keywords. Ex: "structurer les pratiques design", "influencer les stakeholders", "mesurer l'impact business du design". VERBS + OUTCOMES.)
- positioning: "consultant" (conseil, accompagnement, formation) | "lead" (management, vision, equipe) | "ic" (craft, delivery) | "manager" (people management)` },
      { role: "user", content: jobText.slice(0, 6000) },
    ],
    response_format: { type: "json_object" },
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
  };
  log("parseJobDescription DONE", { title: result.title, positioning: result.positioning, intentions: result.intentions.length });
  return result;
}

// ─── Step 2: Hybrid Score ────────────────────────────────────────────────────
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
        response_format: { type: "json_object" }, temperature: 0.3,
      });
      const r = JSON.parse(res.choices[0].message.content || "{}");
      for (const s of (r.scores || [])) { if (s.index >= 0 && s.index < toScore.length) { toScore[s.index].llmScore = Math.min(50, s.score || 0); toScore[s.index].totalScore = toScore[s.index].deterministicScore + toScore[s.index].llmScore; } }
    } catch (e: any) { log("hybridScore LLM failed", e.message); }
  }
  scored.sort((a, b) => b.totalScore - a.totalScore);
  log("hybridScore DONE", scored.slice(0, 5).map(s => ({ s: s.totalScore, c: s.experience.company, t: s.bullet.text.slice(0, 50) })));
  return scored;
}

// ─── Step 3: Budget Allocator (pertinence-weighted) ──────────────────────────
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

  // Budget mode: compact (≤2000) = impact only, standard (2001-3000) = balanced, rich (>3000) = storytelling
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
      // Only strong bullets (score ≥ 30 or has numbers)
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

// ─── Narrative dedup helpers ─────────────────────────────────────────────────
function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-zàâçéèêëîïôùûüÿñæœ0-9]/g, " ").split(/\s+/).filter(w => w.length >= 4));
}
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter(w => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

// ─── Step 4: Select & Deduplicate ────────────────────────────────────────────
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
      const tokens = tokenize(sb.bullet.text);
      const tooSimilar = seenTokens.some(prev => jaccardSimilarity(prev, tokens) > 0.45);
      if (!tooSimilar) seenTokens.push(tokens);
      return !tooSimilar;
    });
  }
  return result;
}

// ─── Step 5: Build Structured CV (adaptive) ──────────────────────────────────
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
        { role: "system", content: `Write a 2-3 sentence CV summary. Max 45 words. No first person. ${posGuide[job.positioning]} ${job.language === "FR" ? "In French." : "In English."} IMPORTANT: Only reference companies listed in the experiences below. Do not invent metrics, achievements, or projects not explicitly mentioned in the provided context.` },
        { role: "user", content: `Target: "${job.title}" at "${job.company}" (${job.domain})\nPositioning: ${job.positioning}\n${extras?.profileSummary ? `Bio: ${extras.profileSummary}\n` : ""}Exps: ${topExps.map(se => `${se.experience.title} at ${se.experience.company}`).join(", ")}\nSkills: ${dedupSkills.slice(0,6).join(", ")}\nRequired: ${job.requiredSkills.slice(0,5).join(", ")}\nIntentions: ${job.intentions.slice(0,3).join("; ")}` },
      ] });
      summary = (res.choices[0].message.content || summary).trim();
    } catch (e: any) {
      log("summary LLM failed — deterministic fallback", e.message);
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
    experiences: selExps.map(se => ({ title: se.experience.title, company: se.experience.company, contractType: (se.experience as any).contractType || undefined, dates: `${fmtDate(se.experience.startDate, job.language)} – ${fmtDate(se.experience.endDate, job.language)}`, bullets: se.selectedBullets.map(sb => sb.bullet.text), description: se.experience.description || undefined })),
    skills: dedupSkills,
    formations: (extras?.formations || []).map((f: any) => ({ degree: f.degree, school: f.school, year: f.year })),
    languages: (extras?.languages || []).map((l: any) => ({ name: l.name, level: l.level })),
  };
}

// ─── Step 6: Reformulate ─────────────────────────────────────────────────────
export async function reformulateBullets(cv: StructuredCV, job: ParsedJob, openai: OpenAI): Promise<StructuredCV> {
  const all = cv.experiences.flatMap((exp, ei) => exp.bullets.map((b, bi) => ({ ei, bi, text: b, ctx: `${exp.title} @ ${exp.company}`, desc: exp.description ? exp.description.slice(0, 150) : "" })));
  if (all.length === 0) return cv;
  const list = all.map((b, i) => `[${i}] (${b.ctx}${b.desc ? ` | context: ${b.desc}` : ""}): ${b.text}`).join("\n");
  const lang = job.language === "FR" ? "Reformule en francais." : "Reformulate in English.";
  try {
    const res = await openai.chat.completions.create({ model: MODEL, messages: [
      { role: "system", content: `CV optimization. Reformulate bullets:\n1. Embed keywords naturally: ${job.criticalKeywords.join(", ")}\n2. Start with an action verb\n3. NO invention — only use information present in the bullet or its context\n4. Preserve proper nouns, brand names, and specific numbers exactly\n5. Do NOT change the nature of activities: "tests utilisateurs" ≠ "A/B testing", "interviews" ≠ "surveys"\n6. If a bullet already starts with an action verb and is ≤160 chars, return it unchanged\n7. Max 200 chars\n8. ${lang}\n9. ${job.positioning} role: ${job.positioning === "consultant" ? "emphasize accompagnement, structuration, impact on teams" : job.positioning === "lead" ? "emphasize vision, leadership" : "emphasize delivery, results"}` },
      { role: "user", content: `Target: "${job.title}" at "${job.company}"\nKeywords: ${job.keywords.slice(0,10).join(", ")}\nIntentions: ${job.intentions.slice(0,3).join("; ")}\n\nBullets (with experience context when available):\n${list}\n\nReturn JSON: {"bullets": [{"index": 0, "text": "..."}]}` },
    ], response_format: { type: "json_object" }, temperature: 0.4 });
    const r = JSON.parse(res.choices[0].message.content || "{}");
    for (const rb of (r.bullets || [])) { if (rb.index >= 0 && rb.index < all.length && rb.text?.length > 10) { cv.experiences[all[rb.index].ei].bullets[all[rb.index].bi] = rb.text; } }
  } catch (e: any) { log("reformulate FAILED", e.message); }
  return cv;
}

// ─── Step 7: Post Rules ──────────────────────────────────────────────────────
export interface PostRuleResult { keywordsCovered: string[]; keywordsMissing: string[]; longBullets: number; bulletsWithNumbers: number; totalBullets: number; rulesApplied: string[]; }
export function applyPostRules(cv: StructuredCV, job: ParsedJob): PostRuleResult {
  const rules: string[] = [];
  const text = [cv.summary, ...cv.experiences.flatMap(e => e.bullets), cv.skills.join(" ")].join(" ").toLowerCase();
  const covered: string[] = []; const missing: string[] = [];
  for (const kw of job.criticalKeywords) { (text.includes(kw.toLowerCase()) ? covered : missing).push(kw); }
  const isSkillLike = (kw: string) =>
    kw.length <= 35 &&
    kw.split(/\s+/).length <= 3 &&
    !/\d+\+?\s*years?/i.test(kw) &&
    !/\b(experience|communication|portfolio|environments?|solution|quality|skills?|management|ability|knowledge|insights?|fidelity|deliverables?|approaches?|practices?|iterative|exceptional|strong|proven|thinking|mindset|oriented)\b/i.test(kw);
  for (const kw of missing) { if (isSkillLike(kw) && !cv.skills.some(s => normalizeSkillKey(s) === normalizeSkillKey(kw))) { cv.skills.push(kw); rules.push(`Injected "${kw}" into skills`); } }
  let longCount = 0;
  for (const exp of cv.experiences) { for (let i = 0; i < exp.bullets.length; i++) { if (exp.bullets[i].length > 200) { exp.bullets[i] = exp.bullets[i].slice(0, 200).replace(/[,;]?\s*\S*$/, ""); longCount++; rules.push(`Truncated bullet in ${exp.company}`); } } }
  const total = cv.experiences.reduce((s, e) => s + e.bullets.length, 0);
  const withNums = cv.experiences.reduce((s, e) => s + e.bullets.filter(b => /\d+/.test(b)).length, 0);
  return { keywordsCovered: covered, keywordsMissing: missing, longBullets: longCount, bulletsWithNumbers: withNums, totalBullets: total, rulesApplied: rules };
}

// ─── Step 8: Render ──────────────────────────────────────────────────────────
export function renderCVText(cv: StructuredCV, job: ParsedJob): string {
  const fr = job.language === "FR"; const l: string[] = [];
  if (cv.name) l.push(cv.name);
  l.push(cv.targetTitle, "");
  if (cv.summary) { l.push(fr ? "RESUME PROFESSIONNEL" : "PROFESSIONAL SUMMARY"); l.push(cv.summary, ""); }
  l.push(fr ? "EXPERIENCE PROFESSIONNELLE" : "EXPERIENCE", "");
  for (const exp of cv.experiences) { const ct = exp.contractType ? ` (${exp.contractType})` : ""; l.push(`${exp.title} | ${exp.company}${ct}`); l.push(exp.dates); for (const b of exp.bullets) l.push(`• ${b}`); l.push(""); }
  if (cv.skills.length) { l.push(fr ? "COMPETENCES" : "SKILLS"); l.push(cv.skills.join(" · "), ""); }
  if (cv.formations.length) { l.push(fr ? "FORMATION" : "EDUCATION"); for (const f of cv.formations) l.push(`${f.degree} — ${f.school}${f.year ? ` (${f.year})` : ""}`); l.push(""); }
  if (cv.languages.length) { l.push(fr ? "LANGUES" : "LANGUAGES"); for (const la of cv.languages) l.push(`${la.name}${la.level ? ` — ${la.level}` : ""}`); }
  return l.join("\n").trim();
}

// ─── Report ──────────────────────────────────────────────────────────────────
export interface OptimizationReport { jobTitle: string; jobCompany: string; jobSeniority: string; jobDomain: string; detectedKeywords: { requiredSkills: string[]; preferredSkills: string[]; responsibilities: string[]; keywords: string[]; criticalKeywords: string[]; }; matchedSkills: string[]; missingSkills: string[]; selectedExperiences: { title: string; company: string; score: number; reason: string; matchedAspects: string[]; bulletCount: number; charBudget: number; }[]; rejectedExperiences: { title: string; company: string; score: number; reason: string }[]; selectedBullets: { text: string; experienceTitle: string; score: number; deterministicScore: number; llmScore: number; matchedKeywords: string[]; dimension: string; }[]; postRules: PostRuleResult; confidence: number; confidenceReasoning: string; fallbackUsed: boolean; detectedLanguage: "EN" | "FR"; positioning: string; intentions: string[]; tips: string[]; scoreBreakdown: { ats: number; semantic: number; domainMismatch?: string; cappedByKeywords: boolean; }; }

export function generateOptimizationReport(job: ParsedJob, selExps: ScoredExperience[], skills: Skill[], postRules: PostRuleResult, cv: StructuredCV): OptimizationReport {
  const allBullets = selExps.flatMap(se => se.selectedBullets);
  const total = allBullets.length;
  const allJobSkills = [...job.requiredSkills, ...job.preferredSkills].map(s => s.toLowerCase());
  const matched = skills.filter(s => allJobSkills.some(js => js.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(js)));
  const missingSkills = allJobSkills.filter(js => !skills.some(s => s.name.toLowerCase().includes(js) || js.includes(s.name.toLowerCase())));
  const avg = total > 0 ? Math.round(allBullets.reduce((s, b) => s + b.totalScore, 0) / total) : 0;
  const kwCov = job.criticalKeywords.length > 0 ? Math.round(postRules.keywordsCovered.length / job.criticalKeywords.length * 100) : 50;
  // Removed flat +20 bullets bonus — it was inflating scores regardless of match quality.
  // New formula: avg score (0-120 scale) × 0.45 + keyword coverage × 0.45 + small bullets bonus (max 10).
  const bulletBonus = total >= 6 ? Math.min(10, Math.round(kwCov * 0.1)) : Math.round(total * 1.5);
  const rawConfidence = Math.round(avg * 0.45 + kwCov * 0.45 + bulletBonus);
  // Hard cap: if less than 25% of critical keywords are present in the CV, it's a weak match regardless of bullet quality.
  // This catches cases where the profile domain is fundamentally different from the job (e.g. Designer → PO).
  const critKwHardCap = job.criticalKeywords.length >= 4 && kwCov < 25 ? 40 : 100;
  const confidence = Math.min(critKwHardCap, Math.min(100, rawConfidence));
  const tips: string[] = [];
  if (postRules.keywordsMissing.length) tips.push(`Keywords manquants: ${postRules.keywordsMissing.join(", ")}.`);
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
    tips.push("Attention : ce poste est Product Owner/PM. Tes bullets sont orientés Design. Le match est partiel — les compétences de discovery se transfèrent, mais la gestion de backlog est absente.");
  }
  if (isDesignJob && userIsPO && !userIsDesigner) {
    tips.push("Attention : ce poste est Design mais tes bullets sont orientés Product/PO. Le match UX craft est limité.");
  }

  const domainMismatch = isPOJob && userIsDesigner && !userIsPO ? "PO/PM vs Designer"
    : isDesignJob && userIsPO && !userIsDesigner ? "Designer vs PO"
    : undefined;
  const semanticScore = Math.min(100, Math.round(avg * 100 / 120));
  const cappedByKeywords = critKwHardCap < 100 && rawConfidence > critKwHardCap;

  return { jobTitle: job.title, jobCompany: job.company, jobSeniority: job.seniority, jobDomain: job.domain, detectedKeywords: { requiredSkills: job.requiredSkills, preferredSkills: job.preferredSkills, responsibilities: job.responsibilities, keywords: job.keywords, criticalKeywords: job.criticalKeywords }, matchedSkills: matched.map(s => s.name), missingSkills: missingSkills.slice(0, 10), selectedExperiences: selExps.map(se => ({ title: se.experience.title, company: se.experience.company, score: Math.round(se.score), reason: se.reason, matchedAspects: se.matchedAspects, bulletCount: se.selectedBullets.length, charBudget: se.charBudget })), rejectedExperiences: [], selectedBullets: allBullets.map(sb => ({ text: sb.bullet.text, experienceTitle: sb.experience.title, score: sb.totalScore, deterministicScore: sb.deterministicScore, llmScore: sb.llmScore, matchedKeywords: sb.matchedKeywords, dimension: sb.dimension })), postRules, confidence, confidenceReasoning: `ATS keywords: ${kwCov}%. Semantic: ${semanticScore}%. ${total} bullets.${cappedByKeywords ? " Score plafonné : keywords critiques absents." : ""}`, fallbackUsed: total === 0, detectedLanguage: job.language, positioning: job.positioning, intentions: job.intentions, tips, scoreBreakdown: { ats: kwCov, semantic: semanticScore, domainMismatch, cappedByKeywords } };
}

// ─── Master Pipeline ─────────────────────────────────────────────────────────
export interface TailorInput { jobText: string; mode: string; outputLength?: string; customMaxChars?: number; introMaxChars?: number; bodyMaxChars?: number; allExperiences: Experience[]; allBullets: Bullet[]; allSkills: Skill[]; profile?: { name?: string; title?: string; summary?: string | null }; formations?: any[]; languages?: any[]; }
export interface TailorResult { cvText: string; structuredCV: StructuredCV; report: OptimizationReport; selectedExperienceIds: string[]; selectedBulletIds: string[]; }
const CHAR_LIMITS: Record<string, number> = { compact: 2000, balanced: 3500, detailed: 5500 };

export async function runTailorPipeline(input: TailorInput, openai: OpenAI): Promise<TailorResult> {
  log("══════ Pipeline V2 Start ══════");
  const isFidele = input.mode === "original";
  const bodyChars = input.bodyMaxChars || input.customMaxChars || CHAR_LIMITS[input.outputLength || "balanced"] || 3500;
  const introChars = input.introMaxChars || 400;
  const parsedJob = await parseJobDescription(input.jobText, openai);
  const scored = await hybridScoreAllBullets(parsedJob, input.allExperiences, input.allBullets, openai);
  const allocs = allocateCharBudget(input.allExperiences, scored, bodyChars);
  const selExps = selectBullets(scored, allocs);
  let cv = await buildStructuredCV(parsedJob, selExps, input.allSkills, input.mode, openai, { profileName: input.profile?.name, profileTitle: input.profile?.title, profileSummary: input.profile?.summary || undefined, formations: input.formations, languages: input.languages });
  if (cv.summary && cv.summary.length > introChars) { cv.summary = cv.summary.slice(0, introChars).replace(/[,;]?\s*\S*$/, "").trim(); }
  if (!isFidele) cv = await reformulateBullets(cv, parsedJob, openai);
  const postRules = applyPostRules(cv, parsedJob);
  const cvText = renderCVText(cv, parsedJob);
  const report = generateOptimizationReport(parsedJob, selExps, input.allSkills, postRules, cv);
  log(`Pipeline Done — ${report.confidence}% | ${parsedJob.positioning} | ${cvText.length} chars`);
  return { cvText, structuredCV: cv, report, selectedExperienceIds: selExps.filter(se => se.selectedBullets.length > 0).map(se => se.experience.id), selectedBulletIds: selExps.flatMap(se => se.selectedBullets.map(sb => sb.bullet.id)) };
}
