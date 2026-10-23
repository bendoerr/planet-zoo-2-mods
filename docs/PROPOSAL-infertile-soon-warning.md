# Proposal: warn when a market animal turns infertile soon

Status: idea, not started (2026-10-23). Owner's request: keep for a future improvement.

## 1. Bottom line

1.1. Show on every market listing, and in the price advice, how long the animal can still breed:
"Infertile in 0.1 years" when the species stops breeding with age and that age is close.

1.2. All the data is already readable: the listing's age in years and the game's own infertile
age per species. No server request, no guess.

## 2. Why

2.1. The owner bought an African leopard, Baruti, listed at about 14.9 years. African leopards
become elderly at 15.0 and stop breeding then. Days later the game said "Baruti is preventing
other animals from breeding" (`AlphaBecameInfertile`): he held the habitat's only male place.

2.2. The market's age dial shows only the stage (adult, elderly). At 14.9 it still shows adult.
The exact age is in the listing's text, but nothing compares it with the species' infertile age.
The market refuses elderly infertile animals, so the buyer can't sell him on.

## 3. Data

| Need | Source | Notes |
|---|---|---|
| Age in years | Market row `age`: `[AnimalExchange_Animal_Age:Years=(14.9)]` | One decimal. Schema: `AnimalMarketAndStorageSchema.js`. Storage and history rows: check the same field |
| Stage | Market row `maturity` (`EAnimalMaturity`) | 6 = elderly and infertile already |
| Species | Market row `species` | Map to the database `AnimalType` (e.g. `Leopard_African`); check the form in game |
| Infertile age | "Animals" statement `GetLongevityData`: `AnimalType, Min, Max, SexualMaturityAge, NewbornTime, InfertileWhenElderly, ElderlyAge` | Read like `Kin._SpeciesDb` (`pz2qol.kin.lua`), which works in game since 781f7b0. `GetFertilityData` also has `ElderlyAge, InfertileWhenElderly` |
| Lifespan | Same statement: `Min`, `Max` | For "lives about N more years" |

3.1. Example, build 26106647: `Leopard_African` ElderlyAge 15.0, InfertileWhenElderly 1, Max 20.
`Leopard_Snow` ElderlyAge 20.0, InfertileWhenElderly 1. Species with InfertileWhenElderly 0 keep
breeding when elderly; show "elderly at N" only.

## 4. Proposal

4.1. Market rows (badges): "Breeds 0.1 more years" in amber under 1 year, red under one
gestation plus birth interval (`GestationYears + InterBirthYears`, `GetFertilityData`); nothing
when far off.

4.2. Price advice (Market lister, Market desk): name it in the reasons; optionally discount, or
compare only with listings that have similar breeding years left.

4.3. Market desk and quick filters: "Breeds at least N more years" filter.

4.4. Storage rows and the Species board: the same line for the player's own animals, so they
can sell before the market stops taking them.

## 5. Open questions

5.1. Does the market row's `species` match the database `AnimalType`, or is it a loc key?

5.2. Does a listed animal age while listed? A 12-hour listing is about 0.5 game days at 1x, so
probably negligible, but check.

5.3. Does the database statement answer on the hub (start screen) world, where the market is, as
it does in the park?

## 6. Tests

6.1. Pure core (Node): parse the age text, years left, thresholds, species without
InfertileWhenElderly.

6.2. Lua: the statement read (mock `api.database`, as `test_pz2qol.lua` does for
`GetDesiredPopulationSizes`).

6.3. Harness: a market row at 14.9 years of a species with ElderlyAge 15 shows the warning.
