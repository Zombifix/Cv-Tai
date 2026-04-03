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
