# TODO

## Current focus
- Assurer une reprise rapide entre Codex et Claude sans reanalyse complete du repo.

## In progress
- Des changements non commites existent deja dans le moteur, l'API et l'interface tailor/result.
- Le prochain agent doit commencer par ces fichiers avant toute autre analyse :
  - `client/src/pages/result.tsx`
  - `client/src/pages/tailor.tsx`
  - `server/routes.ts`
  - `server/tailoring-engine.ts`

## Next
- Verifier l'intention exacte des changements en cours sur les fichiers modifies.
- Continuer a enrichir ce fichier des qu'une tache demarre, change de scope, ou se termine.
- Garder les items courts et orientes action.

## Known risks / checks
- Ne pas ecraser des changements utilisateur deja presents dans le worktree.
- Verifier `npm run check` apres modification TypeScript significative.
- Verifier les flows impactes quand `server/routes.ts` ou `server/tailoring-engine.ts` changent.
- Verifier les flows UI impactes quand `client/src/pages/result.tsx` ou `client/src/pages/tailor.tsx` changent.

## Touched files
- `client/src/pages/result.tsx`
- `client/src/pages/tailor.tsx`
- `server/routes.ts`
- `server/tailoring-engine.ts`
- `CLAUDE.md`
- `AGENTS.md`
- `.ai/TODO.md`
- `.ai/LAST_CHANGES.md`

## Product backlog
- [ ] Autocompletion des tags
- [ ] Scraping fallback propre
- [ ] Multi-user / auth
- [ ] Accept / reject bullet par l'utilisateur
- [ ] Embeddings semantiques (`pgvector`)
