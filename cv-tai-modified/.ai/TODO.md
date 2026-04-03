# TODO

## Current focus
- Fiabiliser le moteur de tailoring sur 5 axes : encodage de sortie, bruit du scraping d'annonce, non-regression entre mode fidele et optimise, separation entre ATS optimise et preuves reelles du profil, et restitution resultat par axes (`Fit offre` / `ATS` / `Credibilite`).

## In progress
- Des changements non commites existent deja dans le moteur, l'API et l'interface result.
- Le prochain agent doit commencer par ces fichiers avant toute autre analyse :
  - `client/src/pages/result.tsx`
  - `server/routes.ts`
  - `server/tailoring-engine.ts`
- Nouvelle direction produit a respecter :
  - `Fit offre` est la metrique principale visible
  - afficher l'ATS final sans le confondre avec le fit
  - `Credibilite recruteur` est un etat discret, pas un score principal
  - borner le fit par les preuves source (bullets + skills deja presents), pas par les keywords injectes apres coup
  - utiliser le contexte de mission comme preuve secondaire uniquement, jamais au niveau d'un bullet
  - afficher une cause principale explicite + une action recommandee

## Next
- Rejouer le cas EY / role adjacent pour verifier qu'un `polished` n'explose plus artificiellement le score quand l'ATS vient surtout d'injections de keywords.
- Verifier que l'ecran Result affiche bien `Fit offre` en principal, `ATS` en secondaire, `Credibilite recruteur` en badge, et masque le legacy `confidence`.
- Verifier que l'export d'analyse inclut `Fit offer score`, `Recruiter credibility`, `Primary cause`, `Secondary causes` et `Recommended action`.
- Verifier qu'un contexte mission riche peut faire remonter un `adjacent` de maniere mesurée, sans transformer un mismatch en bon match.
- Verifier que l'analyse/export affichent bien le `Mission context support`.
- Verifier que les exports d'analyse montrent bien `ATS score`, `ATS final score`, `ATS boost` et `Injected keywords`.
- Verifier dans l'UI Tailor que `Intro / Resume pro` et `Corps (experiences)` restent memorises apres refresh/navigation.
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
- Le build local reste non verifiable tant que `tsx` est absent; la prochaine verification utile passe par Railway ou par reinstall des bins de dev.

## Touched files
- `CLAUDE.md`
- `client/src/pages/result.tsx`
- `client/src/pages/tailor.tsx`
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
