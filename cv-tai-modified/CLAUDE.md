# CV Tailor

## Source of truth
- Memoire canonique du projet pour les agents.
- Lire ensuite `.ai/TODO.md`, puis `.ai/LAST_CHANGES.md`, puis le diff git.
- Garder ces fichiers courts. Si un detail n'est plus utile pour agir, il doit disparaitre.

## Mission produit
Generer un CV cible auquel l'utilisateur fait confiance sans relecture lourde.

## Objectif utilisateur
- Postuler vite, souvent, sans repasse manuelle systematique.
- Avoir un repere rapide pour savoir si une offre vaut le coup.
- Recevoir surtout un CV cible credible, pas une analyse a dissquer pendant 10 minutes.

## Principe central
- Le produit, c'est le CV genere.
- Le score visible est un repere rapide de triage, pas une verite.
- L'utilisateur ne doit pas avoir a corriger le moteur pour qu'il marche.

## Vision enrichissement library
- L'utilisateur ecrit ses bullets lui-meme dans la library.
- Le LLM ne doit pas reecrire librement la library.
- Le LLM peut aider a :
  - tagger
  - evaluer
  - suggerer
- La library reste la source de verite du profil.

## Philosophie de scoring grounded
- Le score visible ne doit plus etre pilote par un `ProfileFrame` ou par un overlap theorique entre listes LLM.
- Le score visible doit juger le **CV genere** qui va etre envoye.
- Le moteur genere toujours une base `fidele`, puis une version `optimisee` si demandee.
- Un evaluateur unique juge les deux versions dans le **meme passage** pour limiter la derive.
- Le verdict final sert a choisir la meilleure version visible, pas a theoriser le profil.

## Axes internes utiles
- `pertinence` : repere de triage. Repond a "est-ce que ce document vaut le coup ?"
- `fitMetier` : proximite entre le vrai travail de l'offre et ce que prouvent les bullets source + le CV final.
- `fitNiveau` : coherence de niveau du document pour ce poste.
- `evidenceGrounding` : ancrage du document final dans les preuves reellement visibles du profil.
- `recruiterCredibilityScore` : credibilite du document final pour un recruteur humain.
- `overstatementRisk` : frein de securite si le document survend le profil.
- `ats` / `atsReadiness` : signal secondaire, jamais souverain seul.
- `forcePreuve` et `credibiliteCv` restent des alias de compatibilite dans certains payloads, mais la lecture produit doit se faire avec `grounding + credibility + risk`.

## Surface produit
- `Pertinence` = score visible principal.
- `Badge document` = `probant` / `a_renforcer` / `fragile`.
- `ATS` = axe secondaire.
- `Pre-check` = triage rapide `go` / `prudence` / `faible_chance`, jamais verdict final.
- Le score visible sert au triage rapide. Le vrai produit reste le CV genere.

## Hierarchie de preuve
- Preuve forte : bullets source ecrits par l'utilisateur
- Preuve secondaire : `experience.description`
- Indices faibles : titres, tags, skills
- Optimisation finale : utile pour ATS, jamais suffisante seule pour prouver le fit

## Interpretation produit
- `Pertinence` doit surtout repondre a : "est-ce que ca vaut le coup ?"
- Le `badge document` doit surtout repondre a : "est-ce que le CV genere est assez probant ?"
- Un score surprenant sur une offre tres proche du profil est un signal de bug moteur probable.
- Un hors-scope qui remonte haut est un signal de bug moteur probable.
- Le score seul ne suffit jamais pour juger la qualite du systeme : toujours relire aussi le CV genere.
- Si `optimise` n'apporte rien ou abime le document, fallback silencieux sur `fidele`.

## Guardrails absolus
- Ne jamais inventer metriques, scope, produits ou achievements.
- Ne jamais transformer un hors-scope en bon fit via keywords.
- Ne jamais degrader le resultat visible en mode optimise.
- Ne jamais demander a l'utilisateur de corriger le moteur pour qu'il marche.
- Ne jamais faire confiance au titre seul si le corps de l'annonce dit autre chose.
- Ne jamais faire passer l'ATS avant la credibilite humaine.

