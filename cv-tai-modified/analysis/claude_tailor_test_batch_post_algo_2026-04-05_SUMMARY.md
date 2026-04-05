# Tailor Batch Conclusion - Post Algo - 2026-04-05

## Quick read
This new batch is mixed.

The engine is better than before at rejecting clearly out-of-scope roles, but it still has two important weaknesses:
- it can still regress in `polished` versus `original`
- it remains too harsh on some adjacent design roles, while being a bit too generous on certain niche overlaps

## Case-by-case reading

### Beelix
- Original: `48`
- Polished: `48`
- Human reference current CV: `70`

Conclusion:
- The engine is clearly under-scoring this case.
- This looks like a real adjacent product design / mobile / UI role that should land higher.
- Diagnosis `Experience proche mais preuves trop faibles` is directionally right, but the score is still too low.

### Thales
- Original: `33`
- Polished: `31`
- Human reference current CV: `75`

Conclusion:
- This is the most obvious under-scored adjacent case in the batch.
- The role is UI-heavy and system-oriented, which should be meaningfully adjacent to the current profile.
- Polished regressing below original is a product bug.

### Everbridge Compliance
- Original: `15`
- Polished: `14`
- No matched human reference for this specific role

Conclusion:
- This rejection looks healthy.
- The engine is correctly treating compliance as far outside scope.
- `scrapeQuality=uncertain` also makes sense here.

### Decathlon Graphic Designer
- Original: `23`
- Polished: `25`
- Human reference current CV: `30`

Conclusion:
- This is globally coherent.
- The role is out of scope enough that a low score is expected.
- Slight improvement in polished is acceptable here.

### Behaviour Interactive / Dead by Daylight
- Original: `57`
- Polished: `44`
- Human reference current CV: `58`

Conclusion:
- Original is not absurd, but probably a bit generous given the gaming specialization.
- Polished collapsing to `44` is again a regression problem.
- The engine does not yet know how to say:
  - strong generic UX overlap
  - but specialized gaming UX mismatch

## Main conclusion
The new algorithm is doing better on hard rejections, but it is not yet stable enough on adjacent roles.

The most important patterns in this batch are:
1. `polished` can still be worse than `original`
2. adjacent design roles are still often under-scored
3. specialized niches like gaming UX are not modeled cleanly enough
4. the diagnosis language remains too generic to explain the true reason

## Product takeaway
The engine is improving at saying `no`.
It is still not good enough at saying:
- `yes, but adjacent`
- `yes, but under-proven`
- `yes on craft, no on niche domain`

That is likely the next maturity step.
