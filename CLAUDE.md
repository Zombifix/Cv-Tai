# CV Tailor — Vision & Objectifs

## Projet 
Outil de tailoring de CV : l'IA sélectionne et adapte intelligemment
les expériences et bullets d'une librairie personnelle pour les aligner
sur une offre d'emploi donnée.

## Objectif nord
Produire un CV en lequel l'utilisateur a confiance sans avoir à relire —
qui passe l'ATS ET accroche un recruteur humain.

## Vision produit — Enrichissement
### Principes
- L'utilisateur écrit ses bullets lui-même — le LLM ne reformule jamais
  dans la librairie. L'utilisateur écrit mieux que le LLM pour son propre
  contexte.
- Le LLM a un rôle limité et fiable : tagger (mots-clés ATS) + évaluer
  (5 critères : clarté, contexte, scope, impact, complétude) + suggérer.
- Contraintes : 60-200 caractères par bullet, max 5 bullets par expérience.
- Quick check déterministe en liste (pas de chiffre, trop court, pas de tags)
  — feedback instantané sans appel LLM.
- Les axes de mission sont pré-extraits de la description pour guider
  l'utilisateur.

## Vision du moteur de tailoring
### Principes
- **Positioning adaptatif** : le moteur détecte si l'offre est consultant /
  lead / IC / manager et adapte le scoring, le résumé, et la reformulation.
  Un profil consultant met en avant structuration et accompagnement,
  pas delivery.
- **Intentions** : au-delà des mots-clés ATS, le moteur extrait les
  intentions profondes de l'offre ("structurer les pratiques design",
  "influencer les stakeholders", "mesurer l'impact business").
  Le scoring matche les bullets contre ces intentions.
- **Scoring hybride** : déterministe (tags + text + description context +
  intentions) + LLM (pertinence sémantique). Si le LLM fail, le CV
  tient quand même.
- **Budget-aware** : allocation proportionnelle à la pertinence (strong
  bullets count × recency), pas juste à la récence. À 2000 chars →
  bullets impact uniquement. À 3000+ chars → storytelling et contexte.
- **Description context** : la description de l'expérience est utilisée
  comme signal de scoring même si les bullets ne mentionnent pas
  directement les mots-clés.
- Sélection dynamique des bullets selon la pertinence réelle.
- Reformulation adaptative (légère à forte) selon le delta entre le
  bullet et l'offre — jamais d'invention, toujours ancré dans le réel.
- Cohérence au profil : le CV raconte une trajectoire, pas une liste
  de mots-clés.
- Résumé pro adaptatif : le résumé s'adapte au positioning de l'offre,
  pas un texte générique.

### Ce que le moteur ne doit jamais faire
- Inventer des métriques, des noms de produits ou des achievements absents
- Injecter des phrases descriptives dans les compétences
- Mixer les langues dans un même CV
- Sélectionner des bullets qui se répètent entre expériences
- Ignorer le positioning (traiter une offre conseil comme une offre IC)

## Stack technique
- Backend : Node.js / Express / TypeScript
- LLM : OpenAI gpt-4o-mini (via OPENAI_API_KEY)
- BDD : PostgreSQL via Drizzle ORM
- Frontend : React / Vite / TailwindCSS
- Déploiement : Railway (branch main → auto-deploy)

## Architecture tailoring (pipeline 8 étapes)
1. parseJobDescription → titre, skills, keywords, intentions[], positioning
2. hybridScoreAllBullets → score déterministe + LLM pour chaque bullet
3. allocateCharBudget → budget chars par expérience (pertinence × récence)
4. selectBullets → sélection + déduplications par dimension
5. buildStructuredCV → résumé adaptatif + skills dédupliquées
6. reformulateBullets → reformulation orientée positioning (mode optimisé)
7. applyPostRules → injection keywords manquants, troncature
8. renderCVText → rendu texte final

## Fichiers clés
- server/tailoring-engine.ts — pipeline complet
- server/routes.ts — API endpoints
- client/src/pages/library.tsx — page bibliothèque (accordéon + panneau)
- client/src/pages/tailor.tsx — page tailoring
- shared/schema.ts — schéma DB (Drizzle)
- shared/routes.ts — contrats API (Zod)
- server/storage.ts — couche DB

## Roadmap (priorités)
### Done
1. [done] Swap Groq → OpenAI gpt-4o-mini
2. [done] Fix skills injection (filtrer non-skills)
3. [done] Fix skills dedup (quasi-doublons)
4. [done] Enrichissement bullets via experience.description
5. [done] Guardrails summary anti-hallucination
6. [done] Champ extraContext dans le formulaire tailor
7. [done] Flow enrichissement simplifié (user writes, LLM tags + evals)
8. [done] Panneau latéral 3 modes (axes / liste / édition)
9. [done] Positioning adaptatif (consultant / lead / IC / manager)
10. [done] Intentions dans le scoring
11. [done] Budget allocator par pertinence (strong bullets)
12. [done] Quick check déterministe (sans LLM)
13. [done] Limites 60-200 chars, max 5 bullets
14. [done] Auto-tag on save
15. [done] UI polish (tags agrandis, chevron, tri stable, espacement)

### À faire
16. [done] Cohérence narrative entre expériences (Jaccard dedup cross-experiences)
17. [done] Sélection budget-adaptive (compact ≤2000 = impact only, rich >3000 = storytelling)
18. [done] Nettoyage code mort (ancien endpoint /enrich supprimé)
19. [ ] Autocomplétion des tags (réutiliser existants)
20. [ ] Scraping fallback propre
21. [ ] Multi-user / auth — near-term : partage avec 2-3 personnes, base pour SaaS futur
22. [ ] Accept/reject bullet par l'utilisateur
23. [ ] Embeddings sémantiques (pgvector)
