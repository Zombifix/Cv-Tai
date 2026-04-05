# TODO

## Current focus
- Le score visible est maintenant recable sur une evaluation du CV genere, pas sur `ProfileFrame`
- Le score visible est un triage; le CV reste le vrai produit
- Calibration V3 recentree sur `fitMetier + recruiterCredibilityScore + evidenceGrounding`, avec `overstatementRisk` comme frein reel
- Nouveau pass grounded : nettoyage d'encodage, selection moins generique et garde-fous `lead` / `PM`
- Nouveau pass legitimite : `optimise` peut maintenant re-selectionner les preuves, pas seulement rewriter les memes bullets
- Warnings durs visibles : `junior_scope_mismatch`, `lead_scope_underproven`, `pm_scope_underproven`, `niche_domain_underproven`, `text_integrity_issue`

## In progress
- Pipeline refactorise : evaluation `fidele` / `optimise` dans le meme passage
- `Pertinence` et badge document derives du document final + preuve source
- Badge durci : `probant` devient conservateur
- Pre-check recable en verdict produit `go / prudence / faible_chance`
- `Optimise humain` : selection dediee + summary dedie + reformulation plus ambitieuse mais toujours ancree
- La page Result affiche maintenant la decision moteur (`fidele` / `optimise rejete` / `optimise retenu`) et les warnings prioritaires
- Page `Tailoring` refondue en mode fast lane, avec backup local de l'ancienne version
- Page `Historique` refondue pour un triage plus rapide, avec backup local de l'ancienne version
- `npm run check` et `npm run build` passent

## Next
- Rejouer le batch grounded : `Alan`, `Thales`, `Beelix`, `TheFork`, `Razer`, `Behaviour`, `EdTech`, `EDF`
- Verifier que `Pertinence` suit enfin la qualite du CV genere sur ces cas
- Verifier que `analysis/calibration_targets_2026-04-05.md` tient bien sur les runs reels
- Verifier la nouvelle ergonomie Tailor sur desktop + mobile avec un vrai usage rapide
- Verifier la nouvelle ergonomie Historique sur desktop + mobile avec un vrai usage de triage
- Verifier `0` cas `polished < original`
- Verifier que les hors-scope restent bas sans faux positifs
- Verifier que les adjacents credibles remontent sans survente
- Verifier le badge document contre la qualite humaine reelle du CV
- Verifier que les roles `lead` proches metier mais faibles en scope redescendent en `a_renforcer`
- Verifier que la selection garde moins de bullets "bons partout" et plus de preuves specifiques au role
- Verifier que `optimise` change vraiment la strategie de preuve sur les cas proches, pas juste le wording
- Verifier que `optimise` ne sort plus inferieur a `fidele` sur `Cdiscount`, `Dashlane`, `Skillcorner`, `Lacoste`
- Verifier que les CV ne sortent plus avec mojibake (`Ã`, `â€™`, `�`, controles)
- Verifier la coherence inter-source sur les doublons d'offre
- Verifier le pre-check et `scrapeQuality` sur des annonces propres vs bruitees
- Clarifier la source des bullets dupliques dans le pack debug / export review

## Known risks / checks
- Le pre-check garde encore un coeur legacy pour la vitesse, meme si son langage produit est maintenant aligne
- L'evaluateur `generated_cv_v1` reste un appel LLM : toujours garder le fallback legacy et controler ses sorties
- `fitMetier` ne doit plus redevenir une theorie sur le profil; il doit rester ancre dans le CV final + les bullets source
- `Badge document` doit rester conservateur
- `ATS` reste utile mais ne doit plus remonter artificiellement des documents mal ancres
- Le fix d'encodage repare la plupart des mojibake courants, mais ne peut pas ressusciter un caractere deja perdu en amont du scrape
- Les garde-fous `lead` / `PM` sont generiques : surveiller toute sur-correction sur des roles hybrides
- Les warnings durs doivent rester des caps generiques, pas devenir des cas speciaux caches par annonce
- Le pack debug peut encore raconter une fausse histoire si la provenance des bullets selectionnes est polluee par des doublons inter-experiences
- Auth toujours non multi-tenant (`userId` absent des tables coeur)
- Railway peut encore diverger local/prod sur cookies et version Node

## Do not repeat blindly
- Relever / baisser des caps sur quelques cas design a deja cree de l'overfit
- Laisser `evidence` ecraser tout le reste a deja produit des cliff effects
- Basculer l'UI avant validation batch a deja cree du drift entre moteur et facade
- Faire du `ProfileFrame` visible la source principale du score a deja donne des scores absurdes sur des cas proches
- Juger `fidele` et `optimise` dans deux logiques differentes a deja cree du drift et des regressions inutiles
- Lire un `ATS 100` comme un succes produit a deja masque des CV trop survendus

## Touched files
- `client/src/components/layout.tsx`
- `client/src/pages/library.tsx`
- `client/src/pages/history.tsx`
- `.ai/backups/history-page-2026-04-05.tsx`
- `server/tailoring-engine.ts`
- `client/src/pages/result.tsx`
- `server/routes.ts`
- `client/src/pages/tailor.tsx`
- `client/src/hooks/use-tailor.ts`
- `.ai/backups/tailor-page-2026-04-05.tsx`
- `CLAUDE.md`
- `.ai/TODO.md`
- `.ai/LAST_CHANGES.md`
- `analysis/calibration_targets_2026-04-05.md`

## Product backlog
- [ ] Autocompletion des tags
- [ ] Scraping fallback propre
- [ ] Multi-user / auth
- [ ] Accept / reject bullet
- [ ] Embeddings semantiques (`pgvector`)
