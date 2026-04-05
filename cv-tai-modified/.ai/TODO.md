# TODO

## Current focus
- V3 est active : juger la qualite du CV genere et la coherence de `pertinence`
- Le score visible est un triage; le CV reste le vrai produit

## In progress
- Pipeline V3 + UI Result branches sur `pertinence` et `badge document`
- Page `Tailoring` refondue en mode fast lane, avec backup local de l'ancienne version
- Page `Historique` refondue pour un triage plus rapide, avec backup local de l'ancienne version
- `npm run check` et `npm run build` passent

## Next
- Verifier la nouvelle ergonomie Tailor sur desktop + mobile avec un vrai usage rapide
- Verifier la nouvelle ergonomie Historique sur desktop + mobile avec un vrai usage de triage
- Rejouer le batch V3 : `Beelix`, `Thales`, `Behaviour`, `Everbridge`, `Decathlon`
- Verifier `0` cas `polished < original`
- Verifier que les hors-scope restent bas sans faux positifs
- Verifier que les adjacents credibles remontent sans survente
- Verifier le badge document contre la qualite humaine reelle du CV
- Verifier la coherence inter-source sur les doublons d'offre
- Verifier le pre-check et `scrapeQuality` sur des annonces propres vs bruitees

## Known risks / checks
- `ProfileFrame` est un point sensible : garder un mode debug inspectable
- Si `inferProfileFrame` tombe en fallback, la `pertinence` peut devenir artificiellement trop basse
- `fitMetier` ne doit pas devenir un score aux vibes
- `Badge document` doit rester conservateur
- Le pre-check `/api/check-match` reste legacy et peut diverger du score V3 final
- Auth toujours non multi-tenant (`userId` absent des tables coeur)
- Railway peut encore diverger local/prod sur cookies et version Node

## Do not repeat blindly
- Relever / baisser des caps sur quelques cas design a deja cree de l'overfit
- Laisser `evidence` ecraser tout le reste a deja produit des cliff effects
- Basculer l'UI avant validation batch a deja cree du drift entre moteur et facade

## Touched files
- `client/src/components/layout.tsx`
- `client/src/pages/library.tsx`
- `client/src/pages/history.tsx`
- `.ai/backups/history-page-2026-04-05.tsx`
- `server/tailoring-engine.ts`
- `client/src/pages/result.tsx`
- `server/routes.ts`
- `client/src/pages/tailor.tsx`
- `.ai/backups/tailor-page-2026-04-05.tsx`
- `CLAUDE.md`
- `.ai/TODO.md`
- `.ai/LAST_CHANGES.md`

## Product backlog
- [ ] Autocompletion des tags
- [ ] Scraping fallback propre
- [ ] Multi-user / auth
- [ ] Accept / reject bullet
- [ ] Embeddings semantiques (`pgvector`)
