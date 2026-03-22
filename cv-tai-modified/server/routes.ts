import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { db } from "./db";
import { bullets } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import {
  normalizeLinkedInUrl,
  parseJobDescription,
  scoreExperiences,
  scoreBulletsInExperiences,
  buildCompositionPlan,
  generateTailoredCV,
  generateOptimizationReport,
  checkLLMHealth,
  type ParsedJob,
  type ScoredExperience,
  type ScoredBullet,
  type CompositionPlan,
} from "./tailoring-engine";

let openai: OpenAI | null = null;
if (process.env.GROQ_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

// Embeddings disabled as per request
async function getEmbedding(text: string): Promise<number[]> {
  return Array(1536).fill(0);
}

async function seedDatabase() {
  const exps = await storage.getExperiences();
  if (exps.length === 0) {
    const exp = await storage.createExperience({
      title: "Senior Software Engineer",
      company: "Tech Solutions Inc.",
      startDate: new Date("2020-01-01").toISOString(),
      endDate: new Date("2023-01-01").toISOString(),
      description: "Led the development of a cloud-native SaaS platform.",
      priority: 10,
    });
    
    await storage.createBullet({
      experienceId: exp.id,
      text: "Designed and implemented microservices architecture using Node.js and Docker, improving system scalability by 40%.",
      priority: 5,
      tags: ["Node.js", "Docker", "Architecture"],
    });

    await storage.createBullet({
      experienceId: exp.id,
      text: "Optimized database queries in PostgreSQL, reducing average API response time from 300ms to 50ms.",
      priority: 8,
      tags: ["PostgreSQL", "Performance", "SQL"],
    });
    
    await storage.createSkill({ name: "TypeScript", level: 5, priority: 10 });
    await storage.createSkill({ name: "React", level: 5, priority: 9 });
    await storage.createSkill({ name: "Node.js", level: 4, priority: 8 });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed initial data
  seedDatabase().catch(console.error);

  app.get("/api/llm/health", async (_req, res) => {
    const result = await checkLLMHealth(openai);
    res.status(result.success ? 200 : 503).json(result);
  });

  // Parse experience from raw text
  app.post("/api/experiences/parse", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ message: "text required" });
      
      if (!openai) {
        return res.json({
          title: text.split("\n")[0].slice(0, 50),
          company: "Unknown",
          summary: text.slice(0, 200),
        });
      }

      const response = await openai.chat.completions.create({
        model: "llama-3.2-90b-vision-preview",
        messages: [{
          role: "user",
          content: `Parse this raw experience text into structured JSON. Be strict about what is explicitly mentioned. If a field is not mentioned, omit it. Return ONLY valid JSON with these fields: title, company, employmentType, startDate (YYYY-MM-DD format), endDate (YYYY-MM-DD format), location, summary (brief 1-2 sentences), responsibilities (array of 3-5 bullet points), achievements (array of 3-5 bullet points with metrics), skills (array of technical skills), tools (array of software/tools), industry (array of industry tags).

Raw experience text:
${text}`,
        }],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(response.choices[0].message.content || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Parse error", err);
      res.status(500).json({ message: "Failed to parse experience" });
    }
  });

  // Experiences
  app.get(api.experiences.list.path, async (req, res) => {
    const exps = await storage.getExperiences();
    res.json(exps);
  });
  app.get(api.experiences.get.path, async (req, res) => {
    const exp = await storage.getExperience(req.params.id);
    if (!exp) return res.status(404).json({ message: "Not found" });
    res.json(exp);
  });
  app.post(api.experiences.create.path, async (req, res) => {
    try {
      const input = api.experiences.create.input.parse(req.body);
      const exp = await storage.createExperience(input);
      res.status(201).json(exp);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      throw e;
    }
  });
  app.put(api.experiences.update.path, async (req, res) => {
    try {
      const input = api.experiences.update.input.parse(req.body);
      const exp = await storage.updateExperience(req.params.id, input);
      res.json(exp);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      throw e;
    }
  });
  app.delete(api.experiences.delete.path, async (req, res) => {
    await storage.deleteExperience(req.params.id);
    res.status(204).end();
  });

  // Bullets
  app.get(api.bullets.listByExperience.path, async (req, res) => {
    const b = await storage.getBulletsByExperience(req.params.experienceId);
    res.json(b);
  });
  app.post(api.bullets.create.path, async (req, res) => {
    try {
      const input = api.bullets.create.input.parse(req.body);
      const bullet = await storage.createBullet({ ...input, experienceId: req.params.experienceId });
      getEmbedding(bullet.text).then(emb => storage.updateBulletEmbedding(bullet.id, emb));
      res.status(201).json(bullet);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      throw e;
    }
  });
  app.put(api.bullets.update.path, async (req, res) => {
    try {
      const input = api.bullets.update.input.parse(req.body);
      const bullet = await storage.updateBullet(req.params.id, input);
      if (input.text) {
        getEmbedding(input.text).then(emb => storage.updateBulletEmbedding(bullet.id, emb));
      }
      res.json(bullet);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      throw e;
    }
  });
  app.delete(api.bullets.delete.path, async (req, res) => {
    await storage.deleteBullet(req.params.id);
    res.status(204).end();
  });
  app.post(api.bullets.reEmbedAll.path, async (req, res) => {
    const all = await storage.getAllBullets();
    let count = 0;
    for (const b of all) {
      const emb = await getEmbedding(b.text);
      await storage.updateBulletEmbedding(b.id, emb);
      count++;
    }
    res.json({ success: true, count });
  });

  // Skills
  app.get(api.skills.list.path, async (req, res) => {
    const s = await storage.getSkills();
    res.json(s);
  });
  app.post(api.skills.create.path, async (req, res) => {
    try {
      const input = api.skills.create.input.parse(req.body);
      const skill = await storage.createSkill(input);
      res.status(201).json(skill);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      throw e;
    }
  });
  app.put(api.skills.update.path, async (req, res) => {
    try {
      const input = api.skills.update.input.parse(req.body);
      const skill = await storage.updateSkill(req.params.id, input);
      res.json(skill);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      throw e;
    }
  });
  app.delete(api.skills.delete.path, async (req, res) => {
    await storage.deleteSkill(req.params.id);
    res.status(204).end();
  });

  // Runs history
  app.get("/api/runs", async (_req, res) => {
    const allRuns = await storage.getRuns();
    res.json(allRuns);
  });

  // Adaptive enrichment questions (LLM-powered)
  app.post("/api/experiences/:id/suggest-questions", async (req, res) => {
    try {
      const exp = await storage.getExperience(req.params.id);
      if (!exp) return res.status(404).json({ message: "Experience not found" });

      const existingBullets = await storage.getBulletsByExperience(exp.id);
      const bulletTexts = existingBullets.map(b => b.text).join("\n- ");

      if (!openai) {
        // Fallback sans LLM
        return res.json({ questions: [
          { id: "f1", question: "Quel a été votre plus grand défi dans ce rôle ?", tag: "challenge" },
          { id: "f2", question: "Quel résultat mesurable avez-vous obtenu ?", tag: "metrics" },
          { id: "f3", question: "Qu'avez-vous appris que vous n'auriez pas appris ailleurs ?", tag: "growth" },
        ]});
      }

      const prompt = `Tu es un coach carrière. Tu poses des questions COURTES pour aider quelqu'un à enrichir son CV avec des éléments concrets et valorisables.

Expérience :
- Poste : ${exp.title}
- Entreprise : ${exp.company}
- Description : ${exp.description || "Aucune"}
${existingBullets.length > 0 ? `- Déjà capturé :\n- ${bulletTexts}` : "- Rien capturé encore."}

RÈGLES STRICTES :
- Exactement 3 questions
- Chaque question fait MAX 15 mots
- Ton direct et simple, tutoiement, comme un ami
- Orienté : résultats concrets, chiffres, impact, décisions prises, problèmes résolus
- PAS de jargon technique, PAS de questions sur le code ou la stack
- Adapté au métier (ici : ${exp.title}) — pense impact business, utilisateurs, process, collaboration
- Ne répète pas ce qui est déjà capturé

Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks :
[
  {"id": "q1", "question": "...", "tag": "mot-clé"},
  {"id": "q2", "question": "...", "tag": "mot-clé"},
  {"id": "q3", "question": "...", "tag": "mot-clé"}
]`;

      const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      let questions;
      try {
        const parsed = JSON.parse(response.choices[0].message.content || "[]");
        questions = Array.isArray(parsed) ? parsed : parsed.questions || parsed;
      } catch {
        questions = [
          { id: "f1", question: "Quel a été votre plus grand défi dans ce rôle ?", tag: "challenge" },
          { id: "f2", question: "Quel résultat mesurable avez-vous obtenu ?", tag: "metrics" },
          { id: "f3", question: "Qu'avez-vous appris que vous n'auriez pas appris ailleurs ?", tag: "growth" },
        ];
      }

      res.json({ questions });
    } catch (err: any) {
      console.error("[SUGGEST] Error:", err.message);
      res.json({ questions: [
        { id: "f1", question: "Quel a été votre plus grand défi dans ce rôle ?", tag: "challenge" },
        { id: "f2", question: "Quel résultat mesurable avez-vous obtenu ?", tag: "metrics" },
        { id: "f3", question: "Qu'avez-vous appris que vous n'auriez pas appris ailleurs ?", tag: "growth" },
      ]});
    }
  });

  // Tailor
  app.post(api.tailor.generate.path, async (req, res) => {
    try {
      const { url, text, mode, outputLength, customMaxChars } = api.tailor.generate.input.parse(req.body);

      // Step 1: Normalize LinkedIn URL
      const normalizedUrl = url ? normalizeLinkedInUrl(url) : undefined;
      const jobText = text || "";

      if (!jobText && !normalizedUrl) {
        return res.status(400).json({ message: "Please provide a job description or URL." });
      }

      // If only URL provided, scrape the page content via Jina.ai Reader (free, no auth needed)
      let effectiveJobText = jobText;
      if (!effectiveJobText && normalizedUrl) {
        try {
          console.log("[TAILOR] Fetching job page via Jina.ai:", normalizedUrl);
          const jinaUrl = `https://r.jina.ai/${normalizedUrl}`;
          const jinaRes = await fetch(jinaUrl, {
            headers: {
              "Accept": "text/plain",
              "X-Return-Format": "text",
            },
            signal: AbortSignal.timeout(15000),
          });
          if (jinaRes.ok) {
            const scraped = await jinaRes.text();
            // Keep only the first 6000 chars to avoid token overload
            effectiveJobText = scraped.slice(0, 6000).trim();
            console.log("[TAILOR] Jina.ai scraped", effectiveJobText.length, "chars");
          } else {
            console.warn("[TAILOR] Jina.ai returned", jinaRes.status, "— falling back to URL hint");
          }
        } catch (fetchErr: any) {
          console.warn("[TAILOR] Jina.ai fetch failed:", fetchErr.message);
        }
      }

      // Final fallback if scraping also failed
      if (!effectiveJobText) {
        effectiveJobText = `Job posting at: ${normalizedUrl}. The page content could not be retrieved automatically. Please paste the job description text for accurate results.`;
      }

      if (!openai) {
        return res.status(500).json({ message: "AI service not configured. Please set the GROQ_API_KEY." });
      }

      console.log("[TAILOR] ══════════════════════════════════════════");
      console.log("[TAILOR] Starting CV Tailoring Pipeline");
      console.log("[TAILOR] ══════════════════════════════════════════");

      // Step 1: Parse job description
      let parsedJob: ParsedJob;
      try {
        parsedJob = await parseJobDescription(effectiveJobText, openai);
      } catch (err: any) {
        console.error("[TAILOR] FAILED parseJobDescription:", err.message);
        return res.status(500).json({ message: `Failed to parse job description: ${err.message}` });
      }

      // Step 2: Load all data
      const allExps = await storage.getExperiences();
      const allBullets = await storage.getAllBullets();
      const allSkills = await storage.getSkills();

      if (allExps.length === 0) {
        return res.status(400).json({ message: "Your CV library is empty. Please add experiences first." });
      }

      // Step 3: Score experiences (2-level matching: experiences first)
      let scoredExps: ScoredExperience[];
      try {
        scoredExps = await scoreExperiences(parsedJob, allExps, openai);
      } catch (err: any) {
        console.error("[TAILOR] FAILED scoreExperiences:", err.message);
        return res.status(500).json({ message: `Failed to score experiences: ${err.message}` });
      }

      // Step 4: Score bullets only within top experiences (max 3)
      const topExps = scoredExps.slice(0, 3);

      const bulletsByExp = new Map<string, typeof allBullets>();
      for (const b of allBullets) {
        if (!bulletsByExp.has(b.experienceId)) bulletsByExp.set(b.experienceId, []);
        bulletsByExp.get(b.experienceId)!.push(b);
      }

      let scoredBullets: ScoredBullet[];
      try {
        scoredBullets = await scoreBulletsInExperiences(parsedJob, topExps, bulletsByExp, openai);
      } catch (err: any) {
        console.error("[TAILOR] FAILED scoreBulletsInExperiences:", err.message);
        return res.status(500).json({ message: `Failed to score bullets: ${err.message}` });
      }

      // Step 5: Build composition plan
      let plan: CompositionPlan;
      try {
        plan = await buildCompositionPlan(parsedJob, scoredExps, scoredBullets, allSkills, mode, openai, outputLength ?? "balanced");
      } catch (err: any) {
        console.error("[TAILOR] FAILED buildCompositionPlan:", err.message);
        return res.status(500).json({ message: `Failed to build CV composition: ${err.message}` });
      }

      // Step 6: Generate tailored CV text
      let outputCvText: string;
      try {
        outputCvText = await generateTailoredCV(plan, parsedJob, mode, openai, outputLength ?? "balanced", customMaxChars);
      } catch (err: any) {
        console.error("[TAILOR] FAILED generateTailoredCV:", err.message);
        return res.status(500).json({ message: `Failed to generate CV text: ${err.message}` });
      }

      // Step 7: Generate optimization report
      const reportData = generateOptimizationReport(parsedJob, plan, scoredExps, allSkills);

      // Save job post
      const jobPost = await storage.createJobPost({
        url: normalizedUrl,
        rawText: effectiveJobText,
        extractedJson: parsedJob as any,
      });

      // Save run
      const selectedBulletIds = plan.sections.flatMap(s => s.bullets.map(b => b.bullet.id));
      const selectedExpIds = plan.sections.map(s => s.experience.id);

      const run = await storage.createRun({
        jobPostId: jobPost.id,
        mode,
        selectedExperienceIds: selectedExpIds,
        selectedBulletIds: selectedBulletIds,
        outputCvText,
        outputReportJson: reportData as any,
      });

      console.log("[TAILOR] ══════════════════════════════════════════");
      console.log("[TAILOR] Pipeline Complete — Confidence:", reportData.confidence);
      console.log("[TAILOR] ══════════════════════════════════════════");
      res.status(201).json(run);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error("[TAILOR] Unexpected error:", e);
      res.status(500).json({ message: "An unexpected error occurred during CV generation." });
    }
  });

  app.get(api.tailor.getRun.path, async (req, res) => {
    const run = await storage.getRun(req.params.id);
    if (!run) return res.status(404).json({ message: "Not found" });
    res.json(run);
  });

  return httpServer;
}
