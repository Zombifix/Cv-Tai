# Calibration Targets — 2026-04-05

## Purpose
Ground the current `generated_cv_v1` calibration on concrete buckets instead of retuning ad hoc on a few noisy runs.

## Current visible logic
- `Pertinence` is driven primarily by:
  - `fitMetier`
  - `recruiterCredibilityScore`
  - `evidenceGrounding`
- `ATS` is secondary.
- `overstatementRisk` is a real negative signal.
- Contextual caps:
  - `same`: no cap
  - `adjacent`: max `78`
  - `different`: max `35`

## Target buckets
| Offer bucket | Offer examples | Target score band | Target badge |
| --- | --- | --- | --- |
| Strong fit | Alan | 80-88 | `probant` |
| Strong fit but fragile | Thales, TheFork | 72-82 | `a_renforcer` or selective `probant` |
| Partial credible | Beelix, Razer | 60-75 | `a_renforcer` |
| Adjacent weak | Behaviour, EdTech | 40-65 | `fragile` or low `a_renforcer` |
| Poor fit | EDF | 0-25 | `fragile` |

## Hard assertions
- `optimise` must never be worse than `fidele`
- same offer, close runs: max delta `5`
- same offer, two modes: same verdict bucket
- `Behaviour` must never be `probant`
- `EDF` must never exceed `25`
- `Beelix` must never exceed `75` until mobile grounding is clearly stronger
- `Alan` must stay in the high band
- `Thales` must not return `different`, but must not become "quasi parfait" by default

## Reading rules
- High `ATS` with low grounding and high risk is an anti-signal, not a success
- `probant` should stay rare and deserved
- Adjacent roles must not collapse into the same 75-85 zone
- If score and document disagree, trust the document first and recalibrate the score

## Review output expected for each run
- visible score
- badge
- `recruiter_credibility`
- `evidence_grounding`
- `overstatement_risk`
- final verdict
- expected bucket vs actual bucket
