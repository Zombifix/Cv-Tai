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

### Result UI mojibake hardening
- Quoi : correction des derniers textes visibles casses dans les cartes de diagnostic, mots-cles et suggestions, puis application de `repairMojibake` sur plusieurs champs dynamiques (`tips`, `insight`, badges langue/seniorite, skills affiches)
- Fichiers : `client/src/pages/result.tsx`, `.ai/TODO.md`, `.ai/LAST_CHANGES.md`
- Impact : la page Result doit afficher un texte lisible meme quand le backend ou le scrape remonte encore du texte partiellement mal encode
- Verification : `git diff --check -- client/src/pages/result.tsx`

### Job posting cleanup for LinkedIn scrapes
- Quoi : refonte de `cleanJobPostingForAnalysis` pour couper les preambles LinkedIn, supprimer les blocs de connexion/recommandations, et reformatter l'annonce en sections lisibles avec une zone `Infos LinkedIn`
- Fichiers : `client/src/pages/result.tsx`, `.ai/TODO.md`, `.ai/LAST_CHANGES.md`
- Impact : l'onglet `Annonce utilisee` doit afficher une version beaucoup plus compacte et lisible des scrapes LinkedIn au lieu d'un pavé parasite
- Verification : revue manuelle du nettoyeur + `git diff --check -- client/src/pages/result.tsx`

## 2026-04-04

### Reliability update - scrape quality and pre-check softening
- Quoi : ajout d'un vrai signal de qualite de scrape (`good` / `uncertain` / `bad`), reparation d'encodage et dedup des lignes dans `sanitizeJobText`, puis enrichissement de `/api/check-match` avec un pre-check nuance (`viability`, `shouldWarn`, `warningMessage`, `precheckMode`) et fallback vers `runDryRunCheck` quand le fast check hesite
- Fichiers : `server/routes.ts`, `server/tailoring-engine.ts`, `client/src/hooks/use-tailor.ts`, `client/src/pages/tailor.tsx`, `client/src/pages/result.tsx`, `.ai/TODO.md`
- Impact : le formulaire Tailor ne doit plus afficher des warnings absurdes sur des offres viables, les annonces partiellement bruitees sont explicites, et l'UI Result expose maintenant la fiabilite du scrape au lieu de laisser penser que toutes les sources se valent
- Verification : `git diff --check`; verification runtime a faire sur des cas reels avec annonce propre vs annonce bruitee, plus comparaison pre-check avant/apres sur le corpus existant

### Reliability update - baseline non-regression hardening
- Quoi : le baseline interne du pipeline est reconstruit explicitement en mode `original`, puis le candidat `polished` n'est retenu que s'il n'est pas inferieur au baseline sur `fitOffer` ET `confidence`
- Fichiers : `server/tailoring-engine.ts`
- Impact : reduit fortement le risque de voir un run `optimise` sortir moins bon qu'un run `fidele` a contenu equivalent
- Verification : revue manuelle du diff; verification runtime a faire sur une meme offre en `fidele` puis `optimise`

### TypeScript baseline restored
- Quoi : installation locale des deps de dev pour relancer le check, ajout de `target: ES2020` dans `tsconfig.json`, declaration minimale pour `pdf-parse`, et correction de deux details de typage (`Result` + `insertUserSchema`)
- Fichiers : `tsconfig.json`, `shared/pdf-parse.d.ts`, `shared/schema.ts`, `client/src/pages/result.tsx`
- Impact : `npm run check` repasse au vert et le repo retrouve une base de verification locale fiable pour les prochaines modifs
- Verification : `npm run check`

### Final pre-push cleanup
- Quoi : correction des derniers libelles visibles mojibake dans `tailor.tsx`, ajout de `dist/` au `.gitignore`, et verification finale complete du repo avant push
- Fichiers : `client/src/pages/tailor.tsx`, `.gitignore`
- Impact : la page Tailor n'affiche plus de texte casse dans le toast, le CTA ou le dialog de pre-check, et les artefacts de build ne polluent plus le worktree
- Verification : `git diff --check`, `npm run check`, `npm run build`

### Tailor coherence pass for duplicated offers
- Quoi : stabilisation des `criticalKeywords` a partir du `roleFrame` / `requiredSkills`, filtrage des faux keywords critiques (diplomes / signaux RH), et matching canonique par synonymes dans le scoring / post-rules / dry-run
- Fichiers : `server/tailoring-engine.ts`, `.ai/TODO.md`, `.ai/LAST_CHANGES.md`
- Impact : deux sources d'une meme offre doivent produire un noyau de keywords plus proche et donc un `Fit offre` plus coherent; les annonces comme Adobe ne doivent plus elevser des termes comme `Design School Degree` au rang de preuve coeur metier
- Verification : revue manuelle du moteur; verification runtime encore a faire sur les cas Pix et Adobe

### Auth UX redirect fix
- Quoi : redirection automatique vers `/library` apres login/register reussi et protection de la route `/login` quand une session existe deja
- Fichiers : `client/src/pages/auth.tsx`, `client/src/App.tsx`, `.ai/TODO.md`, `.ai/LAST_CHANGES.md`
- Impact : evite l'impression que les boutons `S'inscrire` / `Se connecter` "ne font rien" alors que l'auth peut avoir reussi; l'utilisateur est renvoye vers l'app des qu'une session est presente
- Verification : revue manuelle du flow; verification navigateur a faire en prod

### Railway auth session hardening
- Quoi : ajout de `trust proxy` et du mode `proxy`/`sameSite=lax` sur la session Express pour que les cookies securises fonctionnent derriere Railway
- Fichiers : `server/index.ts`, `.ai/TODO.md`, `.ai/LAST_CHANGES.md`
- Impact : la connexion ne doit plus boucler ou echouer silencieusement en production a cause d'un cookie de session non pose; les donnees existantes ne sont pas supprimees par ce correctif
- Verification : revue manuelle du code; verification runtime a faire en prod via login/register puis appel a une route protegee

### Railway build fix for runFastDryRun
- Quoi : reparation du bloc `runFastDryRun` corrompu par des guillemets intelligents / mojibake dans `server/tailoring-engine.ts`
- Fichiers : `server/tailoring-engine.ts`, `.ai/TODO.md`, `.ai/LAST_CHANGES.md`
- Impact : le build serveur ne doit plus casser sur `Unexpected "“"` autour de `Pick<TailorInput, "jobText" | "allExperiences" | "allBullets">`
- Verification : revue manuelle du bloc corrige; verification finale a faire sur Railway car `tsx` reste indisponible localement

### Railway Node version pin
- Quoi : ajout d'un fichier `.nvmrc` pour pousser Railway/Nixpacks a utiliser Node `22.12.0`
- Fichiers : `.nvmrc`, `.ai/TODO.md`, `.ai/LAST_CHANGES.md`
- Impact : evite de rester sur `22.11.0` alors que `vite@7.3.x` demande `>=22.12.0`
- Verification : a confirmer dans les prochains logs de build Railway

### Result job tab structured summary
- Quoi : finalisation de l'onglet `Annonce utilisee` en branchant une vue structuree derivee du report (`jobTitle`, `responsibilities`, `requiredSkills`, `criticalKeywords`, `intentions`) avant le texte brut, plus un durcissement local sur le message de scrape
- Fichiers : `client/src/pages/result.tsx`, `.ai/TODO.md`, `.ai/LAST_CHANGES.md`
- Impact : le candidat voit d'abord une annonce lisible et synthetisee, sans perdre l'acces au texte scrape original quand il veut verifier la source
- Verification : revue manuelle du diff; verification navigateur a faire sur un run avec `outputReportJson` complet
