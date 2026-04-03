# Last Changes

## 2026-04-03

### Repo memory bootstrap
- Quoi : ajout d'une memoire partagee pour la reprise rapide entre agents
- Fichiers : `CLAUDE.md`, `AGENTS.md`, `.ai/TODO.md`, `.ai/LAST_CHANGES.md`
- Impact : Codex et Claude peuvent repartir d'un contexte stable + d'une memoire locale au lieu de reanalyser tout le repo
- Verification : fichiers crees, pas de test runtime necessaire

### Snapshot worktree existant
- Quoi : etat observe du repo avant nouvelles modifications produit
- Fichiers : `client/src/pages/result.tsx`, `client/src/pages/tailor.tsx`, `server/routes.ts`, `server/tailoring-engine.ts`
- Impact : le prochain agent doit inspecter uniquement ces fichiers en priorite
- Verification : `git status --short` et `git diff --name-only` consultes

### Tailoring reliability pass
- Quoi : correction du calcul ATS apres injection de keywords, fallback anti-regression pour le mode optimise, nettoyage du texte d'annonce scrape, et reparation d'encodage cote resultat/export
- Fichiers : `server/tailoring-engine.ts`, `server/routes.ts`, `client/src/pages/result.tsx`
- Impact : le report doit mieux correspondre au CV final, le mode optimise ne doit plus sortir moins bon que son baseline interne, et les exports/resultats affichent moins de mojibake
- Verification : revue manuelle du diff; `npm run check` non executable car `tsc` absent dans l'environnement

### Result UI mojibake fallback
- Quoi : ajout d'une reparation DOM sur la page Result et d'un composant de suivi candidature en texte ASCII propre
- Fichiers : `client/src/pages/result.tsx`
- Impact : les libelles encore casses comme `Tu as postule avec ce CV ?`, `CV genere` et les diagnostics reportes doivent s'afficher correctement meme si la source contient encore du mojibake
- Verification : revue manuelle du diff; pas de verification navigateur dans cet environnement

### ATS vs preuves source
- Quoi : separation entre keywords critiques prouvees par la bibliotheque et keywords ajoutees par optimisation, avec cap de confiance quand l'ATS final depasse trop les preuves reelles
- Fichiers : `server/tailoring-engine.ts`, `client/src/pages/result.tsx`, `CLAUDE.md`, `.ai/TODO.md`
- Impact : le score global doit mieux refleter la credibilite recruteur, tout en continuant d'afficher l'ATS final du CV et son boost d'optimisation
- Verification : revue manuelle du diff; verification runtime encore a faire sur un cas adjacent type EY et `npm run check` toujours bloque par `tsc` absent

### Mission context as secondary evidence
- Quoi : prise en compte explicite du contexte de mission (`experience.description`) comme preuve secondaire dans la confiance, avec affichage du `Mission context support`
- Fichiers : `server/tailoring-engine.ts`, `client/src/pages/result.tsx`, `CLAUDE.md`, `.ai/TODO.md`
- Impact : les descriptions de mission aident a desambiguiser ou renforcer un fit adjacent sans compter autant qu'un bullet et sans faire exploser artificiellement la credibilite
- Verification : revue manuelle du diff; verification runtime a faire sur un cas adjacent ou les bullets sont courts mais la description mission est informative

### Build fix parseJobDescription
- Quoi : correction d'une erreur de syntaxe dans le prompt `parseJobDescription` apres l'ajout de `roleFrame`
- Fichiers : `server/tailoring-engine.ts`
- Impact : le build serveur ne doit plus casser sur `Expected "]" but found ":"`
- Verification : revue manuelle du bloc corrige; rebuild Railway a relancer

### Tailor preferences persistence
- Quoi : memorisation locale des limites `Intro / Resume pro` et `Corps (experiences)` sur la page Tailor
- Fichiers : `client/src/pages/tailor.tsx`, `.ai/TODO.md`
- Impact : les valeurs saisies comme `300` et `2000` restent pre-remplies apres refresh ou retour sur la page
- Verification : revue manuelle du diff; verification navigateur a faire

### Result scoring split
- Quoi : refonte du report resultat pour afficher `Fit offre` comme score principal, `ATS` comme axe secondaire, `Credibilite recruteur` comme badge, et des causes explicites avec action recommandee
- Fichiers : `server/tailoring-engine.ts`, `client/src/pages/result.tsx`, `CLAUDE.md`, `.ai/TODO.md`
- Impact : le moteur separe mieux les preuves reelles du vernis ATS, l'UI masque le legacy `confidence`, et l'export IA embarque `Fit offer score`, `Recruiter credibility`, `Primary cause`, `Secondary causes`, `Recommended action`
- Verification : revue manuelle du diff; `npm run build` bloque localement car `tsx` absent dans l'environnement, verification runtime a faire sur Railway / environnement avec deps de dev

### Result UI label cleanup
- Quoi : suppression des libelles visibles encore mojibake sur la page Result, suppression d''un doublon corrompu de loading/error, et simplification de `repairMojibake` + `FormattedCV`
- Fichiers : `client/src/pages/result.tsx`, `.ai/TODO.md`, `.ai/LAST_CHANGES.md`
- Impact : les onglets/actions comme `CV genere`, `Copier`, `Ameliorer la bibliotheque` et les etats vides ne doivent plus afficher de texte casse
- Verification : `git diff --check -- client/src/pages/result.tsx`
