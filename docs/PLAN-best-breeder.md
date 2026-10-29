# Plan: the best auto breeder (2026-10-28)

Status: **built and measured 2026-10-29** (branch `feat/best-breeder`, head `9a534ff`; not pushed,
not installed). Build 1 (frictions) is on in Auto mode; Build 2 (strand bonus) is built and off; Build
3 is an opt-in experiment, "Market picks", off. Owner's goal: "the best freaking auto breeder on the
market": Auto mode should set herds up better than the player, without hands-off marks. Results:
section 14. Sections 2–13 are the research of 2026-10-28; where the measurements overturned them,
they say so and point to 14.

## 1. Bottom line

1.1. **The game breeds far less than the simulators assumed** (measured in 34 saves, 14.2): an
eligible wild dog leader pair litters in **0.48** of summers (assumed 0.74), with no Fertility effect
seen, and a mother never litters two summers running. A stable pair therefore gives at most **0.32
litters a pack-year**. Every gain in sections 4–8 was measured on the old rule and is too high.

1.2. **Build 1 does what it was built for** (dogs, measured facts, 24 paired seeds, `e59ccda`):
litters +30% to the stable-pair limit (0.31–0.32 a pack-year; today 0.24–0.25), pack-summers lost to
frictions 22–25 → 8 of 75, **no herd lost** (today's Auto mode loses 3 of 24 simulated herds), the
best 20 dogs +1.9 to +4.7 points. The whole-herd average gains little (−0.1 to +2.0): the herd it
holds is 8–13 dogs larger. Hyenas unchanged. **Passes 6.2 as restated (14.5) with the owner's
settings; default settings touch the Fertility limit** (−2.1 at year 15).

1.3. Results against the build order of 2026-10-28:

| Order | What | Expected (old rule) | Result (measured facts) | Default |
|---|---|---|---|---|
| 0 | Measure conception from the saves | | 0.48 a summer, mother skips the next summer (14.2) | |
| 1 | Remove the frictions (section 6) | +1.1, up to about +3 | Litters +30%, no herd lost, best 20 +1.9 to +4.7, whole herd −0.1 to +2.0: **pass** (14.5) | On in Auto mode |
| 2 | Strand-copy bonus (section 7) | about +1.9 on top of 1 | +0.4 / +0.1 (default), +0.9 / +1.7 (owner's) at years 15 / 25: **fail** (14.6) | Off |
| 3 | Targeted market buying (section 8) | +1.8 dogs, +4.7 hyenas | Rows carry strands (proven); one pick a year: hyenas +3.0 / +3.8 **pass**, dogs 0 **fail** (14.7) | Opt-in, off |

1.4. Ceiling (frictionless simulator, dogs, **old breeding rule, not re-run on the measured facts**):
89.4% after 15 dog-years and 94.2% after 25. A closed dog herd levels off near 94% (Fertility and
Immunity near 88%); closed hyenas near 82%.

1.5. Forecast for the owner's dogs (his settings, medians of 24 runs): 77.9 after 15 years and 78.0
after 25 with the new Auto mode; 77.2 and 76.0 with today's, which loses 3 of 24 herds (14.8).
Hyenas 74 / 75 at 15 / 25 years either way.

1.6. What now limits a herd: the litters' quality and the strands present, not frictions; the
search was already near-best (its pairs within about 0.01 of the best the herd could form). Next:
the in-game checks (14.10), hyena groups with no leader female (17% of group-quarters), and market
buys for hyenas.

## 2. The owner's herds (Halcyon Kalahari Cradle #2, saves of 2026-10-28)

| Herd | Animals | Herd average | V / L / F / I | Generations bred in the zoo | Born elsewhere |
|---|---|---|---|---|---|
| African wild dog (19:46) | 25 not past breeding | 74 | 79 / 72 / 71 / 73 | max 6, mean 3.8 | 4 |
| African wild dog (20:14, agent's count, pups in) | 35 | 72.7 | | | |
| Spotted hyena (19:46) | 25 | 67 | 65 / 74 / 69 / 59 | max 8, mean 4.9 | 4 |

2.1. "The zoo is 48 years old" does not mean 48 years of breeding: park years and animal ages do
not move together (16:34 → 19:30: Auto's clock +0.91 year, animal ages +0.23; 19:30 → 19:46:
clock +0.15, ages +0.84). Progress is per generation, and the dogs are 4–6 generations deep.

2.2. Weakest dogs (19:46): Sekelaga F4.5 50, Morowa F5.2 58, Tariro M5.5 63, Jumoke M2.6 63,
Rafiki M8.5 69, Masamba M5.2 69. Weakest hyenas: Jelani M2.9 42, Ayize M2.9 44, Baderinwa F2.9 48.
A parent's own Fertility / Immunity says little: Sekelaga (50, Immunity 17) is Sibusiso's best mate
(pups 72) because their strands differ.

## 3. Game facts verified on 2026-10-28

### 3.1. Genetics (from the saves: 424 parent-young trios, 1,696 genes)

| Fact | Evidence |
|---|---|
| A pup takes **one whole strand per gene from each parent** | 1,499 genes exact copies; 185 with one letter changed, 11 with two, 1 with three; only 1 fits a letter-by-letter mix and not whole strands |
| Mutation about **1.03% per letter**, to a random other letter | Binomial fit; good-to-bad 89 vs bad-to-good 35 only because good letters are commoner |
| Slot A is the mother's strand, slot B the father's | All 1,696 genes |
| The strand passed on is unbiased | Better strand 510 times, worse 531 |
| Genes assort independently | Maternal strand index agrees across gene pairs 46–52% of the time |
| Oddity | Locus 1 mutates about 1.7× as often (p ≈ 0.002, unexplained; check with more trios) |

3.1.1. Grades (`kincore.js` `ownGrades`, matching the game's `CompareMatesUIUtils.GetMinMaxGeneGrades`):
- **Vitality (Size) and Longevity** = good letters (A, B) on both strands / 12. A pup's expected
  grade is its parents' average: pairing alone cannot raise these; selection and stacking the best
  strand can. A "6/6 strand" has six good letters; two copies give 100%.
- **Fertility and Immunity** = loci where the two strands differ / 6 (heterozygosity). Not passed on
  additively: every litter reshuffles them.

3.1.2. Consequence for "Method 2" (Planet Zoo 1 guide, section 10): two 0% parents whose strands differ
at every locus give 100% pups in PZ2 too (XX × YY → XY), but only for one generation (XY × XY
averages 50%), the 0% parents count in the herd average, and a Fertility-0% parent conceives poorly.

3.1.3. Four strands per gene that differ from each other at every locus would give 100% Fertility /
Immunity from 100% parents for ever (pair animals that share no strand). The herds don't have them:

| Herd, gene | Strands differing at all 6 | Best 4-strand set (differ at ≥ 5 of 6), copies |
|---|---|---|
| Wild dog Fertility | 2 (ABAADA, BADBBB) | ABAADA ×5, CCBDBA ×3, AADBBB ×1, BCCCDB ×1 |
| Wild dog Immunity | 2 (ACBDAD, CBDBBA) | DBCDDA ×6, BACAAB ×9, ADBBCB ×1, ACADBD ×1 |
| Hyena Fertility | 2 | BABCAA ×4, ADADBA ×3, DADABD ×2, ABBACB ×1 |
| Hyena Immunity | 3 (DDADAD, ABCABB, BABCDC) | DDADAD ×7, ADCBBA ×2, CACAAB ×7, BABCDC ×2 |

Pups from such a set: 83–92%. Steering the herd toward it **lowered** it 0.5–2.1 points at year 15
(agent, 12 seeds): rejected. Two random strands differ everywhere 18% of the time, four at once
about 0.003%, so a full set must be bought.

### 3.2. Pack leadership (proven in game, the owner's alphas at 16:34 and 19:30)

| Rule | Evidence |
|---|---|
| A leader keeps the role while it stays, whoever joins | Wild Dog 03: Mosi and Chibeka led after Rafiki 7.7, Mapalo 7.7 and the former leaders Tariro and Thembile joined |
| Leadership does not move with an animal | Tariro and Thembile led Wild Dog 04, not 03 |
| An empty role goes to the eldest adult of that sex there | Gyasi 4.6 over Masamba 4.4 and two of 1.8; Ojore 1.6 and Asha once the older dogs had gone |
| Within days, not at once | No male leader shown at 16:34, yet Wild Dog 03's six pups (0.0 years at 19:30, gestation 0.21 y, 0.23 y later) are Mosi's |

3.2.1. The mod already planned this way; its first runs got the leaders they planned in all four
packs. Docs: `animals-and-breeding.md` (commit `cc95e1b`).

### 3.3. Species data (`animals.fdb`)

| | Wild dog | Spotted hyena |
|---|---|---|
| Lifespan | 12–17 | 12–20 |
| Maturity / elderly (infertile) | 1.5 / 10 | 3 / 12 |
| Litters | 1–6, summer only, InterBirthYears 1 | 1–3, all year, interbirth 0.95 |
| FertilityValue | 0.4 | 0.3 |
| Mating | Leader pair only, monogamous, mourning 4 seasons | Leader female only, no mourning |
| Group | 2–27; space 930 m² + 100 per extra | |
| Best Vitality / Longevity strand in the herd | 6/6 (6 copies) / 6/6 (2 copies: Matla L 5+6, Jabarl L 4+6) | 5/6 only / 6/6 (8 copies) |
| Random-pair pups' Fertility / Immunity | 62% / 61% | 61% / 64% |
| Closed-herd ceiling | about 95% | about 87% |

3.3.1. Corrected 2026-10-29 (14.2): InterBirthYears counts from the birth to the next conception,
so a dog mother cannot litter the summer after a litter. "InterBirthYears 1" means a litter every
other summer for a stable pair (0.32 a pack-year), not one a year. Summer is season index 1 (park
months 4–6).

### 3.4. How Auto mode behaved (and why the owner needed hands off)

| What happened | Cause |
|---|---|
| Matla moved out of the owner's new pen into Wild Dog 02 | The pen wasn't assigned to wild dogs: Auto never moves an animal **into** an unassigned habitat but may move one **out**; Asha's move to the pen hadn't happened, so Matla was alone there. **Fixed `08fdae9`** (6.3 a, 14.3) |
| The planner would split the proven pair Mosi × Chibeka (pups 77) to give Chibeka to Matla (81), leaving Amare × Thembile (64) to lead | Matla × Chibeka really is better (pups above the herd: 0.074 against 0.043); every leader pair adds its pups' value, so a weak extra pair still counts |
| Jabarl stayed in the trade centre unless a spare habitat existed | One breeding pair per pack; Auto can't build or ask for a habitat |
| Animals in quarantine are invisible to the plan | `prepare` takes only habitat / trade centre animals (`canMoveA`) |
| After a reload Auto's log was empty and Asha's fresh cooldown gone, so it planned to move her again | The saved ledger at 11.6 of 12 KB dropped the whole log first, then history in key order. **Fixed `73cfaef`** |
| Desk quick release crashed the game (2026-10-23, 2026-10-28) | Lua read the storage list during the game's rebuild. **Fixed `a5b611f`**: one call, no read until the page's view settles |

3.4.1. The player store holds **61,024 of 65,536** characters (Kalahari Cradle 37,146: assignments
25,120, Auto 11,726; Cradle #2 23,878: assignments 11,881, Auto 11,601). Over the cap the store
**drops the zoo written longest ago** (`pz2qol.playerstore.lua`): about 4,500 characters (about 17
more habitat assignments) from losing a whole zoo's assignments, pins and Auto settings. Assignment
fingerprints (5 GUIDs per habitat) could be cut to free about 15 KB. **Open risk.**

## 4. What was tested on 2026-10-28

All simulations: `scripts/dog_sim.mjs` (the real planner through `planAutoRun`, pack rules modelled)
from the 19:46 save, the owner's settings (Best genetics, Thin out strict), 15 dog-years.

4.0. Overturned in part (14.2): every simulator here lets a pair litter every summer at
(fM+fF)/12. The measured game gives 0.32 litters a pack-year against 0.74, the herds end lower (today's
Auto mode: 76–77 instead of 80–81 at year 15) and gains shrink. Results on the measured facts:
14.4–14.6.

### 4.1. Main session, 3 seeds each (seed spread about 2 points: treat as indicative)

| Test | Herd at year 15 | Note |
|---|---|---|
| Average young | 83 / 80 / 80 | |
| Push the ceiling, with its wait (the owner's setting) | 83 / 79 / 79 | The dogs' ceiling is 100%, so the wait never ends: this is Average young plus carrier keeping |
| Push the ceiling, never waiting | 82 / 79 / 81 | Longevity 86–91 but Vitality 69–83 |
| 2 extra packs | 82 / 77 / 76 | 63–67 litters vs 40–49 |
| 4 extra packs | 78 / 79 / 78 | 80–89 litters; more pairs = weaker pairs breed |
| A pair scores its pups **minus the herd mean** | herd died in 2 of 3 runs | 1–5 litters: nearly every pair looked like a loss |
| A pair scores only its pups **above** the herd (expected excess) | 4 packs 80 / 79 / 83; 6 packs 81 / 80 / 80 | Slight help with more packs only |

### 4.2. Brainstorm agent, 12 seeds each (± standard error)

| Config | y15 | y20 | y25 | V / L / F / I at y25 |
|---|---|---|---|---|
| Default | 80.9 ± 0.6 | 82.2 | 83.8 ± 0.6 | 87 / 85 / 84 / 79 |
| +2 packs | 81.1 ± 0.4 | | | |
| Thin out strict | 79.9 ± 0.7 | | | |
| Pair bonus λ 0.25 | 81.3 | 82.8 | 83.4 | 90 / 86 / 79 / 78 |
| Pair + keep bonus 0.25 | 81.1 | 82.5 | 83.3 | 91 / 89 / 79 / 74 |
| Pair + keep bonus 0.4 | 82.1 | 83.8 | 85.1 | 95 / 93 / 80 / 73 |
| Own-grade cull to 45 | 82.0 | 82.1 | 85.3 | 87 / 84 / 89 / 81 |
| Own-grade cull + pair 0.25 | 82.8 | 84.3 | 84.9 | 92 / 85 / 83 / 79 |
| Own-grade cull + pair 0.4 | 82.3 | 84.8 | 86.3 | 95 / 88 / 85 / 78 |

4.2.1. Diagnostics of the real planner (12 seeds): herd 77.6 / 79.9 / 80.9 at years 5 / 10 / 15
(frictionless 80.0 / 83.7 / 85.6); **58–68 of 75 breeding slots used** (year 1 lost all five litters;
7–13 more lost to mourning); mean breeder age 4.3–4.5 (frictionless 4.8); Thin out sends about 185
dogs in 15 years, **about a third above the herd mean** (27–29 aged 1.5–8, on average 4.5 points
below it).

4.2.2. Frictionless effects (change against 85.6 at year 15 and 89.0 at year 25):

| Change | y15 | y25 |
|---|---|---|
| Strand bonus | +2.2 | +3.7 (share of 6/6 copies at y15: V 19%→48%, L 28%→75%) |
| Market buying, dogs | +1.8 | +1.7 |
| Market buying, hyenas | +4.7 | +4.3 |
| Conception halved | −3.4 | −5.3 |
| First summer lost | −1.2 (6/6 Longevity share 28%→16%) | |
| Random 10% of slots lost | about 0 | |
| Real planner's gap | −4.7 (own-grade cull recovers 1.1, first summer about 1.2, about 2.4 unattributed) | |
| 8 packs in the same room | −1.9 | |
| 8 packs, room 70, young culled | +1.7 | |
| 3 packs | −1.6 | |
| Pairs kept until aged out | −1.0 (−3.1 with the strand bonus) | |
| Fertility/Immunity set management | −0.5 to −2.1 | |
| Kin rule off | −0.1 | |
| Breeding 3 pairs instead of 5 (contraception as selection) | −1.6 | |

4.2.3. By species: dogs are limited by strand spread and frictions; hyenas by supply (the strand
bonus **lowers** a closed hyena herd 2.6 at year 15; the market is worth +4.7).

### 4.3. The planner on the owner's saves (`scripts/dog_plan_once.mjs`)

| Setup | Plan |
|---|---|
| 19:45 save, Matla and Jabarl in the trade centre, no spare habitat | Matla × Chibeka in Wild Dog 04, Mosi split off, 7 moves + 6 waits |
| One spare habitat | Matla × Chibeka; Ojore × Asha into the spare; Jabarl waits |
| Two spare habitats | Matla × Chibeka, Jabarl × Mapalo, Ojore × Asha |
| Mosi, Chibeka hands off, one spare | Matla × Asha (Ojore steps down), Jabarl × Mapalo |
| 20:14 save (after Auto's 20:09 run), pins Mosi, Chibeka, Jabarl, Mapalo | Asha → Wild Dog 02 to lead with Matla; Gyasi & Thembile lead 03 (Amare, Tariro, Asim out) |

## 5. Why the herd plateaus near 80 (theory)

5.1. Breeder's equation: genetic gain per year = selection intensity × genetic spread × accuracy /
generation interval. Accuracy is 1 here (strands are visible), so the levers are: **selection
intensity** (who breeds, who is culled), **generation interval** (how fast young good animals
replace their parents as leaders), **supply** (the best strands present; the market), and the
number of litters actually produced (frictions, conception).

5.2. Fertility and Immunity sit near 75–85 under any policy: they are a property of each pup's two
strands, reshuffled every litter, so only strand supply and pairing for difference move them.
Vitality and Longevity rise only as fast as the best strands spread.

5.3. The herd average itself can be gamed: selling the weakest raises it with no genetic progress
(the top 20 animals sit 5–6 points above the herd). Compare policies at a fixed herd size, and
track two more numbers: the expected pups of this year's pairs (frictionless 77 / 81 / 84 at years
5 / 15 / 25) and the copies of the best strands.

## 6. Build 1: remove the frictions

6.1. Target: the 4.7-point gap between the real planner and a frictionless one.

| Item | What | Where | Evidence |
|---|---|---|---|
| a. Own-grade cull at a fixed herd size | Thin out keeps each herd at a target size by the animals' own grades (not only habitats over room); never above-average breeders first | `kincull.js` | +1.1 measured; a third of today's sends are above average |
| b. Never lose a breeding season | No restructure that changes leaders in the quarter before a seasonal species' breeding season; finish moves first | `kinautocore.js` (park calendar `A.cal`), species season data (find the DB field) | First summer lost: −1.2 and Longevity 6/6 share 28%→16% |
| c. Move the continuing breeder | When a leader pair must change, move the animal that will keep breeding, so its old mate's mourning (4 seasons) doesn't cost a litter | `kinprogramme.js` pack moves (`installChanges`) | 7–13 litters lost to mourning |
| d. Rotation by gain | Waive the 1-year cooldown when a move's expected gain is large (better young leaders replacing older ones) | `kinautocore.js` locks, `AUTO_LIMITS` | Pairs kept until aged out: −1.0 (−3.1 with the strand bonus) |
| e. Stage restructures | At most two packs restructured per run | `kinautocore.js` | Avoids losing several packs' litters at once |

6.1.1. Built 2026-10-29: all five items; a, b, c, e on in Auto mode, d off. Results per item: 14.3.

6.2. Test plan (12 paired seeds, 15 years, `brainstorm/tools/dog_sim_diag.mjs`): log every pack's
state each season and attribute the gap; add one change at a time. Pass as first written: at least
70 of 75 breeding slots used and year 15 at 83.3 or better. **Restated 2026-10-29 (14.5)**: that bar
assumed a litter every summer and cannot be met under the measured facts (a mother's wait alone
takes 9–14 of 75 pack-summers).

6.3. Also fix while there (owner's complaints, section 3.4):
- a. A habitat holding only this species that the player stocked by hand counts as one of its
  places (or Auto asks to assign it), so a new pen isn't emptied. **Built 2026-10-29** (14.3).
- b. A move the player makes counts as intent for Auto's 1-year cooldown, except putting back an
  escaped animal (the 2026-10-27 removal of "moved by you" was about escapees held 2 park years).
  Proposed to the owner, not yet decided.

## 7. Build 2: strand-copy bonus in the pair value

7.1. Pair value + λ × the pups' expected copies of the species' best Vitality and Longevity strands.
It is "optimal haploid value" for strands that don't recombine (section 10). Experimental code:
`brainstorm/strandbonus/.../kinprogramme.js` line 833 (`EXPERIMENT (brainstorm)`); a keep-value
variant in `kincull.js` line 288 was worse (Immunity to 73–74): **never in Thin out's keep value**.

7.2. Gate it off once the best strand is common (share of best-strand copies above 50%): the bonus
costs Fertility / Immunity and lowers a closed hyena herd that lacks the strand.

7.3. Test plan: λ 0, 0.1, 0.25, 0.4, each with Thin out and with the own-grade cull, 25 years, 12
seeds; log the share of 6/6 copies. **Pass: +1.5 at year 15 and +3 at year 25, Fertility and Immunity
each no more than 2 points down.** Then build `hyena_sim.mjs` (leader female, litters 1–3, maturity 3,
elderly 12, all-year breeding); pass: the gate keeps hyenas within 0.5 of λ = 0.

7.4. Payoff for the owner now: Matla × a Jabarl daughter gives 25% Longevity 6/6 + 6/6 pups in about
3 years, with no inbreeding flag (gene pyramiding, section 10).

7.5. Built 2026-10-29, off: it fails 7.3 with or without Build 1, and the hyena gate passes (14.6).

## 8. Build 3: targeted market buying

8.1. Read strands from percentages where they are certain: Vitality or Longevity ≥ 92% means at
least one 6/6 strand (`kinstrands.js` `strandEdge`, already marking market rows "▲Long6"); Fertility
or Immunity 100% means two strands that differ everywhere. Read the true strands after buying; keep
or resell.

8.2. First find out (in game): whether market rows carry strands (`geneticIdentities`; the strand
marks' debug log writes `ui strands identity=present|absent` once a session), what such animals cost,
and how often they appear. **Answered 2026-10-29: rows carry them (proven)**; cost and quality of 24
system listings measured, the owner's species not yet (14.2, 14.7).

8.3. Test plan: calibrate listings from the market desk's logs; N listings a quarter and one buy a
year in `dog_sim`, three buy rules (best own mean; V or L ≥ 92%; F or I 100% with the most
difference from the herd); sweep listing quality (good-letter share 0.55 / 0.65 / 0.75). **Pass:
dogs +1.5, hyenas +3; report the cost per point.**

## 9. Measure first: conception

9.1. Every simulator assumes conception = (father's + mother's Fertility in sixths) / 12 and ignores
FertilityValue (0.4 dogs, 0.3 hyenas) and welfare. From the saves: per leader pair-year (leaders known
from the rules in 3.2), was there a litter; fit against both parents' Fertility. Helix's roster
(`sh scripts/pz.sh roster ...`) gives births with parents and ages.

9.2. **Measured 2026-10-29; the assumption is overturned** (14.2): 0.48 per eligible dog pair-summer,
no Fertility effect seen, and no litter the summer after one. The game's own table (`info.conception`)
is still unread (14.10 a).

## 10. Research that transfers

| Source | What transfers |
|---|---|
| Breeder's equation (Lush) | Gain = intensity × spread × accuracy / generation interval; accuracy is 1 here |
| Optimal haploid value: Daetwyler et al. 2015, https://pmc.ncbi.nlm.nih.gov/articles/PMC4574260 | Value a pair by the best strands its pups can carry: the strand-copy bonus |
| Optimal population value: Goiffon et al. 2017, https://pmc.ncbi.nlm.nih.gov/articles/PMC5500159 | The "ceiling" (`kinstrands.js`) is OPV |
| Usefulness criterion: Schnell and Utz 1975 | Why the best-quarter objective helps only with strict culling of the young |
| Gene pyramiding: Servin et al. 2004, https://pmc.ncbi.nlm.nih.gov/articles/PMC1448128 | Stacking two carriers' strands in few generations (Matla × Jabarl's daughter) |
| Optimal contribution selection: Meuwissen 1997 | A diversity floor, measured on strands; small gain at herds of 20–40 |
| AZA / PMx mean kinship | Built for unknown genotypes; worst policy in the 2026-10-18 simulation (`docs/RESEARCH-breeding-optimisation.md`); use strand distance |
| Reciprocal recurrent selection: Comstock 1949 | Is "Method 2"; not worth it for a herd average |
| Cryobanks | Storage as a gene bank (ageing pauses in storage; Helix experiment H3a) |
| Planet Zoo 1 guide, https://steamcommunity.com/sharedfiles/filedetails/?id=3539341816 (now hidden) | Size and Longevity first, then Fertility / Immunity by mixed pairs; its letter-by-letter inheritance is wrong for PZ2 |
| gamerblurb, https://gamerblurb.com/guides/planet-zoo-2-breeding-spreadsheet-guide; Whisper of the House, https://www.whisperofthehouse.com/planet-zoo-2/franchise-breeding | Player practice; none works at strand level |
| `docs/RESEARCH-breeding-optimisation.md` (2026-10-18) | The search is within 0.7–1.7% of proven optima; a rare-strand bonus gained about 0.06 grade at about 20 animals in a 50-year simulation |

## 11. The best possible auto breeder (target design)

11.1. Model: each gene one locus whose alleles are whole strands; learn conception, litter size and
survival from the zoo's own outcomes.

11.2. Objective: the herd average at a fixed herd size over 10–25 years, with the pups' trend and the
strand pool shown beside it.

11.3. Planner: each season roll candidate policies forward in an in-mod Monte Carlo (strand bonus λ,
cull level, packs, buys, storage); execute only this season's moves of the best. Today's search stays
as the inner step. About 2 s per 30 runs × 25 years in Node; Gameface speed unknown.

11.4. Interface: a generation plan with forecasts, plan locks instead of hands off, and a reason for
each move. Habitat advice: "one more wild dog habitat of 1,600 m² would let Jabarl × Mapalo breed
(pups 74)", tied to selection (more packs alone don't help: section 4.1).

11.5. Parked ideas: the per-animal "Breed" mark (owner: not yet); Fertility / Immunity strand-set
management (measured negative); contraception as selection (−1.6); more packs on their own (no
gain); storage gene bank and franchise-wide gene pool (later).

11.6. Storage is a hard limit: **250 animals** (owner, 2026-10-28), and the owner constantly trades
animals away to stay under it; Auto's runs already report "The trade centre is full" for 7 species.
So:
- a. A storage gene bank can only hold a handful: the last carriers of a best strand, never a herd.
- b. Every animal Thin out sends away ends up in that flow: culling must be selective (6.1 a), and
  the better a herd's selection, the fewer animals it produces that nobody wants.
- c. Market buying (section 8) adds animals to the same flow: buy few, resell what doesn't carry
  what was bought for.
- d. A smarter breeder should count the trade centre and storage as a budget: fewer, better litters
  (pairs whose pups beat the herd) over more litters.

## 12. Open questions for the game

State on 2026-10-29 (the in-game checks: 14.10):

- The real conception chance by Fertility grade (section 9): rate measured (0.48), **Fertility
  effect open**.
- Whether market rows carry strands (section 8.2): **answered, yes**.
- The breeding season in park months per species, and where the database keeps it (6.1 b):
  **answered**: `animals.fdb` `BehaviourParameters_BreedingSeasons`, `GetSpeciesBreedingSeasons`;
  wild dog season index 1, months 4–6.
- Whether juveniles can be traded, and from what age.
- Storage capacity: 250 animals (owner, 2026-10-28; full in practice, section 11.6). Whether
  Immunity drives disease (diseases have TriggerGrade 1–4).
- More parent-young trios for the locus-1 mutation rate.
- Mourning: does the mate that moves also mourn (6.1 c), and does a pair moved together keep its
  bond (the planner assumes not)? **Open.**
- When a spotted hyena counts as adult (juvenile flag at 2–3 years). **Open.**

## 13. Where everything is

13.1. Repo: the owner's fork bendoerr/planet-zoo-2-mods, branch `feat/ceiling-goal`, cloned in the
session scratchpad (`.../scratchpad/pz2`). Commits of 2026-10-28, **not pushed**: `13c8985` packs,
`c7733f8` strand marks, `cc95e1b` pack leadership docs, `73cfaef` Auto log kept, `a5b611f` batch quick
runs, `033b229` line endings. Installed: `c7733f8` (backups in
`C:\Users\Rowl\Projects\Helix\cache\removed-mods`); `033b229` built and verified
(`cache\pz2qol-build-033b229`), install not yet approved. Upstream PR on hold.
The build of 2026-10-29: branch `feat/best-breeder` (from `7dc2522`, code head `9a534ff`), in the
scratchpad's `wt-int`; **not pushed, not installed**. `9a534ff` built and verified
(`cache\pz2qol-build-9a534ff`, no debug trace; report `best-breeder/reports/build.md`); install not
yet approved (the installed build is still `c7733f8`).

13.2. Scratchpad (session-specific; copy what must survive):

| Path (under the scratchpad) | What |
|---|---|
| `scripts/dog_sim.mjs` | Real-planner simulator (env `SETTINGS`, `TUNE`, `EXTRA`) |
| `scripts/dog_plan_once.mjs` | One Auto plan on a save (env `PINS`, `MOVE`, `GONE`, `ASSIGN`, `HABS`, `HIDS`, `BONDS`) |
| `scripts/dog_mates.mjs`, `herd_breakdown.mjs`, `dog_leaders.mjs` | Mates for new animals; herd breakdown; leaders across saves |
| `brainstorm/report.md` | The agent's full report |
| `brainstorm/tools/` | `ideal.mjs` (frictionless simulator), `dog_sim_diag.mjs` (real planner + diagnostics), `inherit_check*.mjs`, `pool.mjs`, `fi_sets.mjs`, `summarise.mjs`, batch scripts |
| `brainstorm/strandbonus/` | Mod copy with the experimental bonus |
| `brainstorm/runs/` | 12-seed runs: default, extra2, strict, sb25, sb40, sbc, sbc40, sbp25, simplecull, simplecullj, b25, c25; `ideal_grid1-5.txt`, `ideal_hyena.txt` |
| `simgoal/` | The main session's 3-seed runs (avg, wait, nowait, extra2/4, base, tail) |
| `nowait/`, `baseline/` | Mod copies for the no-wait and pair-scoring experiments |
| `saves-1634` … `saves-2014` | Save copies, Helix rosters (`out/data.json`), player stores (`store.json`) |
| `best-breeder/reports/` | The 2026-10-29 build's reports: `conception`, `cull`, `season`, `pack`, `strand`, `market`, `places`, `review`, `eval`, `ui`, `polish`, `build`, `docs` |
| `best-breeder/sim/dog_sim_real.mjs` | Real-planner dog simulator with the measured facts (`REAL=2`) |
| `best-breeder/eval/` | `dog_sim_eval.mjs`, `hyena_sim_eval.mjs`, `esumm.mjs`, `forecast.mjs`; 600 logs of the combined evaluation |
| `best-breeder/conception/model.mjs` | The measured conception model |
| `best-breeder/strand/hyena_sim.mjs` | Real-planner hyena simulator (measured conception) |

13.3. The owner's wild dogs at the 20:14 save: Wild Dog 01 Sibusiso & Sekelaga lead (Asha, Ojore,
Adejola, 7 pups); 02 Matla (Bertha 0.8 will be his mate), 4 pups; 03 probably Asim & Thembile lead
(Gyasi, Morowa and others); 04 Mosi & Chibeka; 05+ Jabarl & Mapalo; 06+ empty. Hands off: Mosi,
Chibeka, Jabarl, Mapalo. Habitats 05+ / 06+ are not assigned to wild dogs.

## 14. Results of the 2026-10-29 build

14.1. Bottom line: Build 1 is on in Auto mode and passes 6.2 as restated with the owner's settings;
the strand bonus fails and stays off; Market picks is an opt-in experiment (hyenas pass, dogs fail).
The game breeds at 0.48 a summer with a mother's wait, so litters, now at a stable pair's maximum,
limit the herds. The board's panels answer as before (`engines_equivalence` passes on its old
golden). Tests at `e59ccda`: JS 546, 545 pass (habplanner, known); Lua 468 / 757 / 81 / 48 pass.
Reports: `best-breeder/reports/` (13.2). "REAL=2" below = the dog simulator with the measured
conception, the mother's wait and move timing.

### 14.2. Measured game facts

| Fact | Evidence | Status | Used in |
|---|---|---|---|
| A wild dog leader pair litters in **0.48** of eligible summers (14 of 29, CI 0.31–0.66); (fM+fF)/12 predicted 0.735 (p = 0.002) | 34 Cradle #2 saves, 55 dog litters | **proven** (saves) | Simulators (REAL=2), forecasts |
| No Fertility effect on conception seen (slope −0.18 per sixth, CI −0.65 to +0.27); 0.62 × (fM+fF)/12 fits almost as well as flat | Same | **unmeasured** (CI wide; the game passes Fertility in) | Caveat 14.9 a |
| A dog mother never litters two summers running (16 of 16 gaps ≥ 1.85 y); a leader female that littered blocks her pack the next summer (7 of 7, p ≈ 0.01) | Same | **proven** (saves) | The mother's wait (`fertilityAgesOf`), season hold, staging |
| Interbirth counts from the birth to the next conception: hyena minimum birth gap 1.27 y = InterBirthYears 0.95 + gestation 0.30 | 39 hyena gaps | **proven** (hyenas; dogs consistent) | Same |
| Summer = season index 1 (0-based): park months 4–6, year fraction 0.25–0.50 ("Wet Season 1" in a savannah zoo); all 55 dog litters conceived in it | Saves, `animals.fdb` and game Lua agree | **proven** | `breedingWindow`, season hold |
| Litter sizes uniform: dogs 1–6, hyenas 1–3; no Fertility effect | 12 and 25 litters counted young | **proven** (not rejected; small samples) | Simulators |
| Spotted hyena: a leader female past her wait conceives at 2.1 a year (CI 1.3–3.3); births in all four seasons; no Fertility effect | 89 hyena litters | **proven** (saves) | `hyena_sim.mjs` |
| The rate follows FertilityValue (about 6.5 × FertilityValue a year) | Dog : hyena 2.6 : 2.1 = 0.4 : 0.3 | **guess** | |
| Pup loss before maturity is small (≤ 4 of 182 dog pups, 0 of 166 hyena cubs) | Saves (storage hides young moved out) | **proven** (lower bound) | |
| A new leader pair breeds in the first season after the change (6 dated cases, 0.34–0.65 y later) | Auto ledger and saves | **proven** (saves) | |
| Mourning: the mate left behind lost no summer (1 dated case); the mover: unknown | 1 case each | **open** | Pack mourning rule `'both'` |
| Market rows carry strands: `geneticIdentities` on all 24 listings of Helix's market copy, equal to `GetMarketListingAnimalGenes` | In game, 2026-10-20 | **proven** | Market picks |
| System listings (24, lynx and wolf): Vitality / Longevity letters random (good 0.486); F / I letters A .36, B .37, C .15, D .13; 170–718 CC, mean 449, barely tied to genes | Same | **proven** for that sample | Market simulation |
| Breeding seasons: `animals.fdb` `BehaviourParameters_BreedingSeasons`, Lua `GetSpeciesBreedingSeasons(sp)` (four booleans by `Season() + 1`); InterBirthYears from `Animals/GetFertilityData`; MourningSeasons from `GetMatingRules` | Decompiled Lua, database | **offline** (Lua sends them since this build; not seen in game) | `Kin.SpeciesInfo` |
| Year 1 lost every litter: the first run made 1.05-year-olds leaders (the grow-up projection); they were under maturity 1.5 at summer | Simulator, all 12 seeds | **offline** | Season hold |

14.2.1. Consequence: a stable dog pair gives at most 0.48 / 1.48 = **0.32 litters a pack-year**
(the simulators before: 0.74). Only replacing the leader female after every litter gives 0.48, and
that costs the male's mourning (simulated: −4.3 litters in 15 years). Extra packs give 30–50% more
litters but no herd gain: the litters' quality limits the herd, not their number.

### 14.3. What was built (Auto mode only; the board's panels unchanged)

| Item | Built | Default | Result (paired, ± SE) | Criterion | Met |
|---|---|---|---|---|---|
| 6.1 a Herd cull | Thin out option `herd`, `AUTO_CULL` (`kincull.js`): adults held to the sum of the habitats' targets; a habitat over its room gives up its own; then the herd's weakest go from any habitat above its floor | On | Old rule, 12 seeds: y15 +1.67 ± 0.76 (default), +1.33 ± 1.18 (owner's); sends above the herd mean 34% → 29% (Strict 39% → 31%); pairs' young −0.5 to −1.0 | +1.0 at y15, fewer above-mean sends, F / I ≤ 2 down | Yes |
| 6.1 b Season hold | `seasonHold`, `breedingWindow`, `seasonLeadMonths` 1; the far hold bounded to one season; the mother's wait (`fertilityAgesOf`); Lua `breedingSeasons`, `interBirthYears` | On | REAL=2, 12 seeds: year-1 litters 0.8 → 1.6; litters in 15 y 20.8 → 26.3 (+3.4 ± 1.6); herd y15 +0.5 ± 0.9; no herd lost (today 1 of 12) | The old 6.2 bar | No: unreachable (restated, 14.5) |
| 6.1 c Continuing breeder | Pack mourning cost `packMourn` (mourner `'both'`, `mournWeight` 0.5, `info.mourningSeasons`), `waitForMates`; Lua `mourningSeasons` | On | Old rule: litters lost to mourning 11.4 → 0.6, slots 59.6 → 70.4, herd +0.8 ± 0.7 / −0.2 ± 0.7 (y15 / y25). Measured facts, 24 seeds: +1.2 ± 0.6 / +1.0 ± 1.1 | Mourning halved, no churn, a herd gain at y15 and y25 | Mourning and churn yes; y25 no |
| 6.1 d Cooldown waiver | `AUTO_LIMITS.waiveGain` (`locksOf` `waive`, programme `cooled` / `cooledCost`; never back where it came from) | **Off** (null) | −0.5 ± 0.6 / +1.0 ± 0.9 (measured facts, 24 seeds); no steady gain in any world | A steady gain | No |
| Interbirth allowance | `kinprogramme.js` option `interbirth` | Off | Lost more litters (3.3 against 1.1 in 15 y) | | No |
| 6.1 e Staging | `stageRestructures`, `AUTO_LIMITS.packsPerRun` 2 | On | Without it −1.2 to −1.3 (ablations); +1.1 ± 0.7 on top of the season hold (REAL=2) | Part of 6.2 | Yes |
| 6.3 a Hand-stocked pens | `handStockedPlaces` (derived each run, never saved) | On | No simulator effect (no assignments); owner's case: Asha brought to Matla in his pen; soak with assignments: births +4 to +17%, no reversals | The complaint fixed, nothing breaks | Yes |
| Interaction review | `leaderChanges` (a held change keeps the breeding pairs it links), `seasonWaits` and `waitsReady(…, months)`, notes order | On | REAL=2, 19 seeds: 0.00 ± 0.29 at y15, litters −0.6 ± 0.3 | Faults fixed with tests, nothing breaks | Yes |
| **Build 1 combined** (`e59ccda`) | All of the above | On | 14.4 | 14.5 | Owner's yes; default at the Fertility limit |
| 7 Strand bonus | `strandBonus`, `strandGate` 0.5 (`kinprogramme.js`; `kinstrands.js` `strandTargets`, `youngCopies`); tuning "Strand bonus" Off / Low / Medium / High; `AUTO_STRAND_BONUS` 0 | **Off** | 14.6 | Dogs +1.5 / +3, F / I ≤ 2 down; hyenas within 0.5 | Dogs no; hyenas yes |
| 8 Market picks | `marketpickcore.js`, `marketpicks.js`, Kin setting `marketPicks` | **Off** (opt-in) | 14.7 | Dogs +1.5, hyenas +3 | Hyenas yes; dogs no |
| UI polish | Row badge `top: -0.3rem` (the first row's badge reads whole), Strand bonus help, two harness checks | | Harness passes on both UI copies | | Yes |

### 14.4. Build 1 combined, on the measured facts

REAL=2, 24 paired seeds, `e59ccda` against `7dc2522`; Δ over the seeds where both herds live.

| | Default: today → new | Δ | Owner's: today → new | Δ |
|---|---|---|---|---|
| Herd y15 | 76.3 → 76.1 | −0.1 ± 0.7 | 77.1 → 77.4 | +0.2 ± 1.0 |
| Herd y25 | 74.6 → 76.6 | **+2.0 ± 1.0** | 76.8 → 77.9 | +1.1 ± 1.1 |
| Best 20 dogs y15 / y25 | 78.2 / 76.7 → 81.0 / 81.9 | **+2.8 ± 0.9 / +4.7 ± 1.3** | 78.1 / 78.5 → 80.0 / 81.4 | **+1.9 ± 1.1 / +2.7 ± 1.2** |
| Litters in 15 y (per pack-year) | 19.0 (0.25) → 24.1 (0.32) | +5.1 ± 1.5 | 18.2 (0.24) → 23.6 (0.31) | +5.4 ± 1.3 |
| Pack-summers lost to frictions, of 75 | 22.3 → 7.7 | | 25.4 → 8.4 | |
| Herds died out (25 y) | 3 of 24 → **0** | | 3 of 24 → **0** | |
| Herd size y15 | 24 → 37 | +13 | 22 → 30 | +8 |
| Sends a year (25 y) | 5.1 → 5.8 | | 5.1 → 5.8 | |
| Summer pairs' expected young | 74.7 | +0.8 ± 0.5 | 74.6 | +0.2 ± 0.4 |
| F / I Δ at y15; y25 | | −2.1 / −0.8; −0.0 / +4.1 | | +2.0 / −1.4; +3.4 / +1.8 |

14.4.1. Reading:
- a. Breeding is at the stable-pair limit (97–99% of 0.32; today 75–78%). Frictions fall by two
  thirds: "no pair" 14 → 3 pack-summers, mourning halved.
- b. Survival: today's lost herds shrink from 35 to 7–12 dogs in two years (no litter in years 1–2
  while Thin out per habitat keeps sending); the herd cull and the season hold keep 16 or more.
- c. Average against best: the new herd fills every habitat to its target and keeps more middling
  dogs, so the whole-herd mean gains little while the best 20 gain 2–5 points; the pairs' expected
  young barely move.
- d. Hyenas: identical in all 24 seeds with default settings, within 0.2 with the owner's (Lean).
- e. `e59ccda` against `5f851b6` (before the review's fixes): within noise (litters −0.6 ± 0.3).
- f. The old rule, for continuity (12 seeds): slots 59.6 → 72.2 of 75, y15 80.9 → 82.5
  (+1.6 ± 0.7): the old bar's slots met, its 83.3 not.

### 14.5. Plan 6.2, restated for the measured facts

14.5.1. Pass (REAL=2, 24 paired seeds, default and owner's settings):
- a. **Breeding**: litters per pack-year in years 1–15 at least 0.29 (90% of a stable pair's 0.48 /
  1.48 = 0.32); pack-summers lost to frictions reported beside it.
- b. **Survival**: no more herds lost than today.
- c. **Genetics**: the best 20 adults (a fixed herd size, 5.3) at least +1.0 at years 15 and 25; the
  whole herd not below today; Fertility and Immunity each no more than 2 down. (+1.0 is the old +2.4
  scaled by the litters available, 0.32 / 0.74.)

14.5.2. Result, `e59ccda`:

| Part | Default | Owner's | Met |
|---|---|---|---|
| a. Litters per pack-year | 0.32 (today 0.25) | 0.31 (today 0.24) | Yes |
| b. Herds lost | 0 of 24 (today 3) | 0 of 24 (today 3) | Yes |
| c. Best 20, y15 / y25 | +2.8 / +4.7 | +1.9 / +2.7 | Yes |
| c. Whole herd, y15 / y25 | −0.1 / +2.0 | +0.2 / +1.1 | Yes (not below) |
| c. F / I, y15; y25 | −2.1 / −0.8; −0.0 / +4.1 | +2.0 / −1.4; +3.4 / +1.8 | Owner's yes; default **no by 0.1** |

14.5.3. Plainly: the best-20 measure was added after the whole-herd numbers came in, because the two
herds differ by 8–15 dogs. Graded on the whole herd (+1.0), year 15 fails in both settings and year 25
passes only with default settings. The default's Fertility −2.1 is within the seeds' noise (5-year
window −2.2; `5f851b6` −1.6): at the limit, not a regression to fix.

### 14.6. Strand bonus: fails, off

14.6.1. On top of Build 1 (REAL=2, 24 paired seeds, 25 years; Δ against λ 0 of the same build):

| Species, settings | λ 0.25 y15 / y25 | λ 0.4 y15 / y25 | F / I cost (worst) |
|---|---|---|---|
| Dogs, default | −0.4 / −0.8 | +0.4 / +0.1 | I −2.1 (λ 0.25) |
| Dogs, owner's | −0.8 / +0.4 | +0.9 / +1.7 | F −2.2 (λ 0.25, years 11–15) |
| Hyenas, default | −0.7 / +0.9 | +0.1 / +1.5 | F −3.5 at y15 (λ 0.4) |
| Hyenas, owner's | −0.6 / −0.8 | +0.5 / +0.5 | I −3.4 (λ 0.4, years 21–25) |

14.6.2. Why it fails:
- a. Fewer litters (0.32 against 0.74 a pack-year) leave less selection to spend on strands.
- b. It does spread the best strands (dogs, owner's, λ 0.4: 6/6 Vitality 19% → 32%), but Fertility
  and Immunity give most of it back.
- c. Its frictionless +2.2 / +3.7 was a third of that with the real planner on the old rule, and
  nothing on the measured one before Build 1.
- d. The tuning is player-wide: on for dogs, it costs the hyenas 2.3–3.5 points of Fertility or
  Immunity.

14.6.3. The hyena gate passes (48 seeds, measured conception: +0.1 / +1.1 default, +0.2 / +0.4
owner's). Kept off: `AUTO_STRAND_BONUS` 0, the tuning's default Off. "High" is the only level worth
a player's try, for dogs. To turn it on later: `AUTO_STRAND_BONUS` 0.4, relabel the tuning's default,
add an explicit Off choice (`kinprogtune.test.mjs` checks both states).

### 14.7. Market picks: an opt-in experiment

14.7.1. What it does: on the market, marks each listing whose young with the herd's best mate would
beat the young of the herd's own best pairs by at least 2 points: a green "Pick +x.x" with the reason,
"sure" when the row shows its strands, "rough" from grades. Mark / First / Only. The mod never buys.
Off shows only the switch and changes nothing else.

14.7.2. Simulated (12 paired seeds, 25 years, measured conception, at most one pick bought a year; p =
the listings' good-letter share, 0.5 measured):

| Herd | p 0.5, y15 / y25 | p 0.65 | p 0.75 | Bought in 25 y (p 0.5) |
|---|---|---|---|---|
| Hyenas | **+3.0 ± 1.3 / +3.8 ± 1.4** | +5.3 / +8.9 | +8.8 / +11.1 | 20 (about 9,500 CC, 2,500 CC a point) |
| Dogs | −0.0 ± 1.0 / −0.3 ± 1.5 | +1.8 / +0.6 | +2.2 / +3.0 | 3.4 |

Auto mode used about half the animals bought; the rest waited a year at the trade centre and were
resold (about 0.8 hyenas a year through storage). Planner `7dc2522`, not Build 1.

14.7.3. To turn it on: Market (hub, or Animal Trading & Storage from the zoo) → the "Quick filters"
toolbar → switch **"Market picks (experimental)"** at the right, above "N prices recorded". Go into
Halcyon Kalahari Cradle #2 and play about 2 minutes (the zoo notes its herds' best mates), then open
the Market, filter to African Wild Dog or Spotted Hyena and page through. The pill reads "Waiting for
your zoo's herds" until the facts arrive.

14.7.4. What to look for:
- a. On rows: "Pick +x.x" and its reason ("young: Fertility +12, Immunity +9 · sure", "Longevity 6/6
  strand; the herd has 2 copies · sure").
- b. In the debug log: `ui strands identity=present`; per page `ui picks … scored= identity= picks=
  best=`; per pick `ui pick … score= why=`. How often dog and hyena listings make a pick, and how
  high, decides whether dogs can gain (they need listings far better than the system listings).
- c. For hyenas: buy about one pick a year.

14.7.5. Costs while on: up to 1,000 characters of the player-wide prefs (846 for Cradle #2). The
park page reads the settings every 2 minutes, also while off.

### 14.8. Forecast for the owner's herds

His settings, measured facts, median (10–90%) of 24 runs. Start: dogs 73 (20:14), hyenas 67 (19:46).

| Years | Dogs, today's Auto mode | Dogs, new | Best 20 dogs, today → new | Hyenas, today → new |
|---|---|---|---|---|
| 5 | 76.4 (74.0–78.3) | 76.9 (74.1–79.1) | 77.7 → 79.8 | 72.3 → 72.3 |
| 10 | 77.5 (75.1–79.0) | 77.6 (75.2–81.2) | 78.7 → 80.4 | 71.8 → 71.9 |
| 15 | 77.2 (73.3–80.9) | 77.9 (74.4–80.8) | 78.4 → 79.9 | 73.8 → 73.5 |
| 25 | 76.0 (herd lost – 80.8); 3 of 24 lost by year 20 | 78.0 (73.4–82.8); none lost | 77.6 → 81.5 | 74.9 → 74.8 |

Dogs kept 21–23 → 29–31; litters a year 1.3 → 1.6; sends a year 5.0 → 5.8. Hyenas: about 20, 2.3
litters and 4.6 sends a year either way.

### 14.9. Caveats

- a. **Conception's Fertility effect is unmeasured.** With the scaled form (0.62 × (fM+fF)/12): new
  against today +1.1 ± 0.6 at y15, −0.5 ± 1.1 at y25 (best 20 +2.9 / +1.9), litters +6.3 ± 1.5; each
  loses 1 herd of 24.
- b. **Mover mourning is unknown.** If nobody mourns: litters +1.8 ± 1.0 in 15 years instead of +5.8,
  herd −0.3 ± 0.8 / −0.4 ± 1.0, best 20 +1.3 / +1.6; today loses 1 herd of 24, the new none. Much of
  Build 1's dog gain is mourning avoided.
- c. **Storage.** The dog herd is 8–13 dogs larger and sends +16% a year (5.0 → 5.8), though fewer
  per litter (4.1–4.4 → 3.5–3.6) and fewer elderly (owner's 16.9 → 9.9 in 25 years). The trade
  centre is the 250-place storage (11.6). A habitat may keep up to its room, so a litter can push it
  over the space need until the next run (simulator: 4.1 against 2.8 animal-quarters over room in 15
  years).
- d. The pairs' expected young barely move (+0.8 / +0.2). The herd cull's own-grade order lowers them
  slightly (−0.5 to −1.0 on the old rule); if the pups' trend falls, rank by each animal's best
  expected young with the herd (not tried).
- e. Simulated herds are closed (no buys), with no disease, fights, welfare or player, on a fixed
  layout (5 dog habitats, 4 hyena habitats of 2,000 m²). Hyena adulthood at 3 is a guess. Seeds
  diverge after the first different decision: ± 0.4–1.3 is the honest resolution.
- f. Hyenas: Build 1 changes nothing. Their own friction, 17% of group-quarters with no adult female
  to lead, is the next target.

### 14.10. Open in-game checks

- a. **Conception table**: log `info.conception` (`Kin.SpeciesInfo`) for Dog_AfricanWild and
  Hyena_Spotted in a debug build, or read Compare Mates' conception chance for four pairs with
  Fertility sums 5, 7, 9, 11. Decides 14.9 a.
- b. **Mourning**: move one leader of a bonded pack pair and read `GetCurrentMournTimeForUI` on both;
  also whether a pair moved together keeps its bond. Decides 14.9 b and the `mourner` rule
  (`'stayer'` if the mover does not mourn).
- c. **`MourningSeasons` and the breeding seasons read in game**: the debug log's `kin species_info`
  line shows `seasons=0100` for wild dogs and `1111` for hyenas. since `9a534ff` the line also
  names `interBirthYears` (dog 1.0, hyena 0.95) and `mourningSeasons` (dog 4).
- d. **The season hold's notes** (their layout is untested in the harness): "The breeding season is
  on: Wild Dog 01 keeps its breeding pair until it is over." (a run in the season or the month before
  it); "… keeps its breeding pair until the breeding season is over: Dalia would not be of age for
  it." (earlier); "At most 2 breeding groups change leaders in one run: …"; the dropped wait "Mosi
  still leads its pack (it was to leave once Matla had arrived): the breeding season is close, and
  its group breeds in it."; the pen note last; the pack wait "…; once Chibeka has left", with her
  moving first.
- e. **Ages and the calendar**: the season hold counts age in park time (age + months / 12). If the
  park's animal-time option is not 1, "of age by the season" is off by that factor.
- f. **Hyena juvenile age** (`strand` 5.3): read a hyena's `juv` flag at 2–3 years in the kin
  snapshot. With adults from 2 the simulated herd dies out (25 → 3 hyenas in 25 years: young adults
  sent away before maturity at 3); if so, `AUTO_LIMITS.growUpYears` (or the spare rule) needs a
  per-species gap (maturity − adult age).
- g. **Badge offset** (`polish` 3.5): the first market row's badge reads whole and no badge touches
  the species name (Gameface font metrics may differ from Edge's); if one does, `top: -0.35rem`
  (`pz2qol.css` `.PZ2QoL_badge`).
- h. The dog habitats' space welfare after summer births (14.9 c).
- i. A hand-stocked pen: one animal of a species with assigned habitats in an unassigned empty
  habitat; Auto mode keeps it, brings a mate when one is worth it, and names the pen in the run's
  notes. Such a pen is planned like an assigned one (the programme may restructure it; hands off
  keeps a pair).
- j. Market picks' debug lines (14.7.4 b).
