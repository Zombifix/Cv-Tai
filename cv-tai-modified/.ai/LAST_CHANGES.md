# Last Changes

## 2026-04-05

### Calibration pass grounded
- Quoi : recalibrage du moteur visible autour de `credibility + grounding + overstatement`, durcissement du badge, alignement du pre-check et ajout d'une cible de calibration versionnee
- Fichiers : `server/tailoring-engine.ts`, `server/routes.ts`, `client/src/pages/tailor.tsx`, `client/src/hooks/use-tailor.ts`, `client/src/pages/result.tsx`, `analysis/calibration_targets_2026-04-05.md`, `CLAUDE.md`, `.ai/TODO.md`
- Impact :
  - `Pertinence` n'est plus lue telle quelle depuis le LLM : elle est recalculee server-side depuis `fitMetier`, `recruiterCredibilityScore`, `evidenceGrounding`, `atsReadiness` et un malus fort `overstatementRisk`
  - cap visible par distance metier : `adjacent <= 78`, `different <= 35`
  - badge `probant` reserve aux documents vraiment credibles, bien ancres et peu survendus
  - diagnostic serveur reconstruit depuis une matrice simple pour eviter les contradictions score / verdict
  - guard `optimise` vs `fidele` freine aussi les regressions de risque de survente
  - `/api/check-match` expose maintenant `precheckVerdict` (`go / prudence / faible_chance`) et raconte enfin la meme philosophie produit que la page Result
  - la page Result met davantage en avant l'ancrage preuves, la credibilite et le risque de survente; l'ATS reste visible mais secondaire
  - ajout d'un artefact de calibration partageable dans `analysis/`
- Verification : `npm run check`, `npm run build`

### Grounded score reset
- Quoi : sortie du score visible hors du `ProfileFrame` / `fitMetier` theorique, et remplacement par une evaluation du CV genere
- Fichiers : `server/tailoring-engine.ts`, `client/src/pages/result.tsx`, `client/src/pages/tailor.tsx`, `CLAUDE.md`, `.ai/TODO.md`
- Impact :
  - `runTailorPipeline` n'utilise plus `ProfileFrame` comme source souveraine du score visible
  - le moteur evalue `fidele` et `optimise` dans le meme passage (`generated_cv_v1`)
  - le guard anti-regression choisit la version finale sur `pertinence + credibiliteCv + ATS final`
  - fallback legacy conserve si l'evaluateur du document final tombe
  - la page Result explique mieux la logique `document final + preuve source`
  - la modale de pre-check rappelle que le score avant generation reste un triage rapide, pas le verdict final
- Verification : `npm run check`, `npm run build`

### V3 visible rollout
- Quoi : activation complete de la V3 dans le pipeline et la page Result
- Fichiers : `server/tailoring-engine.ts`, `client/src/pages/result.tsx`
- Impact :
  - score visible = `pertinence`
  - badge visible = `probant` / `a_renforcer` / `fragile`
  - export IA enrichi avec `fitMetier`, `forcePreuve`, `credibiliteCv`, `distanceDomain`
  - fallback legacy conserve pour anciens runs
- Verification : `npm run check`, `npm run build`

### Memoire projet compacte
- Quoi : reduction volontaire de `CLAUDE.md`, `.ai/TODO.md`, `.ai/LAST_CHANGES.md`
- Fichiers : `CLAUDE.md`, `.ai/TODO.md`, `.ai/LAST_CHANGES.md`
- Impact :
  - philosophie V3 rendue explicite
  - duplication et historique verbeux supprimes
  - rappel court des approches a ne pas retester aveuglement
  - reprise d'agent moins couteuse en tokens
- Verification : revue manuelle

### CLAUDE.md re-equilibre
- Quoi : re-ajout des nuances produit essentielles apres une compression trop forte
- Fichiers : `CLAUDE.md`
- Impact :
  - mission "mass apply" mieux explicitee
  - distinction plus nette entre `pertinence`, badge document, ATS et preuves
  - garde-fous de rollout et questions encore ouvertes rendus plus visibles
- Verification : revue manuelle

### Review pass et coherence V3
- Quoi : revue complete du branchement V3 + corrections de coherence visibles
- Fichiers : `server/tailoring-engine.ts`, `client/src/pages/history.tsx`, `client/src/pages/tailor.tsx`, `.ai/TODO.md`
- Impact :
  - `fitNiveau` lit maintenant `job.seniority` au lieu de s'appuyer seulement sur `roleFrame.scopeSignals`
  - l'historique affiche `pertinence` quand elle existe, avec fallback legacy
  - le wording du pre-check est clarifie comme estimation de triage
  - les risques encore ouverts (`ProfileFrame` fallback, pre-check legacy) sont notes dans `TODO`
- Verification : `npm run check`, `npm run build`

### Naming UI harmonise
- Quoi : harmonisation du vocabulaire visible entre navigation, pages et tabs clefs
- Fichiers : `client/src/components/layout.tsx`, `client/src/pages/library.tsx`, `client/src/pages/history.tsx`, `client/src/pages/tailor.tsx`, `client/src/pages/result.tsx`
- Impact :
  - nav gauche : `Super CV`, `Tailoring`, `Historique`
  - bibliotheque : entree page `Super CV` + section `Experiences`
  - history : labels, CTA et etats vides alignes en francais
  - result : tab source renommee `Super CV utilise`
- Verification : revue manuelle + `npm run check`, `npm run build`

### Tailor fast lane UI
- Quoi : refonte ergonomique de la page `Tailoring` pour un usage plus rapide, plus compact et plus scannable
- Fichiers : `client/src/pages/tailor.tsx`, `.ai/backups/tailor-page-2026-04-05.tsx`, `.ai/TODO.md`
- Impact :
  - gros formulaire vertical remplace par un workspace principal + rail lateral sticky
  - annonce gardee au centre, reglages et CTA compactes sur le cote
  - meme logique produit conservee, sans changement du flow de generation
  - backup exact de la version precedente garde dans `.ai/backups/`
- Verification : `npm run check`, `npm run build`

### History triage UI
- Quoi : refonte ergonomique de la page `Historique` pour un triage plus rapide et plus lisible
- Fichiers : `client/src/pages/history.tsx`, `.ai/backups/history-page-2026-04-05.tsx`, `.ai/TODO.md`
- Impact :
  - hero plus utile avec resume rapide et CTA clair
  - lignes d'historique restructurees autour du poste, du mode, du statut, de la pertinence et du badge document
  - informations V3 mieux visibles sans noyer l'utilisateur dans des micro-details
  - mojibake `Postule` corrige au passage
  - backup exact de la version precedente garde dans `.ai/backups/`
- Verification : `npm run check`, `npm run build`

## 2026-04-04

### Reliability pass
- Quoi : quality gate de scrape, pre-check nuance, non-regression plus stricte, nettoyage d'encodage, corrections build/check
- Fichiers : `server/routes.ts`, `server/tailoring-engine.ts`, `client/src/pages/result.tsx`, `client/src/pages/tailor.tsx`, `server/index.ts`, `tsconfig.json`
- Impact :
  - meilleur signal scrape
  - moins de faux warnings pre-check
  - base locale `check/build` propre
  - auth/session Railway plus robuste
- Verification : `npm run check`, `npm run build`

## Note
- Historique ancien volontairement purge.
- Si un detail manque, regarder `git log` / le diff plutot que regonfler ce fichier.