## A ne pas refaire
- Ne pas retuner des seuils/caps sur un mini-batch de quelques offres design: ca overfit vite.
- Ne pas laisser `evidence` ou des hard caps decider seuls du fit: ca cree des falaises absurdes.
- Ne pas exposer une nouvelle logique visible avant de la valider sur le corpus reel.
- Ne pas juger le moteur sur le score seul: toujours relire aussi le CV genere.
- Ne pas confondre `profil global`, `CV actuel`, `CV optimise` et `ATS final`.
- Ne plus laisser `ProfileFrame -> fitMetier` piloter la facade visible: ca a cree des scores incoherents sur Beelix / Thales.
- Ne pas comparer `fidele` et `optimise` via deux appels separes si on peut les juger dans le meme passage.

## Regles produit
- Le score visible doit surtout repondre a : "est-ce que ca vaut le coup ?"
- Le badge doit repondre a : "le document genere est-il assez probant ?"
- Si l'optimisation n'ameliore pas le document, fallback silencieux sur le mode fidele.
- Les sous-scores servent au raisonnement interne et au debug, pas a encombrer l'UI.
- Le pre-check est un triage prudent, pas un verdict metier definitif.
- Le badge doit rester conservateur: mieux vaut sous-promettre que laisser partir un mauvais CV.
- Le score visible doit etre explicable par le document final. S'il contredit le CV genere, c'est un bug de moteur.

## Vision moteur
- Positioning adaptatif : consultant / lead / IC / manager
- Intentions profondes en plus des seuls keywords ATS
- Scoring hybride : deterministe + LLM
- Allocation de budget par pertinence reelle
- Coherence narrative du profil
- Reformulation adaptee, toujours ancree dans le reel

## Contraintes de rollout
- Toute grosse refonte se valide d'abord sur le corpus reel avant d'etre prise pour acquise.
- Toujours comparer :
  - score visible
  - badge document
  - CV genere
  - coherence inter-source si meme offre
- Toute divergence forte entre historique, pre-check et page resultat doit etre consideree comme une incoherence produit.
- La cible de calibration vivante est versionnee dans `analysis/calibration_targets_2026-04-05.md`.

## Pipeline
1. `parseJobDescription`
2. `hybridScoreAllBullets`
3. `allocateCharBudget`
4. `selectBullets`
5. `buildStructuredCV`
6. `reformulateBullets`
7. `applyPostRules`
8. `renderCVText`
9. Evaluation V3 du resultat (`pertinence`, badge, diagnostic)

## Fichiers critiques
- `server/tailoring-engine.ts`
- `server/routes.ts`
- `client/src/pages/result.tsx`
- `client/src/pages/tailor.tsx`
- `client/src/pages/library.tsx`
- `shared/schema.ts`
- `shared/routes.ts`

## Roadmap courte
- Valider V3 sur corpus reel
- Stabiliser le scraping et son quality gate
- Multi-user / auth propre
- Accept / reject bullet
- Embeddings semantiques

## Questions encore ouvertes
- L'evaluateur `generated_cv_v1` doit encore etre eprouve sur le batch reel.
- Le badge document doit encore etre teste contre de vrais cas `bon CV / mauvais score` et `mauvais CV / score flatteur`.
- Le calibrage du malus `overstatementRisk` doit rester surveille pour ne pas recasser `Alan` / `TheFork`.

## Reprise rapide
1. Lire `CLAUDE.md`
2. Lire `.ai/TODO.md`
3. Lire `.ai/LAST_CHANGES.md`
4. Lire `git status --short`
5. Lire `git diff --name-only`
6. Ne regarder que les fichiers du diff et leurs dependances directes

## Commandes utiles
- `npm run check`
- `npm run build`
- `npm run dev`
- `npm run db:push`
