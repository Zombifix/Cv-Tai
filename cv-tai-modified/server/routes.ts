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
        return res.status(500).json({ message: "Service IA non configuré (GROQ_API_KEY manquant)." });
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

  // Runs history
  app.get("/api/runs", async (_req, res) => {
    const allRuns = await storage.getRuns();
    res.json(allRuns);
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

EXPERIENCE :
- Poste : ${exp.title}
- Entreprise : ${exp.company}
- Description : ${exp.description || "Aucune"}
${existingBullets.length > 0 ? `\nBULLETS EXISTANTS :\n${bulletTexts}` : "\nAucun bullet existant."}

DIMENSIONS A VERIFIER (universel, tous metiers) :
1. SCOPE — taille equipe, perimetre, nombre utilisateurs/clients concernes
2. IMPACT — resultats concrets, chiffres avant/apres, ameliorations mesurees
3. CONTEXTE — pourquoi ce projet/role existait, quel probleme a resoudre
4. METHODE — comment tu as fait, approche, process mis en place
5. COLLABORATION — avec qui (equipes, stakeholders, externes)
6. DIFFICULTES — contraintes, obstacles surmontes, compromis faits

REGLES :
- Analyse chaque dimension : est-elle couverte par la description ou les bullets ?
- Ne retourne QUE les dimensions manquantes (max 3)
- Chaque question CITE un element specifique de la description ou des bullets
- Questions en 15 mots MAX, tutoiement, ton direct
- Si tout est bien couvert, retourne un tableau vide

Exemple pour Chanel / app vendeur :
- Si pas de scope : "L'app My Little Black Book, c'est deploye dans combien de boutiques ?"
- Si pas d'impact : "Ca a change quoi concretement pour les vendeurs au quotidien ?"

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
  // MICRO-THREAD — follow-up + progressive reformulation + auto-tags
  // ══════════════════════════════════════════════════════════════
  app.post("/api/experiences/:id/enrich", async (req, res) => {
    try {
      const exp = await storage.getExperience(req.params.id);
      if (!exp) return res.status(404).json({ message: "Experience not found" });

      const { dimension, question, answer, previousAnswers } = req.body;
      if (!answer) return res.status(400).json({ message: "answer required" });

      // Build conversation history for micro-thread
      const history = previousAnswers || [];
      const allAnswers = [...history, answer].join(" | ");

      if (!openai) {
        return res.json({
          bullet: answer,
          tags: [dimension || "general"],
          followUp: null,
          isComplete: true,
        });
      }

      const prompt = `Tu es un assistant CV. Tu fais 3 choses en une seule reponse :

1. REFORMULER toute la matiere en UN bullet CV (verbe d'action, concis, max 30 mots, chiffres si dispo)
2. TAGGER avec des mots-cles semantiques pour le matching futur (3-6 tags)
3. DECIDER si une RELANCE est necessaire pour creuser davantage (1 relance max)

EXPERIENCE :
- Poste : ${exp.title}
- Entreprise : ${exp.company}
- Description : ${exp.description || ""}

CONVERSATION :
- Dimension exploree : ${dimension || "general"}
- Question posee : ${question || "ajout libre"}
- Reponse(s) : ${allAnswers}

REGLES RELANCE :
- Si la reponse est vague (pas de chiffre, pas de detail concret) → propose UNE relance courte (10 mots max)
- Si la reponse est deja precise et actionnable → pas de relance, isComplete = true
- Max 1 relance, pas plus
- La relance doit creuser la MEME dimension, pas changer de sujet

REGLES TAGS :
- Tags concrets et utiles pour matcher avec des offres d'emploi
- Exemples : "paiement", "mobile-ios", "design-system", "b2b", "retail", "user-research", "deploiement"
- PAS de tags vagues comme "experience" ou "travail"

Reponds UNIQUEMENT en JSON valide :
{
  "bullet": "Le bullet CV reformule avec toute la matiere",
  "tags": ["tag1", "tag2", "tag3"],
  "followUp": "La question de relance courte" ou null,
  "isComplete": true ou false
}`;

      const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      let result;
      try {
        result = JSON.parse(response.choices[0].message.content || "{}");
      } catch {
        result = { bullet: answer, tags: [dimension || "general"], followUp: null, isComplete: true };
      }

      // Ensure tags is always an array
      if (!Array.isArray(result.tags)) result.tags = [dimension || "general"];

      res.json(result);
    } catch (err: any) {
      console.error("[ENRICH] Error:", err.message);
      res.json({ bullet: req.body.answer || "", tags: ["general"], followUp: null, isComplete: true });
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
      const profileData = await storage.getProfile();
      const formations = await storage.getFormations();
      const langs = await storage.getLanguages();

      if (allExps.length === 0) {
        return res.status(400).json({ message: "Your CV library is empty. Please add experiences first." });
      }

      // Build bullets map (used for both experience scoring and bullet scoring)
      const bulletsByExp = new Map<string, typeof allBullets>();
      for (const b of allBullets) {
        if (!bulletsByExp.has(b.experienceId)) bulletsByExp.set(b.experienceId, []);
        bulletsByExp.get(b.experienceId)!.push(b);
      }

      // Step 3: Score experiences — now includes bullet tags for better matching
      let scoredExps: ScoredExperience[];
      try {
        scoredExps = await scoreExperiences(parsedJob, allExps, openai, bulletsByExp);
      } catch (err: any) {
        console.error("[TAILOR] FAILED scoreExperiences:", err.message);
        return res.status(500).json({ message: `Failed to score experiences: ${err.message}` });
      }

      // Step 4: Score bullets from ALL experiences (not just top 3)
      // Tags allow precise matching across the whole library
      const topExps = scoredExps.filter(se => se.score >= 15);

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

      // Step 6: Generate tailored CV text — now includes profile, formations, languages
      let outputCvText: string;
      try {
        outputCvText = await generateTailoredCV(plan, parsedJob, mode, openai, outputLength ?? "balanced", customMaxChars, {
          profileName: profileData?.name,
          profileTitle: profileData?.title,
          profileSummary: profileData?.summary || undefined,
          formations,
          languages: langs,
        });
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
