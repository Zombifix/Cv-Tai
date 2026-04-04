# TODO

## Current focus
- Fiabiliser le moteur de tailoring sur 5 axes : encodage de sortie, bruit du scraping d'annonce, non-regression entre mode fidele et optimise, separation entre ATS optimise et preuves reelles du profil, et restitution resultat par axes (`Fit offre` / `ATS` / `Credibilite`).
- Stabiliser les `criticalKeywords` entre sources d'annonce equivalentes pour eviter les ecarts de score injustifies (cas Pix / Adobe).

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
- Rejouer les cas Pix (WTTJ vs LinkedIn) pour verifier que les `criticalKeywords` convergent maintenant vers un noyau stable et que la bande de `Fit offre` ne diverge plus artificiellement.
- Rejouer les cas Adobe pour verifier que les faux keywords critiques type diplome/HR ont disparu et que le score remonte legerement sans faux positif.
- Verifier en prod que login/register redirigent maintenant bien vers `/library` au lieu de rester silencieusement sur `/login`.
- Verifier en prod que la connexion fonctionne a nouveau apres ajout de `trust proxy` / cookie session Railway, puis confirmer que les endpoints proteges (`/api/check-match`, `/api/tailor/*`) ne renvoient plus `401` a tort.
- Verifier sur Railway que l'erreur de build `Unexpected smart quote` sur `runFastDryRun` a disparu et qu'aucune seconde erreur serveur ne suit.
- Rejouer le cas EY / role adjacent pour verifier qu'un `polished` n'explose plus artificiellement le score quand l'ATS vient surtout d'injections de keywords.
- Verifier que l'ecran Result affiche bien `Fit offre` en principal, `ATS` en secondaire, `Credibilite recruteur` en badge, et masque le legacy `confidence`.
- Verifier que l'export d'analyse inclut `Fit offer score`, `Recruiter credibility`, `Primary cause`, `Secondary causes` et `Recommended action`.
- Verifier qu'un contexte mission riche peut faire remonter un `adjacent` de maniere mesurÃ©e, sans transformer un mismatch en bon match.
- Verifier que l'analyse/export affichent bien le `Mission context support`.
- Verifier que les exports d'analyse montrent bien `ATS score`, `ATS final score`, `ATS boost` et `Injected keywords`.
- Verifier dans l'UI Tailor que `Intro / Resume pro` et `Corps (experiences)` restent memorises apres refresh/navigation.
- Verifier en vrai sur une offre scrapee que le texte nettoye commence bien au contenu metier et non aux cookies/navigation.
- Verifier en prod que la page Result n'affiche plus de libelles mojibake visibles dans `Fit offre`, `Points d'attention`, `Mots-cles detectes`, `Ameliorer la bibliotheque` et les badges de langue/seniorite.
- Verifier en prod qu'une annonce LinkedIn longue est maintenant reformatee en sections lisibles (`Votre mission`, `Vos responsabilites`, `Profil`, `Infos LinkedIn`) au lieu d'un bloc de 50 lignes parasite.
- Verifier en prod que l'onglet `Annonce utilisee` affiche d'abord une synthese structuree issue du report (titre, missions, competences, intentions), avec le texte brut seulement en vue secondaire.
- Verifier qu'un run `polished` ne sort plus avec une confiance inferieure au baseline `original` a contenu equivalent.
- Result: purger les libelles mojibake visibles directement dans `client/src/pages/result.tsx` et eviter toute reparation DOM globale.
- Installer les deps de dev ou remettre `tsc` dispo pour relancer `npm run check`.

## Known risks / checks
- L'auth ajoutee ne partitionne pas encore les donnees par utilisateur : les tables coeur (`profile`, `experiences`, `bullets`, `skills`, `runs`) n'ont pas de `userId`, donc le login agit actuellement comme une porte d'entree globale, pas comme une isolation multi-tenant.
- Ne pas ecraser des changements utilisateur deja presents dans le worktree.
- Verifier `npm run check` apres modification TypeScript significative.
- Verifier les flows impactes quand `server/routes.ts` ou `server/tailoring-engine.ts` changent.
- Verifier les flows UI impactes quand `client/src/pages/result.tsx` change.
- `npm run check` est actuellement bloque car `tsc` n'est pas disponible dans l'environnement.
- Le nettoyage de texte scrape repose sur une heuristique; surveiller les annonces non-WTTJ/LinkedIn pour faux positifs.
- La nouvelle logique distingue `keywords prouves` et `ATS final`; surveiller les regressions UI/export qui supposeraient encore un seul score ATS.
- Le contexte mission compte maintenant comme preuve secondaire dans la confiance; surveiller qu'il aide a desambiguiser sans surponderer des descriptions trop marketing.
- Le build local reste non verifiable tant que `tsx` est absent; la prochaine verification utile passe par Railway ou par reinstall des bins de dev.
- Railway peut continuer a builder en `22.11.0` malgre `package.json`; un pin explicite `.nvmrc` a ete ajoute pour forcer `22.12.0`.

## Touched files
- `CLAUDE.md`
- `server/index.ts`
- `client/src/App.tsx`
- `client/src/pages/auth.tsx`
- `server/tailoring-engine.ts`
- `client/src/pages/result.tsx`
- `client/src/pages/tailor.tsx`
- `server/routes.ts`
- `server/tailoring-engine.ts`
- `.nvmrc`
- `AGENTS.md`
- `.ai/TODO.md`
- `.ai/LAST_CHANGES.md`

## Product backlog
- [ ] Autocompletion des tags
- [ ] Scraping fallback propre
- [ ] Multi-user / auth
- [ ] Accept / reject bullet par l'utilisateur
- [ ] Embeddings semantiques (`pgvector`)
