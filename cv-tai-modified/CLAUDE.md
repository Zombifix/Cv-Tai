# CV Tailor

## Source of truth
- Ce fichier est la memoire canonique du projet pour les agents.
- Ne pas dupliquer la vision produit ailleurs sauf pointeur minimal.
- Avant toute analyse large, lire ce fichier puis `.ai/TODO.md` puis `.ai/LAST_CHANGES.md`.

## Mission produit
Outil de tailoring de CV : l'IA selectionne et adapte intelligemment les experiences et bullets d'une librairie personnelle pour les aligner sur une offre d'emploi donnee.

## Objectif nord
Produire un CV en lequel l'utilisateur a confiance sans avoir a relire, qui passe l'ATS et accroche un recruteur humain.

## Principes produit
- L'utilisateur ecrit ses bullets lui-meme. Le LLM ne reformule jamais la librairie source.
- Le LLM a un role limite et fiable : tagger, evaluer, suggerer.
- Contraintes bullets : 60-200 caracteres, max 5 bullets par experience.
- Quick check deterministe sans appel LLM.
- Les axes de mission sont pre-extraits de la description.

## Vision moteur
- Positioning adaptatif : consultant, lead, IC, manager.
- Intentions profondes extraites au-dela des seuls mots-cles ATS.
- Scoring hybride : deterministe + LLM, avec fallback robuste si le LLM echoue.
- Budget-aware : allocation par pertinence reelle, pas uniquement par recence.
- Description context prise en compte dans le scoring.
- Selection dynamique des bullets.
- Reformulation adaptative, jamais inventee, toujours ancree dans le reel.
- Coherence narrative globale du profil.
- Resume pro adaptatif au positioning de l'offre.
- Evaluation de la distance au role via un `role frame` generique, pas via le titre seul :
  - objets de travail
  - livrables
  - decisions attendues
  - collaborateurs
  - environnement
  - amplitude / scope
- Hierarchie de preuve a respecter :
  - bullets source > contexte de mission / description > skills / titres > optimisation finale
- Justification : le titre de l'annonce peut etre bruite ou trompeur; le moteur doit faire davantage confiance au corps de l'annonce et aux preuves source qu'au titre ou au texte optimise final.

## Guardrails absolus
- Ne jamais inventer de metriques, noms de produits ou achievements absents.
- Ne jamais injecter de phrases descriptives dans les competences.
- Ne jamais mixer les langues dans un meme CV.
- Ne jamais selectionner des bullets qui se repetent entre experiences.
- Ne jamais ignorer le positioning.
- Ne jamais confondre compatibilite ATS optimisee et preuve reelle du profil : le score global doit rester borne par ce que la bibliotheque prouve vraiment.

## Hierarchie de preuve
- Les bullets ecrits par l'utilisateur sont la preuve principale.
- Le contexte de mission / `experience.description` est une preuve secondaire : il peut renforcer ou desambiguiser, mais ne doit pas compter autant qu'un bullet.
- Le titre du poste, les tags et autres metadata sont des indices faibles.
- Les optimisations finales de texte ne doivent jamais faire monter a elles seules la credibilite du match.

## Stack
- Backend : Node.js, Express, TypeScript
- LLM : OpenAI `gpt-4o-mini`
- BDD : PostgreSQL via Drizzle ORM
- Frontend : React, Vite, TailwindCSS
- Deploiement : Railway

## Pipeline tailoring
1. `parseJobDescription`
2. `hybridScoreAllBullets`
3. `allocateCharBudget`
4. `selectBullets`
5. `buildStructuredCV`
6. `reformulateBullets`
7. `applyPostRules`
8. `renderCVText`

## Fichiers critiques
- `server/tailoring-engine.ts`
- `server/routes.ts`
- `client/src/pages/library.tsx`
- `client/src/pages/tailor.tsx`
- `shared/schema.ts`
- `shared/routes.ts`
- `server/storage.ts`

## Roadmap produit
### Done
1. Swap Groq -> OpenAI `gpt-4o-mini`
2. Fix skills injection
3. Fix skills dedup
4. Enrichissement bullets via `experience.description`
5. Guardrails summary anti-hallucination
6. Champ `extraContext` dans le formulaire tailor
7. Flow enrichissement simplifie
8. Panneau lateral 3 modes
9. Positioning adaptatif
10. Intentions dans le scoring
11. Budget allocator par pertinence
12. Quick check deterministe
13. Limites 60-200 chars, max 5 bullets
14. Auto-tag on save
15. UI polish
16. Coherence narrative entre experiences
17. Selection budget-adaptive
18. Nettoyage code mort

### Remaining
19. Autocompletion des tags
20. Scraping fallback propre
21. Multi-user / auth
22. Accept / reject bullet par l'utilisateur
23. Embeddings semantiques (`pgvector`)

## Reprise rapide obligatoire
Quand un agent reprend le repo, il doit suivre cet ordre et s'arreter des qu'il a assez de contexte :
1. Lire `CLAUDE.md`
2. Lire `.ai/TODO.md`
3. Lire les entrees les plus recentes de `.ai/LAST_CHANGES.md`
4. Lire `git status --short`
5. Lire `git diff --name-only`
6. N'inspecter que les fichiers modifies, les fichiers cites dans `.ai/TODO.md`, et leurs dependances directes
7. Ne pas refaire une review globale du repo sauf demande explicite

## Discipline de memoire
- Apres chaque changement significatif, mettre a jour `.ai/TODO.md`
- Apres chaque changement significatif, ajouter une entree courte dans `.ai/LAST_CHANGES.md`
- Si rien n'a change dans le code mais qu'une decision produit ou technique a ete prise, la noter quand meme
- Garder les entrees factuelles, courtes et actionnables
- Preferer les listes courtes aux longs paragraphes

## Format attendu pour `.ai/TODO.md`
- `Current focus`
- `In progress`
- `Next`
- `Known risks / checks`
- `Touched files`
- `Product backlog`

## Format attendu pour `.ai/LAST_CHANGES.md`
Pour chaque entree :
- date
- quoi
- fichiers
- impact
- verification faite ou manquante

## Commandes utiles
- `npm run dev`
- `npm run check`
- `npm run build`
- `npm run db:push`

## Regle de cout
Objectif : minimiser le cout de contexte. Toujours repartir du diff et de la memoire locale avant toute reanalyse large.
