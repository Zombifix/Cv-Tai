# TODO

## Current focus
- Fiabiliser le moteur de tailoring sur 3 axes : encodage de sortie, bruit du scraping d'annonce, et non-regression entre mode fidele et optimise.

## In progress
- Des changements non commites existent deja dans le moteur, l'API et l'interface result.
- Le prochain agent doit commencer par ces fichiers avant toute autre analyse :
  - `client/src/pages/result.tsx`
  - `server/routes.ts`
  - `server/tailoring-engine.ts`

## Next
- Verifier en vrai sur une offre scrapee que le texte nettoye commence bien au contenu metier et non aux cookies/navigation.
- Verifier qu'un run `polished` ne sort plus avec une confiance inferieure au baseline `original` a contenu equivalent.
- Verifier dans l'UI Result que les libelles encore mojibake sont bien repares par le passage DOM (`CV genere`, suivi candidature, diagnostics).
- Installer les deps de dev ou remettre `tsc` dispo pour relancer `npm run check`.

## Known risks / checks
- Ne pas ecraser des changements utilisateur deja presents dans le worktree.
- Verifier `npm run check` apres modification TypeScript significative.
- Verifier les flows impactes quand `server/routes.ts` ou `server/tailoring-engine.ts` changent.
- Verifier les flows UI impactes quand `client/src/pages/result.tsx` change.
- `npm run check` est actuellement bloque car `tsc` n'est pas disponible dans l'environnement.
- Le nettoyage de texte scrape repose sur une heuristique; surveiller les annonces non-WTTJ/LinkedIn pour faux positifs.

## Touched files
- `client/src/pages/result.tsx`
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
