# Claude Tailor Test Batch - Post Algo - 2026-04-05

## Scope
This file is a focused batch of new tests run after the recent tailor engine changes.

It is intentionally separate from the larger historical matrix so Claude can reason about:
- the newest algorithm behavior
- whether the recent changes improved or degraded the engine
- how the new batch behaves on intentionally challenging roles

## Files
- CSV batch: [claude_tailor_test_batch_post_algo_2026-04-05.csv](/C:/Users/theop/OneDrive/Documents/GitHub/Cv-Tai/cv-tai-modified/analysis/claude_tailor_test_batch_post_algo_2026-04-05.csv)
- Historical matrix: [claude_tailor_test_matrix_2026-04-05.csv](/C:/Users/theop/OneDrive/Documents/GitHub/Cv-Tai/cv-tai-modified/analysis/claude_tailor_test_matrix_2026-04-05.csv)

## Batch composition
This batch contains 10 review packs:
- Beelix: original + polished
- Thales: original + polished
- Everbridge Compliance: original + polished
- Decathlon Graphic Designer: original + polished
- Behaviour Interactive / Dead by Daylight: original + polished

## Why these jobs were chosen
This wave was designed to challenge the new algorithm on:
- adjacent product design roles
- UI-heavy cases
- specialized gaming UX
- clearly out-of-scope roles
- a non-matching compliance role

## Human reference meaning
The reference columns come from `debrief_product_design_clean.csv`.

- `reference_score_bullets_actuels`
  - How the current CV would likely be rated today, without optimization
- `reference_score_bullets_retravailles`
  - What the score could become if the user manually adapted the bullets better
- `reference_score_profil_global`
  - The true market fit of the profile, independently of current CV wording

Important:
- The tailor should first be compared to `reference_score_bullets_actuels`
- It can move toward `reference_score_bullets_retravailles`
- It should not be expected to equal `reference_score_profil_global` automatically

## Key helper flags
- `optimized_regression`
  - polished is lower than original for the same offer
- `too_high_for_out_of_scope`
  - likely still too generous on a role that should be much lower
- `possibly_too_high_for_specialized_gaming_ux`
  - the engine may be overvaluing generic UX overlap in a niche gaming role
- `possibly_too_low_for_adjacent_ui_case`
  - the engine may be too harsh on a UI-adjacent design role
- `under_scored_vs_reference_current_cv`
  - fit seems clearly below the expected current-CV reference
- `no_human_reference_match`
  - no clean reference row was matched for this test

## What Claude should focus on
1. Cases where polished regresses
2. Whether Beelix and Thales are under-scored versus their current-CV reference
3. Whether Behaviour is too high because gaming UX is a specialized niche
4. Whether Decathlon and Everbridge are correctly rejected
5. Whether the diagnoses are still too generic
