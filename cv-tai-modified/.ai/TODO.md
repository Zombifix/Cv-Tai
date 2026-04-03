# TODO

## Current focus
- Fiabiliser le moteur de tailoring sur 4 axes : encodage de sortie, bruit du scraping d'annonce, non-regression entre mode fidele et optimise, et separation entre ATS optimise et preuves reelles du profil.

## In progress
- Des changements non commites existent deja dans le moteur, l'API et l'interface result.
- Le prochain agent doit commencer par ces fichiers avant toute autre analyse :
  - `client/src/pages/result.tsx`
  - `server/routes.ts`
  - `server/tailoring-engine.ts`
- Nouvelle direction produit a respecter :
  - afficher l'ATS final sans le confondre avec le score de confiance
  - borner la confiance par les preuves source (bullets + skills deja presents), pas par les keywords injectes apres coup
  - utiliser le contexte de mission comme preuve secondaire uniquement, jamais au niveau d'un bullet

## Next
- Rejouer le cas EY / role adjacent pour verifier qu'un `polished` n'explose plus artificiellement le score quand l'ATS vient surtout d'injections de keywords.
- Verifier qu'un contexte mission riche peut faire remonter un `adjacent` de maniere mesurée, sans transformer un mismatch en bon match.
- Verifier que l'analyse/export affichent bien le `Mission context support`.
- Verifier que les exports d'analyse montrent bien `ATS score`, `ATS final score`, `ATS boost` et `Injected keywords`.
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
- La nouvelle logique distingue `keywords prouves` et `ATS final`; surveiller les regressions UI/export qui supposeraient encore un seul score ATS.
- Le contexte mission compte maintenant comme preuve secondaire dans la confiance; surveiller qu'il aide a desambiguiser sans surponderer des descriptions trop marketing.

## Touched files
- `CLAUDE.md`
- `client/src/pages/result.tsx`
- `server/routes.ts`
- `server/tailoring-engine.ts`
- `AGENTS.md`
- `.ai/TODO.md`
- `.ai/LAST_CHANGES.md`

## Product backlog
- [ ] Autocompletion des tags
- [ ] Scraping fallback propre
- [ ] Multi-user / auth
- [ ] Accept / reject bullet par l'utilisateur
- [ ] Embeddings semantiques (`pgvector`)
