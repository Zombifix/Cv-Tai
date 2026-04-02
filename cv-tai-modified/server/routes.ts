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
  checkLLMHealth,
  runTailorPipeline,
} from "./tailoring-engine";

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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

  // ══════════════════════════════════════════════════════════════
  // CV IMPORT — PDF (base64) or text paste → parse ALL experiences
  // ══════════════════════════════════════════════════════════════
  app.post("/api/import/cv", async (req, res) => {
    try {
      let rawText = "";

      if (req.body?.fileBase64) {
        // PDF sent as base64
        try {
          const pdfParse = (await import("pdf-parse")).default;
          const buffer = Buffer.from(req.body.fileBase64, "base64");
          console.log("[IMPORT] PDF buffer size:", buffer.length);
          const data = await pdfParse(buffer);
          rawText = data.text || "";
          console.log("[IMPORT] PDF text extracted:", rawText.length, "chars");
          console.log("[IMPORT] First 200 chars:", rawText.slice(0, 200));
        } catch (pdfErr: any) {
          console.error("[IMPORT] PDF parse error:", pdfErr.message);
          return res.status(400).json({ message: "Impossible de lire ce PDF. Essayez de coller le texte directement." });
        }
      } else if (req.body?.text) {
        rawText = req.body.text;
      } else {
        return res.status(400).json({ message: "Envoyez un fichier PDF (base64) ou du texte." });
      }

      // Clean up extracted text
      rawText = rawText.replace(/\s+/g, " ").trim();

      if (rawText.length < 20) {
        return res.status(400).json({ message: "Pas assez de contenu extrait. Essayez de coller le texte de votre CV directement." });
      }

      // Truncate to avoid token limits
      const truncated = rawText.slice(0, 8000);

      if (!openai) {
        return res.status(500).json({ message: "Service IA non configuré (OPENAI_API_KEY manquant)." });
      }

      const prompt = `Analyse ce CV et extrais TOUTES les expériences professionnelles.

Pour chaque expérience, extrais :
- title : intitulé du poste
- company : nom de l'entreprise
- startDate : date de début au format YYYY-MM-DD (estime si besoin, ex: "2020" → "2020-01-01")
- endDate : date de fin au format YYYY-MM-DD (null si poste actuel)
- description : résumé court du rôle en 1-2 phrases
- bullets : liste des réalisations/responsabilités (chaque bullet = une ligne du CV)

Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks :
{
  "experiences": [
    {
      "title": "...",
      "company": "...",
      "startDate": "...",
      "endDate": "..." ou null,
      "description": "...",
      "bullets": ["...", "..."]
    }
  ]
}

CV à analyser :
${truncated}`;

      const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      let parsed;
      try {
        parsed = JSON.parse(response.choices[0].message.content || "{}");
      } catch {
        return res.status(500).json({ message: "L'IA n'a pas pu analyser le contenu." });
      }

      const experiences = parsed.experiences || [];
      console.log("[IMPORT] Parsed", experiences.length, "experiences");

      res.json({ experiences, rawTextLength: rawText.length });
    } catch (err: any) {
      console.error("[IMPORT] Error:", err.message);
      res.status(500).json({ message: "Erreur lors de l'import: " + err.message });
    }
  });

  // Bulk create experiences from import
  app.post("/api/import/save", async (req, res) => {
    try {
      const { experiences: exps } = req.body;
      if (!exps || !Array.isArray(exps)) {
        return res.status(400).json({ message: "experiences array required" });
      }

      const created = [];
      for (const exp of exps) {
        const newExp = await storage.createExperience({
          title: exp.title || "Sans titre",
          company: exp.company || "Non renseigné",
          startDate: exp.startDate || undefined,
          endDate: exp.endDate || undefined,
          description: exp.description || "",
        });

        if (exp.bullets && Array.isArray(exp.bullets)) {
          for (const bulletText of exp.bullets) {
            if (bulletText.trim()) {
              await storage.createBullet({
                experienceId: newExp.id,
                text: bulletText.trim(),
                tags: [],
              });
            }
          }
        }

        created.push(newExp);
      }

      res.status(201).json({ created: created.length });
    } catch (err: any) {
      console.error("[IMPORT] Save error:", err.message);
      res.status(500).json({ message: "Erreur lors de la sauvegarde." });
    }
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
      const expId = req.params.experienceId;

      // Anti-duplicate: check if a very similar bullet already exists
      const existing = await storage.getBulletsByExperience(expId);
      const newTextLower = input.text.toLowerCase().trim();
      const isDuplicate = existing.some(b => {
        const existingLower = b.text.toLowerCase().trim();
        // Check if first 50 chars match (likely a duplicate/reformulation)
        if (newTextLower.slice(0, 50) === existingLower.slice(0, 50)) return true;
        // Check high overlap (>80% of words in common)
        const newWords = new Set(newTextLower.split(/\s+/).filter(w => w.length > 3));
        const existingWords = new Set(existingLower.split(/\s+/).filter(w => w.length > 3));
        if (newWords.size === 0) return false;
        const overlap = [...newWords].filter(w => existingWords.has(w)).length;
        return overlap / newWords.size > 0.8;
      });

      if (isDuplicate) {
        console.log("[BULLETS] Duplicate detected, skipping:", input.text.slice(0, 60));
        return res.status(409).json({ message: "Un bullet similaire existe deja pour cette experience." });
      }

      const bullet = await storage.createBullet({ ...input, experienceId: expId });
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

  // All unique tags across all bullets (for autocomplete)
  app.get("/api/bullets/tags", async (_req, res) => {
    const allBullets = await storage.getAllBullets();
    const tags = [...new Set(allBullets.flatMap(b => b.tags || []).filter(Boolean))].sort();
    res.json(tags);
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

  // Extract skills from all experiences + bullets via LLM
  app.post("/api/skills/extract", async (req, res) => {
    try {
      const allExps = await storage.getExperiences();
      const allBullets = await storage.getAllBullets();
      const existingSkills = await storage.getSkills();

      if (allExps.length === 0) {
        return res.status(400).json({ message: "Ajoutez des experiences d'abord." });
      }

      // Build a summary of all experiences + bullets
      const expSummaries = allExps.map(exp => {
        const expBullets = allBullets.filter(b => b.experienceId === exp.id);
        return `${exp.title} chez ${exp.company}:\n${exp.description || ""}\n${expBullets.map(b => "- " + b.text).join("\n")}`;
      }).join("\n\n");

      const existingNames = existingSkills.map(s => s.name.toLowerCase());

      if (!openai) {
        return res.json({ skills: [] });
      }

      const prompt = `Analyse ces experiences professionnelles et extrais TOUTES les competences (skills).

EXPERIENCES :
${expSummaries.slice(0, 6000)}

COMPETENCES DEJA ENREGISTREES (ne pas dupliquer) :
${existingNames.join(", ") || "aucune"}

REGLES :
- Extrais les competences explicites ET implicites
- Classe chaque competence dans UNE categorie parmi : "Outils", "Methodologies", "Soft Skills", "Domaines", "Techniques"
- "Outils" = logiciels, apps, plateformes (Figma, Jira, Salesforce...)
- "Methodologies" = methodes de travail (User Research, Design Thinking, Agile, A/B Testing...)
- "Soft Skills" = competences humaines (Leadership, Communication, Gestion de stakeholders...)
- "Domaines" = expertises metier (E-commerce, CRM, B2B, Luxury, Retail...)
- "Techniques" = competences techniques (Design System, Prototypage, Data Visualization...)
- NE PAS inclure les competences deja enregistrees
- Max 20 nouvelles competences
- Nom court (1-3 mots max)

Reponds UNIQUEMENT en JSON valide :
{
  "skills": [
    {"name": "...", "category": "Outils"},
    {"name": "...", "category": "Methodologies"}
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      let result;
      try {
        result = JSON.parse(response.choices[0].message.content || "{}");
      } catch {
        return res.json({ skills: [] });
      }

      const extracted = result.skills || [];
      // Filter out duplicates
      const filtered = extracted.filter((s: any) =>
        s.name && !existingNames.includes(s.name.toLowerCase())
      );

      console.log("[SKILLS] Extracted", filtered.length, "new skills");
      res.json({ skills: filtered });
    } catch (err: any) {
      console.error("[SKILLS] Extract error:", err.message);
      res.json({ skills: [] });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════════════════
  app.get("/api/profile", async (_req, res) => {
    const p = await storage.getProfile();
    res.json(p || { name: "", title: "", summary: null, targetRole: null });
  });
  app.put("/api/profile", async (req, res) => {
    try {
      const p = await storage.upsertProfile(req.body);
      res.json(p);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Role target check — analyze library against a target role
  app.post("/api/profile/check-role", async (req, res) => {
    try {
      const { role } = req.body;
      if (!role) return res.status(400).json({ message: "role required" });

      const allExps = await storage.getExperiences();
      const allBullets = await storage.getAllBullets();

      if (allExps.length === 0) return res.json({ summary: "Ajoutez des experiences d'abord.", dimensions: [] });

      if (!openai) return res.json({ summary: "Service IA non configure.", dimensions: [] });

      const expSummaries = allExps.map(exp => {
        const expBullets = allBullets.filter(b => b.experienceId === exp.id);
        return `${exp.title} chez ${exp.company}:\n${expBullets.map(b => `- ${b.text} [tags: ${(b.tags || []).join(", ")}]`).join("\n")}`;
      }).join("\n\n");

      const prompt = `Analyse ce profil par rapport au poste vise : "${role}".

EXPERIENCES :
${expSummaries.slice(0, 5000)}

Evalue 5-6 dimensions cles pour ce type de poste. Pour chaque dimension :
- score de 0 a 100
- status : "fort" (70+), "correct" (40-69), "leger" (15-39), "absent" (0-14)
- bullets : combien de bullets couvrent cette dimension
- Si le score est faible, propose un "tip" : soit un pont avec une experience existante, soit un constat de manque

Termine par un "summary" : 2 phrases max, ton direct, qui resume les forces et les trous.

Reponds UNIQUEMENT en JSON :
{
  "summary": "...",
  "dimensions": [
    {"name": "...", "score": 80, "status": "fort", "bullets": 3, "tip": null},
    {"name": "...", "score": 20, "status": "leger", "bullets": 1, "tip": "Ton experience X peut se reformuler sous cet angle."}
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      let result;
      try { result = JSON.parse(response.choices[0].message.content || "{}"); }
      catch { result = { summary: "Impossible d'analyser.", dimensions: [] }; }

      res.json(result);
    } catch (err: any) {
      console.error("[CHECK-ROLE] Error:", err.message);
      res.json({ summary: "Erreur lors de l'analyse.", dimensions: [] });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // FORMATIONS
  // ══════════════════════════════════════════════════════════════
  app.get("/api/formations", async (_req, res) => {
    const f = await storage.getFormations();
    res.json(f);
  });
  app.post("/api/formations", async (req, res) => {
    try {
      const { school, degree, year } = req.body;
      if (!school || !degree) return res.status(400).json({ message: "school and degree required" });
      const f = await storage.createFormation({ school, degree, year });
      res.status(201).json(f);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  app.delete("/api/formations/:id", async (req, res) => {
    await storage.deleteFormation(req.params.id);
    res.status(204).end();
  });

  // ══════════════════════════════════════════════════════════════
  // LANGUAGES
  // ══════════════════════════════════════════════════════════════
  app.get("/api/languages", async (_req, res) => {
    const l = await storage.getLanguages();
    res.json(l);
  });
  app.post("/api/languages", async (req, res) => {
    try {
      const { name, level } = req.body;
      if (!name) return res.status(400).json({ message: "name required" });
      const l = await storage.createLanguage({ name, level });
      res.status(201).json(l);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  app.delete("/api/languages/:id", async (req, res) => {
    await storage.deleteLanguage(req.params.id);
    res.status(204).end();
  });

  // ══════════════════════════════════════════════════════════════
  // SETTINGS — reset all data
  // ══════════════════════════════════════════════════════════════
  app.post("/api/settings/reset", async (_req, res) => {
    try {
      const client = await (await import("./db")).pool.connect();
      try {
        await client.query("DELETE FROM runs");
        await client.query("DELETE FROM job_posts");
        await client.query("DELETE FROM bullets");
        await client.query("DELETE FROM experiences");
        await client.query("DELETE FROM skills");
        await client.query("DELETE FROM formations");
        await client.query("DELETE FROM languages");
        await client.query("DELETE FROM profile");
        console.log("[SETTINGS] All data reset");
        res.json({ success: true });
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error("[SETTINGS] Reset failed:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  // Runs history
  app.get("/api/runs", async (_req, res) => {
    const allRuns = await storage.getRuns();
    res.json(allRuns);
  });

  // ══════════════════════════════════════════════════════════════
  // EXTRACT AXES — parse description + bullets into mission axes
  // ══════════════════════════════════════════════════════════════
  app.post("/api/experiences/:id/extract-axes", async (req, res) => {
    try {
      const exp = await storage.getExperience(req.params.id);
      if (!exp) return res.status(404).json({ message: "Experience not found" });

      const existingBullets = await storage.getBulletsByExperience(exp.id);
      const bulletTexts = existingBullets.map(b => `- ${b.text}`).join("\n");

      if (!openai || (!exp.description && existingBullets.length === 0)) {
        return res.json({ axes: [] });
      }

      const prompt = `Analyse cette experience et identifie les grands AXES de mission / perimetres de travail distincts.

EXPERIENCE :
- Poste : ${exp.title}
- Entreprise : ${exp.company}
- Description : ${exp.description || "Aucune"}
${existingBullets.length > 0 ? `\nBULLETS EXISTANTS :\n${bulletTexts}` : ""}

REGLES :
- Un axe = un projet, un produit, ou un scope de responsabilite distinct (ex: "CRM B2B", "Refonte page produit", "Accompagnement UX equipes")
- Une competence transversale (design system, user research, figma) n'est PAS un axe
- Max 5 axes
- Classe-les du plus important au moins important (temps passe, impact)
- Si la description est vague ou courte, propose 2-3 axes generiques bases sur le titre du poste

Reponds en JSON : {"axes": [{"text": "description courte de l'axe", "source": "description|bullet|inferred"}]}`;

      const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      let result;
      try {
        result = JSON.parse(response.choices[0].message.content || "{}");
      } catch { result = { axes: [] }; }

      res.json({ axes: (result.axes || []).slice(0, 5) });
    } catch (err: any) {
      console.error("[AXES] Error:", err.message);
      res.json({ axes: [] });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // GAP DETECTION — analyze experience + bullets, find what's missing
  // ══════════════════════════════════════════════════════════════
  app.post("/api/experiences/:id/detect-gaps", async (req, res) => {
    try {
      const exp = await storage.getExperience(req.params.id);
      if (!exp) return res.status(404).json({ message: "Experience not found" });

      const existingBullets = await storage.getBulletsByExperience(exp.id);
      const bulletTexts = existingBullets.map(b => `- ${b.text} [tags: ${(b.tags || []).join(", ")}]`).join("\n");

      if (!openai) {
        return res.json({ gaps: [
          { id: "g1", dimension: "scope", question: "Tu travaillais avec combien de personnes ?", priority: 1 },
          { id: "g2", dimension: "impact", question: "Quel resultat concret ca a donne ?", priority: 2 },
        ]});
      }

      const prompt = `Tu analyses un CV pour trouver ce qui MANQUE. Tu dois identifier les lacunes et poser UNE question par lacune.

ETAPE 1 — IDENTIFIER LES MISSIONS/PERIMETRES DISTINCTS
Regarde la description et les bullets. S'il y a plusieurs MISSIONS ou PERIMETRES de travail differents (ex: CRM + B2B, app mobile + back-office, produit client + produit interne), identifie-les.
ATTENTION : une competence transversale (design system, user research, figma) n'est PAS un perimetre distinct. Un perimetre = un projet, un produit, ou un scope de responsabilite separe.

EXPERIENCE :
- Poste : ${exp.title}
- Entreprise : ${exp.company}
- Description : ${exp.description || "Aucune"}
${existingBullets.length > 0 ? `\nBULLETS EXISTANTS :\n${bulletTexts}` : "\nAucun bullet existant."}

ETAPE 2 — TROUVER LES LACUNES
Pour CHAQUE mission/perimetre, verifie ces dimensions. PRIORISE les dimensions qui donnent des CHIFFRES :
1. SCOPE — combien ? (utilisateurs, marques, boutiques, equipe, budget)
2. IMPACT — quel resultat mesurable ? (%, temps gagne, avant/apres, adoption)
3. CONTEXTE — pourquoi ? quel probleme concret a resoudre ?
4. METHODE — comment ? quelle approche specifique ?
5. COLLABORATION — avec qui ? combien de personnes ?
6. DIFFICULTES — quelles contraintes concretes ?

REGLES :
- PRIORISE scope et impact (ce sont les dimensions qui produisent les meilleurs bullets CV)
- Si plusieurs missions, couvre TOUS les perimetres
- Max 4 questions au total
- Chaque question DEMANDE UN CHIFFRE ou UN FAIT CONCRET (pas "parle-moi de...")
- Questions en 15 mots MAX, tutoiement, ton direct
- Si tout est couvert AVEC des chiffres, retourne un tableau vide

BONS EXEMPLES :
- "Le CRM, c'est utilise par combien de marques ?" (demande un chiffre)
- "Le B2B, ca a remplace quel process ? Ca prenait combien de temps avant ?" (demande un avant/apres)
- "Tu bossais avec combien de devs et PMs sur le CRM ?" (demande un chiffre)

MAUVAIS EXEMPLES :
- "Parle-moi du CRM" (trop vague)
- "Comment c'etait ?" (pas de direction)

Reponds UNIQUEMENT en JSON valide :
{"gaps": [{"id": "g1", "dimension": "scope|impact|contexte|methode|collaboration|difficultes", "question": "...", "priority": 1}]}`;

      const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      let result;
      try {
        result = JSON.parse(response.choices[0].message.content || "{}");
      } catch {
        result = { gaps: [] };
      }

      res.json(result);
    } catch (err: any) {
      console.error("[GAPS] Error:", err.message);
      res.json({ gaps: [] });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // TAG + EVALUATE — user writes bullet, LLM tags + evaluates
  // ══════════════════════════════════════════════════════════════
  app.post("/api/experiences/:id/tag-evaluate", async (req, res) => {
    try {
      const exp = await storage.getExperience(req.params.id);
      if (!exp) return res.status(404).json({ message: "Experience not found" });

      const { text } = req.body;
      if (!text || !text.trim()) return res.status(400).json({ message: "text required" });

      if (!openai) {
        return res.json({ tags: ["general"], evaluation: null, suggestion: null });
      }

      const prompt = `Tu recois un bullet CV. Tu fais 4 choses SIMPLES :

1. TAGGER avec 3-6 mots-cles pour le matching ATS
   - Des mots SIMPLES qu'un recruteur taperait : "CRM", "B2B", "Product Design", "Figma", "User Research", "Partnership", "Loyalty"
   - PAS de mots composes avec tirets : "partnership-management" → juste "Partnership"
   - PAS de termes generiques : "travail", "experience", "UX" (trop vague)
   - Specifiques au contenu reel du bullet
   
2. EVALUER sur 5 criteres (true/false)
   - clarte : comprehensible en 5 secondes ?
   - contexte : on sait pour qui/quoi/dans quel cadre ?
   - scope : ordre de grandeur (equipe, users, marches) present ? "20+ interviews", "CRM & B2B", "3 equipes", "100M utilisateurs" = scope OK. Il suffit d'un chiffre OU d'un perimetre nomme.
   - impact : consequence visible (qualitative OK) ?
   - completude : matiere suffisante ?

3. EXPLIQUER chaque critere (reasons)
   - Pour chaque critere, donne une explication COURTE (10 mots max)
   - Si true → cite les elements du bullet qui valident (ex: "CRM Accor, structuration produit, vision")
   - Si false → dis ce qui manque + un exemple concret (ex: "Pas d'echelle. Ex: pour combien d'equipes ?")

4. SUGGERER une amelioration (optionnel)
   - Si un critere est false → UNE suggestion courte (15 mots max)
   - Si tout est true → suggestion = null
   - Ne demande JAMAIS un % ou KPI exact

EXPERIENCE : ${exp.title} chez ${exp.company}
BULLET : ${text.trim()}

JSON uniquement :
{
  "tags": ["tag1", "tag2"],
  "evaluation": {"clarte": true, "contexte": true, "scope": false, "impact": true, "completude": true},
  "reasons": {"clarte": "CRM Accor, structuration, vision, DA", "contexte": "CRM chez Accor", "scope": "Pas d'echelle. Ex: combien d'equipes ?", "impact": "Coherence globale", "completude": "Matiere suffisante"},
  "suggestion": "Tu pourrais preciser le nombre d'equipes concernees" ou null
}`;

      const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      let result;
      try { result = JSON.parse(response.choices[0].message.content || "{}"); }
      catch { result = { tags: ["general"], evaluation: null, reasons: null, suggestion: null }; }

      res.json({
        tags: Array.isArray(result.tags) ? result.tags : ["general"],
        evaluation: result.evaluation || null,
        reasons: result.reasons || null,
        suggestion: result.suggestion || null,
      });
    } catch (err: any) {
      console.error("[TAG-EVAL] Error:", err.message);
      res.json({ tags: ["general"], evaluation: null, suggestion: null });
    }
  });

  // Tailor — Pipeline V2
  app.post(api.tailor.generate.path, async (req, res) => {
    try {
      const { url, text, mode, outputLength, customMaxChars, introMaxChars, bodyMaxChars, extraContext } = api.tailor.generate.input.parse(req.body);

      // Normalize LinkedIn URL
      const normalizedUrl = url ? normalizeLinkedInUrl(url) : undefined;
      let effectiveJobText = text || "";

      if (!effectiveJobText && !normalizedUrl) {
        return res.status(400).json({ message: "Please provide a job description or URL." });
      }

      // Scrape URL if needed
      if (!effectiveJobText && normalizedUrl) {
        try {
          const jinaUrl = `https://r.jina.ai/${normalizedUrl}`;
          const jinaRes = await fetch(jinaUrl, {
            headers: { "Accept": "text/plain", "X-Return-Format": "text" },
            signal: AbortSignal.timeout(15000),
          });
          if (jinaRes.ok) {
            effectiveJobText = (await jinaRes.text()).slice(0, 6000).trim();
            console.log("[TAILOR] Scraped", effectiveJobText.length, "chars");
          } else {
            console.warn("[TAILOR] Scrape HTTP error:", jinaRes.status);
          }
        } catch (e: any) {
          console.warn("[TAILOR] Scrape failed:", e.message);
        }
      }

      if (!effectiveJobText || effectiveJobText.length < 150) {
        return res.status(400).json({
          message: "Impossible de recuperer le contenu de cette URL (acces restreint ou timeout). Veuillez coller la description du poste directement dans le champ texte.",
          scrapeFailed: true,
        });
      }

      if (extraContext?.trim()) {
        effectiveJobText += `\n\n---\nAdditional context provided by the candidate:\n${extraContext.trim()}`;
      }

      if (!openai) {
        return res.status(500).json({ message: "AI service not configured. Please set OPENAI_API_KEY." });
      }

      // Load all data
      const allExps = await storage.getExperiences();
      const allBullets = await storage.getAllBullets();
      const allSkills = await storage.getSkills();
      const profileData = await storage.getProfile();
      const formations = await storage.getFormations();
      const langs = await storage.getLanguages();

      if (allExps.length === 0) {
        return res.status(400).json({ message: "Your CV library is empty. Please add experiences first." });
      }

      // Run Pipeline V2
      const result = await runTailorPipeline({
        jobText: effectiveJobText,
        mode,
        outputLength,
        customMaxChars,
        introMaxChars,
        bodyMaxChars,
        allExperiences: allExps,
        allBullets: allBullets,
        allSkills: allSkills,
        profile: profileData ? { name: profileData.name, title: profileData.title, summary: profileData.summary } : undefined,
        formations,
        languages: langs,
      }, openai);

      // Save job post
      const jobPost = await storage.createJobPost({
        url: normalizedUrl,
        rawText: effectiveJobText,
        extractedJson: result.report as any,
      });

      // Save run
      const run = await storage.createRun({
        jobPostId: jobPost.id,
        mode,
        selectedExperienceIds: result.selectedExperienceIds,
        selectedBulletIds: result.selectedBulletIds,
        outputCvText: result.cvText,
        outputReportJson: result.report as any,
      });

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
