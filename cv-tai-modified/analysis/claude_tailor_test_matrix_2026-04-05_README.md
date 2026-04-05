# Claude Tailor Test Matrix - 2026-04-05

## Purpose
This dataset consolidates the CV Tailor review packs exported from `C:\Users\theop\Downloads` and joins them with the human reference scores from `debrief_product_design_v2.csv`.

The goal is to let Claude review:
- how the tailor behaves across many offers
- where `original` vs `polished` diverge
- where the engine is too harsh or too generous
- where out-of-scope roles and level mismatches are not penalized enough

## Files
- CSV: [claude_tailor_test_matrix_2026-04-05.csv](/C:/Users/theop/OneDrive/Documents/GitHub/Cv-Tai/cv-tai-modified/analysis/claude_tailor_test_matrix_2026-04-05.csv)
- This note: [claude_tailor_test_matrix_2026-04-05_README.md](/C:/Users/theop/OneDrive/Documents/GitHub/Cv-Tai/cv-tai-modified/analysis/claude_tailor_test_matrix_2026-04-05_README.md)

## Important context
- One row per review pack file, plus a few `reference_only` rows when a human reference exists but no matching review pack was found locally.
- Duplicates are expected in the CSV because some files in `Downloads` are duplicate copies of the same run. They are intentionally kept and flagged so Claude can ignore or collapse them.
- `offer_group` is the normalized offer slug used to compare runs that belong to the same job family.
- The dataset includes both in-scope product design jobs and deliberate out-of-scope stress tests:
  - communication / brand
  - finance / controlling
  - strategy consulting
  - project / delivery
  - stage / intern / junior level mismatch cases

## Meaning of the human reference scores
These are the user's intended definitions and should be treated as the reference truth layer.

- `reference_score_bullets_actuels`
  - What ChatGPT would likely rate the user's current CV at today, with the same underlying information the tailor has access to.
  - This is not the user's market value.
  - This is the perceived current proof level of the existing CV material.

- `reference_score_bullets_retravailles`
  - What the score could become if the user manually rewrote/adapted the bullets to the offer better.
  - This is not the current tailor output.
  - This represents realistic upside from better wording and targeting, without changing the underlying truth.

- `reference_score_profil_global`
  - The user's true market fit for the role, independently of CV quality.
  - This is the user's estimated real level for that job family.
  - The tailor should not automatically try to reach this score if the current CV does not prove it yet.

## How Claude should interpret the tailor
The right comparison logic is:
- first compare tailor output to `reference_score_bullets_actuels`
- then check whether `polished` approaches a reasonable part of `reference_score_bullets_retravailles`
- do not expect the tailor to equal `reference_score_profil_global` unless the current CV already proves it strongly

## Key columns
- `row_type`
  - `run`: real exported review pack
  - `reference_only`: human reference without a matching local review pack

- `pack_file`
  - Original exported markdown filename from `Downloads`

- `run_id`
  - Tailor run identifier

- `possible_duplicate_run`
  - `yes` if the same `run_id` appears in more than one file

- `offer_group`
  - Normalized grouping key used to compare the same offer across copies or modes

- `test_context`
  - Derived context label to help Claude:
    - `core product design test`
    - `out_of_scope communication/brand test`
    - `out_of_scope finance/control test`
    - `out_of_scope + level mismatch test`
    - `adjacent project/delivery test`
    - etc.

- `fit_offer_score`
  - Main fit score exposed by the new scoring model

- `confidence_legacy`
  - Legacy confidence field kept for older packs or backward compatibility

- `ats_score`
  - ATS evidence score tied more closely to what the library actually proves

- `ats_final_score`
  - ATS score after optimization / wording / keyword coverage in the final CV

- `semantic_score`
  - Semantic bullet-level similarity signal

- `recruiter_credibility`
  - Discrete credibility output from the tailor

- `primary_diagnosis`, `primary_cause`
  - Main diagnosis emitted by the engine

- `what_matches`, `what_missing`, `next_actions`, `tips`
  - Flattened review-pack sections for easier CSV sharing

- `group_original_fit_best`, `group_polished_fit_best`
  - Best observed fit within the same `offer_group` for each mode

- `group_fit_delta_polished_minus_original_best`
  - Useful to detect regressions where polished underperforms original

- `analysis_flags`
  - Derived helper flags for Claude, such as:
    - `optimized_regression`
    - `possibly_too_high_for_out_of_scope`
    - `level_mismatch_not_penalized_enough`
    - `likely_under_scored_vs_current_cv_reference`
    - `reference_without_run`

## What Claude should focus on
1. Cases where `polished < original`
2. In-scope product design roles that are still clearly under-scored versus `reference_score_bullets_actuels`
3. Out-of-scope roles that remain too high
4. Stage / junior roles that should trigger stronger level mismatch logic
5. Repeated generic diagnoses such as `bullets_too_generic` or `competences metier critiques absentes`
6. Whether scrape quality is too optimistic

## Suggested reading order for Claude
1. Read this README
2. Open the CSV
3. Filter `row_type=run`
4. Group by `offer_group`
5. Inspect `analysis_flags`
6. Compare `fit_offer_score` against the human reference columns
