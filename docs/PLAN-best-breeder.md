# Plan: the best auto breeder (2026-10-28)

Status: **research done, nothing built**. Owner's goal: "the best freaking auto breeder on the market":
Auto mode should set herds up better than the player, without hands-off marks. Written for the next
session: everything learnt on 2026-10-28 is here, with the evidence and where to find it.

## 1. Bottom line

1.1. Auto mode already chooses near-best pairs each summer: the expected young of its leader pairs
are within about 0.01 of the best pairs the herd could form. A better search will not raise herds.

1.2. A herd's average is limited by, largest first:
- a. **Frictions** in how Auto mode runs: the real planner ends **4.7 points** below a frictionless
  planner with the same objective (80.9 against 85.6 after 15 dog-years, 12 seeds).
- b. **How slowly the best Vitality / Longevity strands spread** (only stacking them raises those
  genes).
- c. **What a closed herd can supply**: Fertility / Immunity are capped by the strands present;
  the hyenas have no 6/6 Vitality strand at all.
- d. **Conception**, assumed in every simulator and never measured: halving it costs 3.4–5.3 points.

1.3. Build in this order:

| Order | What | Measured gain | Why this order |
|---|---|---|---|
| 0 | Measure conception from the saves | (better forecasts: 3–5 points of uncertainty) | Cheap; every number below rests on it |
| 1 | Remove the frictions (section 6) | +1.1 so far, up to about +3 | Surest, all species, fixes what the owner hit; item 2 needs it |
| 2 | Strand-copy bonus in the pair value (section 7) | about +1.9 on top of 1 (+2.5 over today, years 20–25) | Small (about 20 lines); turns Matla's and Jabarl's Longevity 6 into 6/6 pups |
| 3 | Targeted market buying (section 8) | +1.8 dogs, +4.7 hyenas (invented market) | Needs facts first: do market rows carry strands, what do good animals cost |

1.4. Ceiling, if all of it works (frictionless simulator, dogs): **89.4% after 15 dog-years and
94.2% after 25**, against 81% and 84% for Auto mode today. A closed dog herd levels off near 94%
(Fertility and Immunity near 88%); closed hyenas near 82%.

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

### 3.4. How Auto mode behaved (and why the owner needed hands off)

| What happened | Cause |
|---|---|
| Matla moved out of the owner's new pen into Wild Dog 02 | The pen wasn't assigned to wild dogs: Auto never moves an animal **into** an unassigned habitat but may move one **out**; Asha's move to the pen hadn't happened, so Matla was alone there |
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

6.2. Test plan (12 paired seeds, 15 years, `brainstorm/tools/dog_sim_diag.mjs`): log every pack's
state each season and attribute the gap; add one change at a time. **Pass: at least 70 of 75 breeding
slots used and year 15 at 83.3 or better.**

6.3. Also fix while there (owner's complaints, section 3.4):
- a. A habitat holding only this species that the player stocked by hand counts as one of its
  places (or Auto asks to assign it), so a new pen isn't emptied.
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

## 8. Build 3: targeted market buying

8.1. Read strands from percentages where they are certain: Vitality or Longevity ≥ 92% means at
least one 6/6 strand (`kinstrands.js` `strandEdge`, already marking market rows "▲Long6"); Fertility
or Immunity 100% means two strands that differ everywhere. Read the true strands after buying; keep
or resell.

8.2. First find out (in game): whether market rows carry strands (`geneticIdentities`; the strand
marks' debug log writes `ui strands identity=present|absent` once a session), what such animals cost,
and how often they appear.

8.3. Test plan: calibrate listings from the market desk's logs; N listings a quarter and one buy a
year in `dog_sim`, three buy rules (best own mean; V or L ≥ 92%; F or I 100% with the most
difference from the herd); sweep listing quality (good-letter share 0.55 / 0.65 / 0.75). **Pass:
dogs +1.5, hyenas +3; report the cost per point.**

## 9. Measure first: conception

9.1. Every simulator assumes conception = (father's + mother's Fertility in sixths) / 12 and ignores
FertilityValue (0.4 dogs, 0.3 hyenas) and welfare. From the saves: per leader pair-year (leaders known
from the rules in 3.2), was there a litter; fit against both parents' Fertility. Helix's roster
(`sh scripts/pz.sh roster ...`) gives births with parents and ages.

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

- The real conception chance by Fertility grade (section 9).
- Whether market rows carry strands (section 8.2).
- The breeding season in park months per species, and where the database keeps it (6.1 b).
- Whether juveniles can be traded, and from what age.
- Storage capacity: 250 animals (owner, 2026-10-28; full in practice, section 11.6). Whether
  Immunity drives disease (diseases have TriggerGrade 1–4).
- More parent-young trios for the locus-1 mutation rate.
- Mourning: does the mate that moves also mourn (6.1 c)?

## 13. Where everything is

13.1. Repo: the owner's fork bendoerr/planet-zoo-2-mods, branch `feat/ceiling-goal`, cloned in the
session scratchpad (`.../scratchpad/pz2`). Commits of 2026-10-28, **not pushed**: `13c8985` packs,
`c7733f8` strand marks, `cc95e1b` pack leadership docs, `73cfaef` Auto log kept, `a5b611f` batch quick
runs, `033b229` line endings. Installed: `c7733f8` (backups in
`C:\Users\Rowl\Projects\Helix\cache\removed-mods`); `033b229` built and verified
(`cache\pz2qol-build-033b229`), install not yet approved. Upstream PR on hold.

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

13.3. The owner's wild dogs at the 20:14 save: Wild Dog 01 Sibusiso & Sekelaga lead (Asha, Ojore,
Adejola, 7 pups); 02 Matla (Bertha 0.8 will be his mate), 4 pups; 03 probably Asim & Thembile lead
(Gyasi, Morowa and others); 04 Mosi & Chibeka; 05+ Jabarl & Mapalo; 06+ empty. Hands off: Mosi,
Chibeka, Jabarl, Mapalo. Habitats 05+ / 06+ are not assigned to wild dogs.
