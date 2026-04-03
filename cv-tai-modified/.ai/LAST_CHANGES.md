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
