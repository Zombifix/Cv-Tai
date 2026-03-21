# CV Tailor

## Overview
Full-stack MVP for tailoring CVs to job postings. Uses a Super-CV Library of work experiences, bullet points, and skills. An AI-powered tailoring engine (Groq LLM) selects and optimizes the best content to match a target job description.

## Architecture
- **Frontend**: React + Vite + shadcn/ui + TanStack Query + wouter
- **Backend**: Express + Drizzle ORM + PostgreSQL (with pgvector extension)
- **AI**: Groq API (llama-3.3-70b-versatile) via OpenAI-compatible client

## Key Files
- `shared/schema.ts` - Data models (experiences, bullets, skills, jobPosts, runs)
- `shared/routes.ts` - API route definitions with Zod schemas
- `server/routes.ts` - Express route handlers
- `server/tailoring-engine.ts` - CV tailoring pipeline (parseJob → scoreExperiences → scoreBullets → buildPlan → generateCV → generateReport + LLM health check)
- `server/storage.ts` - Database CRUD operations (IStorage interface)
- `client/src/pages/library.tsx` - Super-CV Library with Smart Import
- `client/src/pages/tailor.tsx` - Job input page with LinkedIn URL normalization
- `client/src/pages/result.tsx` - Tailored CV output + Optimization Report
- `client/src/lib/parse-experience-format.ts` - Client-side format detection for Smart Import

## Features
1. **Super-CV Library**: CRUD for experiences, bullets, skills
2. **Smart Import**: Paste raw text/JSON to create experiences (supports free text, single JSON, multi-experience JSON)
3. **CV Tailoring**: Paste a job description → AI selects best bullets, generates CV text
4. **3 Smart Presets**: Quick (original+compact), Standard (polished+balanced, default), Deep (adaptive+detailed) — chosen replaces old 6-option form, persisted to localStorage
5. **Dynamic Composition Limits**: Compact=2 exps/4 bullets, Balanced=3/8, Detailed=4/12 (driven by COMPOSITION_LIMITS table)
6. **Optimization Report**: Sticky summary card + Selected Experiences → Missing Skills → Matched Skills → Rejected Experiences/Bullets → Keywords
7. **Inline CV Editing**: Pencil icon toggles the CV panel into a live textarea editor
8. **Source Bullets Tab**: Second tab in CV panel shows original library bullets that were selected before any rewriting
9. **History Page** (`/history`): Lists all past tailored CVs with role, company, mode badge, confidence bar, date — click to view
10. **LinkedIn URL Normalization**: Auto-converts collection URLs to direct job view URLs

## Environment Variables
- `GROQ_API_KEY` - Required for AI features
- `SESSION_SECRET` - Session management
- `DATABASE_URL` - PostgreSQL connection (auto-configured)

## API Endpoints
- `GET /api/llm/health` - LLM provider health check (confirms Groq connectivity, returns provider/model/baseUrl/apiKeyPresent/success/rawText/responseTimeMs)

## Tailoring Pipeline (2-Level Matching)
Limits: max 3 experiences, max 3 bullets per experience, max 8 bullets total.
Fallback: if no bullets meet threshold, uses top bullets from best experience (never crashes).

1. `normalizeLinkedInUrl()` - Convert LinkedIn collection URLs
2. `parseJobDescription()` - Extract title, company, seniority, domain, responsibilities, required/preferred skills, keywords, **language** (EN/FR)
3. `scoreExperiences()` - Score each experience for relevance (role similarity, **industry similarity**, **brand proximity**, seniority, skills, recency)
4. `scoreBulletsInExperiences()` - Score bullets ONLY within top 3 experiences (not globally)
5. `buildCompositionPlan()` - Build coherent CV: targeted title, short job-specific AI summary (max 40 words), max 3 sections with max 3 bullets each, filtered relevant skills, rejected bullets/experiences, fallback flag, confidence reasoning
6. `generateTailoredCV()` - Generate formatted CV text:
   - Safe mode: preserves original wording exactly, only reorders
   - ATS mode: light rewriting to embed keywords, no hallucination
7. `generateOptimizationReport()` - Structured report with: confidence score + reasoning, fallback flag, detected language (EN/FR), job parsing results, detected keywords panel (required skills, preferred skills, responsibilities, domain keywords), matched/missing skills, selected/rejected experiences with reasons + aspects, selected/rejected bullets with scores/reasons, tips

## Notes
- Embeddings are currently disabled (returns all zeros). Vector columns exist in DB but unused.
- The model used is `llama-3.3-70b-versatile` (previous `llama-3.1-70b-versatile` was decommissioned).
- Smart Import uses `llama-3.2-90b-vision-preview` for text parsing.
- No "Fallback:" or debugging labels should ever appear in generated CV output.
- Skills in the generated CV are filtered: only user library skills that match the job or appear in selected bullets are included. No unrelated generic skills (e.g., Node.js for a Product Designer role).
- Pipeline logging uses `[TAILOR]` prefix with detailed step-by-step output for debugging.
- Language detection: CV output language matches job description language (FR or EN). Summary, bullet rewrites, section titles, and skills wording all follow detected language.
- Experience scoring includes industry similarity and brand proximity signals (balanced, not overweighting prestige).
- Result page renders CV with formatted typography (styled headings, bullet dots, skill badges) instead of raw markdown.
- Report panel: experiences are expandable cards showing their bullets; detected keywords panel shows required/preferred/responsibilities/domain keywords with colored badges.
