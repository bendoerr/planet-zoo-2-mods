// Auto mode, one species at a time: on the schedule the player chose on the
// Species board, Thin out (if chosen) and then the species' Breeding
// programme are worked out with the settings saved for it, and the moves
// run one at a time like the board's Execute (kinauto.js). Pure, no game
// imports (Node tests). Design: docs/DESIGN-autopilot.md section 16.
//
// Never moved by Auto mode: animals the player marked "hands off", pregnant
// females, animals on the move. The player's own moves hold nothing: Auto
// mode places those animals like any other (the developer, 2026-10-27: an
// escaped animal put back anywhere was left there for 2 years; "hands off"
// is the way to keep one). Animals Auto mode sent to the trade centre stay
// there (the programme never brings them back), so Thin out and the
// programme can't trade an animal back and forth.
//
// Why it settles: on a zoo that does not change, the programme's plan only
// ever raises its own score (every move it keeps gains something), and
// Thin out only takes animals away. So runs stop finding work until
// something changes in the zoo (a birth, a death, the player).
import { TRADE, canMove, isPinned, moveText, simulatePlan } from './kinboardcore.js';
import { PROGRAMME_DEFAULT_STEP, PROGRAMME_STEPS, conceptionChance, groupRule, isBreeder, packLeaderOf, planProgramme, youngQuality } from './kinprogramme.js';
import { FILL_STEPS, breedsNow, cullPlan, sexLimit } from './kincull.js';
import { Sex, buildKinModel } from './kincore.js';
import { applyTuning, tuningCull, tuningGoal } from './kinprogtune.js';
import { carrierKeepers, lastCarrier, speciesStrands } from './kinstrands.js';

// How often a species' run comes round, in months of the park's calendar
// (12 a year, 3 a season): game time, so it stops while the game is paused
// and runs faster at 2x and 5x.
export const EVERY_CHOICES = Object.freeze([1, 3, 6, 12]);

// One species' settings, as kept per zoo (kinautoledger.js).
export const SPECIES_DEFAULTS = Object.freeze({
    on: false,
    every: 3,                   // EVERY_CHOICES (months): a season
    step: PROGRAMME_DEFAULT_STEP, // PROGRAMME_STEPS: Fewest moves .. Best genetics
    trade: true,                // the programme may bring breeders from the trade centre
    thin: true,                 // then Thin out the habitats over their room
    fill: 'balanced',           // Thin out's fill level (FILL_STEPS)
});

// The search budget of one run (the board's Breeding programme uses the same).
export const AUTO_SEARCH = Object.freeze({ maxEvaluations: 3000000, timeBudgetMs: 6000 });

export const AUTO_LIMITS = Object.freeze({
    cooldownYears: 1,           // an animal Auto mode moved stays put this long: as births and
                                // ageing change the zoo, the programme's best layout shifts, and
                                // without this it would move some animals back and forth
    growUpYears: 0.5,           // young this close to growing up count as breeders. 0: off;
                                // youth is left alone until it is grown (the developer,
                                // 2026-10-19: young were sent to the trade centre)
    reversalYears: 1,           // a move back to where it left within this counts as a reversal
    reversalsToStop: 2,         // that many reversals in the window: Auto stops for the species
    settleMs: 60000,            // after a zoo loads: watch this long first
    settleScans: 3,
    pauseAfterSkipsMs: 10 * 60 * 1000, // a run with this many refusals pauses the species
    skipsToPause: 3,
    seasonLeadMonths: 1,        // a seasonal breeder's breeding pairs stay together this long
                                // before its breeding season, and through it: keepers carry
                                // moves in their own time and a new leader takes days, so a
                                // pair formed late misses the season (seasonHold)
    packsPerRun: 2,             // at most this many packs (or harems) lose a leader that breeds
                                // in one run; the others wait for the next run, the best gains
                                // first (stageRestructures)
});

// A kept settings object, checked (unknown values fall back to the defaults).
export function normalizeSpecies(raw) {
    const s = Object.assign({}, SPECIES_DEFAULTS);
    if (!raw || typeof raw !== 'object') return s;
    s.on = raw.on === true || raw.on === 1;
    if (EVERY_CHOICES.includes(Number(raw.every))) s.every = Number(raw.every);
    if (Number.isInteger(raw.step) && raw.step >= 0 && raw.step < PROGRAMME_STEPS.length) s.step = raw.step;
    if (raw.trade === false || raw.trade === 0) s.trade = false;
    if (raw.thin === false || raw.thin === 0) s.thin = false;
    if (FILL_STEPS.some(f => f.id === raw.fill)) s.fill = raw.fill;
    return s;
}

// The programme's options for these settings (the board's programmeOptions
// with the same slider step, trade switch and make-up, and the player's
// fine tuning, kinprogtune.js).
export function programmeOptionsFor(settings, ratio = 'auto', pinIds = null, tune = null) {
    const st = PROGRAMME_STEPS[settings.step] || PROGRAMME_STEPS[PROGRAMME_DEFAULT_STEP];
    const o = { moveCost: st.cost, useTradeCentre: settings.trade !== false, ratio: ratio || 'auto' };
    if (st.outsider != null) o.outsiderCost = st.outsider;
    if (pinIds && pinIds.size) o.pinIds = pinIds;
    return applyTuning(Object.assign(o, AUTO_SEARCH), tune);
}

export function fillOf(settings) {
    const st = FILL_STEPS.find(x => x.id === settings.fill) || FILL_STEPS.find(x => x.id === SPECIES_DEFAULTS.fill);
    return st.fill;
}

const asSet = v => (v instanceof Set ? v : new Set(Array.isArray(v) ? v.map(String) : []));

function homeOf(a) {
    return a.hab || (a.lt === 'trade' ? TRADE : '');
}

// The ledger's view for this load, checked: { pinned, cooled, leaving,
// recentFrom: Map(id -> Set(hab)), blocked: Set('id>to') }.
function viewOf(v) {
    const o = v || {};
    const recent = new Map();
    const src = o.recentFrom instanceof Map ? o.recentFrom : new Map(Object.entries(o.recentFrom || {}));
    for (const [k, s] of src) recent.set(String(k), asSet(s));
    return { pinned: asSet(o.pinned), cooled: asSet(o.cooled), leaving: asSet(o.leaving), recentFrom: recent, blocked: asSet(o.blocked) };
}

// The animals Auto mode leaves where they are (hands off, moved by Auto
// mode itself lately), and those the programme treats as fixed (also the
// ones it sent away, which stay away).
export function locksOf(model, species, view) {
    const v = viewOf(view);
    const locked = new Set();
    for (const a of model.animals.values()) {
        if (a.species !== species) continue;
        if (v.pinned.has(a.id) || v.cooled.has(a.id)) locked.add(a.id);
    }
    const pins = new Set(locked);
    for (const id of v.leaving) {
        const a = model.animals.get(id);
        if (a && a.species === species && homeOf(a) === TRADE) pins.add(id);
    }
    return { locked, pins, view: v };
}

// One run, in two halves around the Breeding programme (the runtime runs
// the programme's search in slices in between):
//
//   1. Thin out (if chosen) on the zoo as it is: adults over each
//      habitat's fill level go to the trade centre, the old and infertile
//      first. It comes first because the programme counts the adults that
//      don't breed as fixed room: with them still there it would send
//      breeders away instead.
//   2. The programme on the zoo as Thin out leaves it, with the animals
//      Auto mode must not move pinned (and the ones just sent away).
//
// input: { model, species, info, destinations, assignments, settings
//          (normalizeSpecies), ratio (the board's make-up choice), view
//          (kinautoledger ledgerView), tradeFree (places left at the trade
//          centre, null: unknown), tune (the fine tuning, kinprogtune.js:
//          its Breeding goal and kin rule also decide how Thin out culls),
//          months (the park's calendar, calendarMonths; null: unknown) }
// prepareAutoRun(input) -> { model (after Thin out), pins, ... } for the
// programme; finishAutoRun(input, prep, programmeResult) -> the run:
// { species, moves: [{ id, to, reason, stage: 'thin'|'programme', reversal }],
//   programme, thin, notes: [text], held: [{ id, why }],
//   waits: [move + { from, hab, after: [id], names: [name] }] (moves that
//   wait until a male has left, waitForLeavingMales),
//   seasonUntil (calendar months: the end of the breeding season some
//   breeding pairs wait for, seasonHold; only then) }
// planAutoRun(input) does all three at once (tests).
export function prepareAutoRun(input) {
    const { model, species, info = null, destinations = null } = input;
    const settings = normalizeSpecies(Object.assign({}, input.settings, { on: true }));
    const out = { species, moves: [], programme: null, thin: null, notes: [], held: [] };
    const prep = { out, settings, model, pins: new Set(), locked: new Set(), view: viewOf(input.view), taken: new Set(), tradeLeft: Infinity };
    if (!model || !species) return prep;
    const { locked, pins, view } = locksOf(model, species, input.view);
    Object.assign(prep, { locked, pins, view, tradeLeft: input.tradeFree == null ? Infinity : Math.max(0, input.tradeFree) });
    if (settings.thin) {
        // animals Auto mode placed lately stay (Thin out does not undo the
        // programme's last runs), and so does what it must not touch
        const keepIds = new Set(locked);
        for (const id of view.recentFrom.keys()) keepIds.add(id);
        // the game's own most per sex outranks Auto mode's own cooldown (it
        // put the second male there), never the player's hands off
        const limitKeepIds = new Set(Array.from(locked).filter(id => view.pinned.has(id)));
        const c = cullPlan(model, species, info || {}, { options: Object.assign({ fill: fillOf(settings), ratio: input.ratio || 'auto', keepIds, limitKeepIds }, tuningCull(input.tune)) });
        out.thin = c;
        if (c) for (const m of c.moves) addMove(prep, model.animals.get(String(m.id)), TRADE, `Thin out: ${m.reason}`, 'thin', { overCooldown: !!m.limit, limit: !!m.limit, yields: !!m.yields });
    }
    // only the leader of a sex mates and the eldest leads: an adult too old to
    // breed blocks its group, so it leaves (the programme then fills the gap)
    if (settings.trade !== false) {
        for (const a of leaderBlockers(model, species, info)) {
            addMove(prep, a, TRADE, `too old to breed, and it leads its group: only the leaders breed`, 'programme', { overCooldown: true });
        }
    }
    if (out.moves.length) {
        prep.model = simulatePlan(model, out.moves, destinations);
        for (const m of out.moves) prep.pins.add(m.id);
    }
    if (AUTO_LIMITS.growUpYears > 0) prep.model = projectGrownUp(prep.model, species, info, AUTO_LIMITS.growUpYears);
    return prep;
}

// Where only the leader of a sex mates (the game's mating rules,
// info.leaderMale / leaderFemale) and the eldest leads, an adult of that sex
// that can no longer breed (too old, or infertile) leads its group and so
// blocks every younger one: old African wild dogs led three of four packs
// and none bred (2026-10-27). -> those adults, in habitats where an adult of
// the species can still breed (a group of old ones only is left alone).
export function leaderBlockers(model, species, info) {
    const sexes = [];
    if (info && info.leaderMale === true) sexes.push(Sex.Male);
    if (info && info.leaderFemale === true) sexes.push(Sex.Female);
    if (!model || !sexes.length) return [];
    const ended = a => a.fert && (a.fert.state === 'old' || a.fert.state === 'sterile');
    const byHab = new Map();
    for (const a of model.animals.values()) {
        if (a.species !== species || a.exhibit || a.alive === false || !a.hab || a.juv) continue;
        if (!byHab.has(a.hab)) byHab.set(a.hab, []);
        byHab.get(a.hab).push(a);
    }
    const out = [];
    for (const group of byHab.values()) {
        if (!group.some(a => !ended(a) && !a.contra)) continue;
        for (const a of group) if (sexes.includes(a.sex) && ended(a) && !a.preg) out.push(a);
    }
    return out;
}

// The zoo with the species' young that grow up within `years` shown as
// adults, so the programme places them as breeders (away from a parent)
// before they can breed. Also an adult in looks that is not yet of age (the
// game reports it infertile until then: a leopard of 2.3, mature at 2.5,
// was sent away as "not breeding", 2026-10-26). The same model when there
// are none.
export function projectGrownUp(model, species, info, years) {
    const facts = (model && model.speciesFacts && model.speciesFacts[species]) || {};
    const ages = (info && info.fertilityAges) || {};
    const maturity = ages.maturity != null ? ages.maturity : facts.maturity;
    if (!model || !model.snapshot || maturity == null) return model;
    const soon = new Set();
    for (const a of model.animals.values()) {
        if (a.species !== species || a.exhibit || typeof a.age !== 'number' || a.age < maturity - years) continue;
        const notOfAge = !a.juv && a.age < maturity && (a.infertile || (a.fert && a.fert.state === 'young'));
        if (a.juv || notOfAge) soon.add(a.id);
    }
    if (!soon.size) return model;
    const animals = model.snapshot.animals.map(a => {
        if (!soon.has(String(a.id))) return a;
        const fert = a.fert && a.fert.state === 'young' ? Object.assign({}, a.fert, { state: '' }) : a.fert;
        // not of age is the only reason it is infertile
        const infertile = a.age < maturity ? false : a.infertile;
        return Object.assign({}, a, { juv: false, age: Math.max(a.age, maturity), ageQ: 2, fert, infertile });
    });
    const opts = Object.assign({}, model.opts || { closeKinship: model.closeKinship }, { ped: model.ped || null });
    return buildKinModel(Object.assign({}, model.snapshot, { animals, normalized: true }), opts);
}

// overCooldown: the game's own rules (its most per sex, an old leader)
// outrank Auto mode's own cooldown, never the player's hands off.
// limit: Thin out sends it away for the game's most per sex (move.limit).
// yields: ... a breeding core, best genes or a strand's carrier giving way to
// one that can't go (move.yields): no carrier guard holds it.
function addMove(prep, a, to, reason, stage, { overCooldown = false, limit = false, yields = false } = {}) {
    const { out, locked, taken, view } = prep;
    if (!a || !canMove(a) || isPinned(a) || taken.has(a.id)) return false;
    if (locked.has(a.id) && !(overCooldown && !view.pinned.has(a.id))) return false;
    if (String(to) === homeOf(a)) return false;
    if (view.blocked.has(`${a.id}>${to}`)) {
        out.held.push({ id: a.id, why: 'the game refused this move recently' });
        return false;
    }
    if (to === TRADE) {
        if (prep.tradeLeft <= 0) {
            out.held.push({ id: a.id, why: 'the trade centre is full' });
            return false;
        }
        prep.tradeLeft--;
    }
    const back = view.recentFrom.get(a.id);
    out.moves.push(Object.assign({ id: a.id, to: String(to), reason, stage, reversal: !!(back && back.has(String(to))) }, limit ? { limit: true } : {}, yields ? { yields: true } : {}));
    taken.add(a.id);
    return true;
}

// The programme's moves (made on prep.model) added to the run.
export function finishAutoRun(input, prep, programme) {
    const { out } = prep;
    out.programme = programme || null;
    const model = input.model;
    // (young about to grow up count as breeders here, so the programme can
    // place them in another group before they can breed with a parent; but
    // youth is left alone otherwise: a juvenile never goes to the trade
    // centre, the developer 2026-10-19)
    for (const m of (programme && programme.moves) || []) {
        const a = model && model.animals.get(String(m.id));
        if (a && a.juv && m.to === TRADE) {
            out.held.push({ id: a.id, why: 'young: stays until grown up' });
            continue;
        }
        addMove(prep, a, m.to, m.reason || 'breeding programme', 'programme');
    }
    keepLastBreeders(input, out);
    if (tuningGoal(input.tune) === 'ceiling') keepCarriers(input, out);
    seasonHold(input, out);
    stageRestructures(input, out);
    keepGameLimits(input, out);
    waitForLeavingMales(input, out);
    waitForNewLeaders(input, out);
    if (out.held.some(x => x.why === 'the trade centre is full')) out.notes.push('The trade centre is full: some animals stay until there is room (sell or release the ones waiting there).');
    overLimitNotes(input, out);
    const idle = programme && programme.after ? programme.after.idle || 0 : 0;
    if (idle) out.notes.push(`${idle} breeder${idle === 1 ? ' has' : 's have'} no unrelated partner in the zoo: new animals from the market would let ${idle === 1 ? 'it' : 'them'} breed.`);
    return out;
}

// The programme sends breeders with no place in a group to the trade
// centre. In a species where everyone is related that would empty it, so
// Auto mode never sends away the last breeding male or female left in the
// habitats (the run's later trade moves are dropped first).
function keepLastBreeders(input, out) {
    const { model, species } = input;
    if (!model) return;
    const facts = (model.speciesFacts && model.speciesFacts[species]) || {};
    const ages = (input.info && input.info.fertilityAges) || { maturity: facts.maturity, infertility: facts.infertility };
    const info = { fertilityAges: ages };
    const left = { [Sex.Male]: 0, [Sex.Female]: 0 };
    const goes = new Set(out.moves.filter(m => m.to === TRADE).map(m => m.id));
    const comes = new Set(out.moves.filter(m => m.to !== TRADE).map(m => m.id));
    for (const a of model.animals.values()) {
        if (a.species !== species || a.exhibit || !(a.sex in left) || !isBreeder(a, info)) continue;
        const inHab = a.hab ? !goes.has(a.id) : comes.has(a.id);
        if (inHab) left[a.sex]++;
    }
    for (let i = out.moves.length - 1; i >= 0; i--) {
        const m = out.moves[i];
        if (m.to !== TRADE) continue;
        const a = model.animals.get(m.id);
        if (!a || !a.hab || !(a.sex in left) || !isBreeder(a, info) || left[a.sex] > 0) continue;
        out.moves.splice(i, 1);
        left[a.sex]++;
        out.held.push({ id: a.id, why: 'the last breeder of its sex stays' });
    }
}

// The Breeding goal "Push the ceiling": the last two carriers of each best
// strand in the habitats (kinstrands.js carrierKeepers, the ones Thin out
// keeps) are never sent to the trade centre, by Thin out or the programme.
function keepCarriers(input, out) {
    const { model, species } = input;
    if (!model) return;
    const all = Array.from(model.animals.values()).filter(a => a.species === species && !a.exhibit && a.alive !== false);
    const stats = speciesStrands(model, species, input.info || {});
    const keep = carrierKeepers(stats, all.filter(a => a.hab), breedsNow);
    // Thin out's send for the game's most per sex (move.limit) stops only for
    // a strand's last carrier among the animals staying in the habitats
    const leaving = new Set(out.moves.filter(m => m.to === TRADE).map(m => String(m.id)));
    const staying = all.filter(a => a.hab && !leaving.has(String(a.id)));
    for (let i = out.moves.length - 1; i >= 0; i--) {
        const m = out.moves[i];
        if (m.to !== TRADE) continue;
        const a = model.animals.get(String(m.id));
        // giving way to one that can't go (move.yields): it goes
        if (m.yields) continue;
        const why = m.limit ? (a ? lastCarrier(stats, a, staying) : '') : keep.get(m.id);
        if (!why) continue;
        out.moves.splice(i, 1);
        out.held.push({ id: m.id, why });
        if (a) staying.push(a);
    }
}

// ------------------------------------- the breeding season, and staging
//
// Where only the leaders breed (the game's mating rules, info.leaderMale /
// leaderFemale: a pack's leader pair, a harem's leader male), a group whose
// leader leaves breeds again only once the new leader is there, of age and
// paired. A species that breeds in one season of the year
// (info.breedingSeasons; African wild dogs: summer) has one chance a year:
// broken up just before the season or in it, the group loses that year's
// young. The 15-year simulation of 2026-10-28 lost every first-summer litter
// (Auto mode's first run made young of 1.1 the new leaders, under age until
// the autumn), worth 1.2 points at year 15.

// The species' breeding season on the park's calendar: info.breedingSeasons
// (one flag per season of the calendar year, as TimeOfMonth:Season(): 0 is
// months 1-3) and months (calendarMonths). null when either is unknown or
// the species breeds all year. -> { inSeason, startsIn, endsIn (months from
// now to the season's start, 0 in it, and to its end), until (its end, in
// calendar months) }
export function breedingWindow(info, months) {
    const s = info && info.breedingSeasons;
    if (!Array.isArray(s) || s.length !== 4 || !s.every(v => typeof v === 'boolean')) return null;
    if (typeof months !== 'number' || !isFinite(months) || s.every(Boolean) || !s.some(Boolean)) return null;
    const inYear = ((months % 12) + 12) % 12;
    const now = Math.min(3, Math.floor(inYear / 3));
    const left = 3 * (now + 1) - inYear;          // months left of this season
    let k = 0;                                    // seasons until the next breeding one
    while (!s[(now + k) % 4]) k++;
    let n = 1;                                    // breeding seasons in a row from there
    while (n < 4 && s[(now + k + n) % 4]) n++;
    const startsIn = k === 0 ? 0 : left + 3 * (k - 1);
    const endsIn = (k === 0 ? left : startsIn + 3) + 3 * (n - 1);
    return { inSeason: k === 0, startsIn, endsIn, until: months + endsIn };
}

function leaderSexes(info) {
    const out = [];
    if (info && info.leaderMale === true) out.push(Sex.Male);
    if (info && info.leaderFemale === true) out.push(Sex.Female);
    return out;
}

// The species' fertility ages, and the wait between a mother's litters
// (info.interBirthYears: the game's InterBirthYears, African wild dog 1.0,
// spotted hyena 0.95, Plains zebra 0.917) with each mother's youngest young
// (its age). The wait counts from the birth: no dog mother in the saves of
// 2026-10-28 littered two summers running (16 of 16 gaps 1.85 years or
// more), and no pack whose leader female had young the summer before bred.
// Unknown: no wait counted.
function fertilityAgesOf(input) {
    const { model, species, info } = input;
    const facts = (model && model.speciesFacts && model.speciesFacts[species]) || {};
    const ages = Object.assign({}, (info && info.fertilityAges) || { maturity: facts.maturity, infertility: facts.infertility }, { young: new Map() });
    ages.interBirth = info && typeof info.interBirthYears === 'number' && info.interBirthYears > 0 ? info.interBirthYears : null;
    for (const a of model && ages.interBirth ? model.animals.values() : []) {
        if (a.species !== species || a.alive === false || typeof a.age !== 'number' || a.age >= ages.interBirth) continue;
        for (const p of a.par || []) ages.young.set(String(p), Math.min(ages.young.has(String(p)) ? ages.young.get(String(p)) : Infinity, a.age));
    }
    return ages;
}

// Can it breed in the window `when` ({ from, to }: months from now to its
// start and end): grown, of age when it starts and not yet too old, not on
// contraception or sterile (ages counted in park time), and a mother's wait
// since her last young over before it ends?
function breedsBy(a, ages, when) {
    if (!a || a.juv || a.exhibit || a.alive === false || a.contra) return false;
    const st = a.fert && a.fert.state;
    if (st === 'old' || st === 'sterile') return false;
    const y = a.sex === Sex.Female && ages.young ? ages.young.get(String(a.guid || a.id)) : null;
    if (y != null && y + when.to / 12 < ages.interBirth) return false;
    if (typeof a.age !== 'number') return !a.infertile && st !== 'young';
    const young = ages.maturity != null && a.age < ages.maturity;
    // infertile for another reason than its youth
    if ((a.infertile || st === 'young') && !young) return false;
    const age = a.age + when.from / 12;
    if (ages.maturity != null && age < ages.maturity) return false;
    return !(ages.infertility != null && ages.infertility < 900 && age >= ages.infertility);
}

const NOW = Object.freeze({ from: 0, to: 0 });

// The species' grown animals per habitat after `moves` (none: as they are
// now). One that comes in does not lead there (a staying leader keeps its
// role). -> Map(hab -> [animal])
function groupsAfter(model, species, moves) {
    const to = new Map(moves.map(m => [String(m.id), m.to === TRADE ? '' : String(m.to)]));
    const out = new Map();
    for (const a of model.animals.values()) {
        if (a.species !== species || a.exhibit || a.alive === false || a.juv) continue;
        const moved = to.has(String(a.id)) && to.get(String(a.id)) !== a.hab;
        const h = moved ? to.get(String(a.id)) : a.hab;
        if (!h) continue;
        if (!out.has(h)) out.set(h, []);
        out.get(h).push(moved ? Object.assign({}, a, { alpha: false }) : a);
    }
    return out;
}

// A group's breeding leaders in the window `when`: per leading sex its leader
// (packLeaderOf: the leader there now, else the eldest), each able to breed
// then, with a partner of the other sex that can where one sex leads.
// bonds: a pack's two leaders must not be bonded elsewhere or mourning (the
// game's bond data, known for the zoo as it is). -> [animal] or null
function breedingLeaders(group, sexes, ages, when, bonds) {
    const leaders = [];
    for (const sex of sexes) {
        const a = packLeaderOf(group, sex);
        if (!breedsBy(a, ages, when)) return null;
        leaders.push(a);
    }
    if (sexes.length === 1 && !group.some(b => b.sex !== sexes[0] && breedsBy(b, ages, when))) return null;
    if (sexes.length === 2 && bonds) {
        const free = (a, b) => !a.bond || (!(a.bond.mourn > 0) && (!a.bond.mate || String(a.bond.mate) === String(b.id)));
        if (!free(leaders[0], leaders[1]) || !free(leaders[1], leaders[0])) return null;
    }
    return leaders;
}

// The groups that breed (in the window `when`) and the run's moves taking
// one of their leaders out (the game's most per sex, move.limit, always
// goes). -> [{ hab, group, leaders, leaving: [move] }]
function brokenGroups(input, out, when, ages) {
    const { model, species } = input;
    const sexes = leaderSexes(input.info);
    const res = [];
    for (const [hab, group] of groupsAfter(model, species, [])) {
        const leaders = breedingLeaders(group, sexes, ages, when, true);
        if (!leaders) continue;
        const ids = new Set(leaders.map(a => String(a.id)));
        const leaving = out.moves.filter(m => ids.has(String(m.id)) && String(m.to) !== hab && !m.limit);
        if (leaving.length) res.push({ hab, group, leaders, leaving });
    }
    return res;
}

// Moves held back (a mother's young following her stay with her).
function holdMoves(model, out, moves, why) {
    for (const m of moves) {
        const i = out.moves.indexOf(m);
        if (i < 0) continue;
        out.moves.splice(i, 1);
        out.held.push({ id: m.id, why });
        const a = model.animals.get(String(m.id));
        if (!a || a.sex !== Sex.Female) continue;
        for (let k = out.moves.length - 1; k >= 0; k--) {
            const x = out.moves[k];
            const y = model.animals.get(String(x.id));
            if (String(x.to) !== String(m.to) || !y || !y.juv || !(y.par || []).includes(a.guid || a.id)) continue;
            out.moves.splice(k, 1);
            out.held.push({ id: y.id, why: 'stays with its mother' });
        }
    }
}

// "Wild Dog 01", "Wild Dog 01 and Wild Dog 03", "Wild Dog 01, Wild Dog 03 and 2 more"
function placesText(model, habs) {
    const names = habs.map(h => (model.habitats.get(h) || {}).name || 'a habitat');
    if (names.length <= 2) return names.join(' and ');
    if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
    return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

// A seasonal breeder's breeding groups keep their leaders through the
// breeding season and the seasonLeadMonths before it (keepers carry moves in
// their own time, a new leader takes days): no move takes such a leader out,
// unless the group's young of the season are on the way (its breeding
// females pregnant). Earlier in the year only where the group would then
// have no breeding pair by the season (a new leader not of age by then, or
// none left), even if the one leaving would lead another: whether a moved
// leader's old bond lets it breed there is not known, and moving a pair
// together cost it the season in the simulation (2026-10-28: 2.8 first-summer
// litters kept against 1.7 with that exception). Those moves wait until the
// season has passed (the next run plans again). A group left with nobody of
// a leading sex is held only from 12 months less the season and one run's
// interval before it (wild dogs on a run a season: 6 months), so the run
// right after a season is free and such a change waits a season, never for
// good (a new pen a pair is to move to stays empty a season at most); a new
// leader not of age or a mother still in her wait is over by the next
// season anyway. The rest of the run (Thin out, the young, the others) goes
// as planned.
function seasonHold(input, out) {
    const { model, species } = input;
    const win = breedingWindow(input.info, input.months);
    const sexes = leaderSexes(input.info);
    if (!model || !win || !sexes.length || !out.moves.length) return;
    const ages = fertilityAgesOf(input);
    const when = { from: win.startsIn, to: win.endsIn };
    const near = win.inSeason || win.startsIn <= AUTO_LIMITS.seasonLeadMonths;
    // close enough to the season to hold a group left with nobody to lead
    const every = input.settings && EVERY_CHOICES.includes(Number(input.settings.every)) ? Number(input.settings.every) : SPECIES_DEFAULTS.every;
    const soon = win.startsIn <= 12 - (win.endsIn - win.startsIn) - every;
    const breeds = group => !!group && !!breedingLeaders(group, sexes, ages, when, false);
    const held = { season: [], young: [] };
    const late = [];
    for (let round = 0; round < 50; round++) {
        const after = groupsAfter(model, species, out.moves);
        const g = brokenGroups(input, out, when, ages).find(b => {
            if (near) {
                // the season's young are on the way
                const mothers = sexes.includes(Sex.Female) ? b.leaders.filter(a => a.sex === Sex.Female) : b.group.filter(a => a.sex === Sex.Female && breedsBy(a, ages, when));
                return !(mothers.length && mothers.every(a => a.preg));
            }
            const there = after.get(b.hab) || [];
            if (breeds(there)) return false;
            // nobody of a leading sex left: only that close to the season
            return soon || sexes.every(sex => !!packLeaderOf(there, sex));
        });
        if (!g) break;
        if (near) {
            held.season.push(g.hab);
            holdMoves(model, out, g.leaving, win.inSeason ? 'its group breeds: the breeding season is on' : 'its group breeds: the breeding season starts within a month');
            continue;
        }
        // who would lead instead, too young for the season
        for (const sex of sexes) {
            const a = packLeaderOf(after.get(g.hab) || [], sex);
            const under = a && typeof a.age === 'number' && ages.maturity != null && a.age + win.startsIn / 12 < ages.maturity;
            if (under && !late.includes(a.name)) late.push(a.name);
        }
        held.young.push(g.hab);
        holdMoves(model, out, g.leaving, 'its group breeds this season: its new leaders could not breed in it');
    }
    if (!held.season.length && !held.young.length) return;
    out.seasonUntil = win.until;
    const keep = habs => `${placesText(model, habs)} keep${habs.length === 1 ? 's its breeding pair' : ' their breeding pairs'}`;
    if (held.season.length) out.notes.push(`${win.inSeason ? 'The breeding season is on' : 'The breeding season starts within a month'}: ${keep(held.season)} until it is over.`);
    if (held.young.length) out.notes.push(`${keep(held.young)} until the breeding season is over: ${late.length ? `${late.slice(0, 2).join(' and ')} would not be of age for it` : 'its new leaders could not breed in it'}.`);
}

// At most AUTO_LIMITS.packsPerRun groups lose a breeding leader in one run
// (any species where only the leaders breed): a big reshuffle goes over
// several runs, so a slow move or a late new leader costs a litter or two,
// not every group's at once. The groups whose new pairs gain the most go
// first; a change spanning groups (a leader leaving one to lead another)
// goes whole, and the first always goes. The others' leaders stay this run
// (their moves out are held back); the next run plans again.
function stageRestructures(input, out) {
    const { model, species } = input;
    const limit = AUTO_LIMITS.packsPerRun;
    if (!model || !leaderSexes(input.info).length || !(limit > 0) || !out.moves.length) return;
    const ages = fertilityAgesOf(input);
    const broken = brokenGroups(input, out, NOW, ages);
    if (broken.length <= limit) return;
    const sexes = leaderSexes(input.info);
    const info = input.info || {};
    // a group's breeding value: its leaders' expected young times the
    // conception chance, with every partner where one sex leads
    const value = (group, bonds) => {
        const leaders = group && breedingLeaders(group, sexes, ages, NOW, bonds);
        if (!leaders) return 0;
        const pair = (m, f) => youngQuality(m, f) * conceptionChance(m, f, info);
        if (sexes.length === 2) return pair(leaders[0], leaders[1]);
        const lead = leaders[0];
        const mates = group.filter(b => b.sex !== lead.sex && breedsBy(b, ages, NOW));
        const vals = mates.map(b => (lead.sex === Sex.Male ? pair(lead, b) : pair(b, lead)));
        return lead.sex === Sex.Male ? vals.reduce((s, v) => s + v, 0) : Math.max(0, ...vals);
    };
    // the groups a change spans: each breaking leader's habitat and where it goes
    const parent = new Map();
    const find = h => {
        while (parent.get(h) !== h) h = parent.get(h);
        return h;
    };
    const join = (a, b) => {
        for (const h of [a, b]) if (!parent.has(h)) parent.set(h, h);
        parent.set(find(a), find(b));
    };
    for (const b of broken) {
        join(b.hab, b.hab);
        for (const m of b.leaving) if (m.to !== TRADE) join(b.hab, String(m.to));
    }
    const now = groupsAfter(model, species, []);
    const after = groupsAfter(model, species, out.moves);
    const changes = new Map();
    for (const h of parent.keys()) {
        const k = find(h);
        if (!changes.has(k)) changes.set(k, { habs: [], broken: [], gain: 0 });
        const c = changes.get(k);
        c.habs.push(h);
        c.gain += value(after.get(h), false) - value(now.get(h), true);
    }
    for (const b of broken) changes.get(find(b.hab)).broken.push(b);
    const order = Array.from(changes.values()).sort((x, y) => y.gain - x.gain || x.broken.length - y.broken.length);
    let used = 0;
    const waiting = [];
    for (const c of order) {
        if (!used || used + c.broken.length <= limit) {
            used += c.broken.length;
            continue;
        }
        for (const b of c.broken) {
            waiting.push(b.hab);
            holdMoves(model, out, b.leaving, `at most ${limit} groups change their breeding leaders in one run: the next run plans this again`);
        }
    }
    if (waiting.length) out.notes.push(`At most ${limit} breeding groups change leaders in one run: ${placesText(model, waiting)} keep${waiting.length === 1 ? 's its' : ' their'} leaders until the next run.`);
}

// The game's own most adults per sex in a habitat (kincull.js sexLimit:
// one male leopard and one female, or two females alone): the run never
// leaves a habitat over it. A move held back (the last breeder, a carrier)
// leaves the programme short of a place it planned with; the moves into a
// habitat that would then be over the limit are dropped too: first those of
// the sex over it, the newest first, then anything else coming in (a female
// joining two males, the young following her), until it fits or nothing
// more is coming in. Two male leopards ended up together that way
// (2026-10-26). A habitat already over the limit gets nobody new; Thin out
// sends the extra ones away (or names the ones it must keep,
// overLimitNotes).
function keepGameLimits(input, out) {
    const { model, species } = input;
    if (!model || !out.moves.length) return;
    const rule = groupRule(input.info || {}, input.ratio || 'auto');
    if (!rule.gameMales && !rule.gameFemales && !rule.bachelorMales && !rule.bachelorFemales) return;
    const adults = Array.from(model.animals.values()).filter(a => a.species === species && !a.exhibit && a.alive !== false && !a.juv);
    for (let round = 0; round < 100; round++) {
        const to = new Map(out.moves.map(m => [String(m.id), m.to === TRADE ? '' : String(m.to)]));
        const byHab = new Map();
        for (const a of adults) {
            const h = to.has(String(a.id)) ? to.get(String(a.id)) : a.hab;
            if (!h) continue;
            if (!byHab.has(h)) byHab.set(h, []);
            byHab.get(h).push(a);
        }
        let dropped = null;
        for (const [hab, group] of byHab) {
            for (const sex of [Sex.Male, Sex.Female]) {
                const limit = sexLimit(rule, sex, group);
                if (limit == null || group.filter(a => a.sex === sex).length <= limit) continue;
                const place = (model.habitats.get(hab) || {}).name || 'its habitat';
                const why = `${place} would hold more adult ${sex === Sex.Male ? 'males' : 'females'} than the game allows (${limit})`;
                // the newest move bringing one of that sex, else anything coming in
                const coming = out.moves.map((m, i) => ({ m, i, a: model.animals.get(String(m.id)) }))
                    .filter(x => String(x.m.to) === hab && x.a).reverse();
                const pick = coming.find(x => x.a.sex === sex && !x.a.juv) || coming.find(x => !x.a.juv) || coming[0];
                if (!pick) continue;
                out.moves.splice(pick.i, 1);
                dropped = [{ id: pick.a.id, why }];
                // her young following her there stay with her
                if (pick.a.sex === Sex.Female) {
                    for (let i = out.moves.length - 1; i >= 0; i--) {
                        const m = out.moves[i];
                        const y = model.animals.get(String(m.id));
                        if (String(m.to) !== hab || !y || !y.juv || !(y.par || []).includes(pick.a.guid || pick.a.id)) continue;
                        out.moves.splice(i, 1);
                        dropped.push({ id: y.id, why: 'stays with its mother' });
                    }
                }
                break;
            }
            if (dropped) break;
        }
        if (!dropped) return;
        out.held.push(...dropped);
    }
}

// Habitats Thin out leaves over the game's most per sex because the extra
// ones must stay (the player's keep, pregnant, a breeding core, a best
// strand's last carriers): named in the run's notes, so the player can move
// one to storage or another zoo.
function overLimitNotes(input, out) {
    const { model } = input;
    const keepWhy = new Map();
    for (const h of (out.thin && out.thin.habitats) || []) for (const k of h.keep || []) keepWhy.set(String(k.id), k.why === 'your choice' ? 'hands off' : k.why);
    for (const o of (out.thin && out.thin.overLimit) || []) {
        const place = (model && model.habitats.get(o.hab) || {}).name || 'A habitat';
        const names = o.ids.map(id => {
            const why = keepWhy.get(String(id));
            return `${(model.animals.get(String(id)) || {}).name || id}${why ? ` (${why})` : ''}`;
        });
        const word = o.sex === Sex.Male ? 'male' : 'female';
        out.notes.push(`${place} holds more adult ${word}s than the game allows (${o.limit}): ${names.join(', ')} must stay, so Auto mode can't fix it. Move one to storage or another zoo.`);
    }
    if (out.held.some(x => / than the game allows /.test(x.why))) out.notes.push('Some moves were held back: they would put more adults of a sex in a habitat than the game allows.');
}

// One adult male per group (the game's own limit, rule.oneMale: Sable
// antelope, Plains zebra; or a harem make-up): a male the run brings into a
// habitat waits until the adult male leaving it has gone. Keepers carry
// each move in their own time; a late one left two males in one habitat and
// none in the other (2026-10-23). Two males trading places: the first of
// them in the run goes now, the other once he has left. The waiting moves
// leave out.moves for out.waits (the runtime runs them later, waitsReady).
function waitForLeavingMales(input, out) {
    out.waits = [];
    const { model, species } = input;
    if (!model || !out.moves.length) return;
    const rule = groupRule(input.info || {}, input.ratio || 'auto');
    if (!rule.oneMale && !(rule.m === 1 && rule.f === Infinity)) return;
    const adultMale = a => !!a && a.species === species && a.sex === Sex.Male && !a.juv && !a.exhibit && a.alive !== false;
    const leaving = new Map(out.moves.map(m => [String(m.id), String(m.to)]));
    const deps = new Map();
    for (const m of out.moves) {
        const a = model.animals.get(String(m.id));
        if (m.to === TRADE || !adultMale(a)) continue;
        const after = [];
        for (const b of model.animals.values()) {
            if (b.id === a.id || !adultMale(b) || b.hab !== String(m.to)) continue;
            if (leaving.has(String(b.id)) && leaving.get(String(b.id)) !== String(m.to)) after.push(String(b.id));
        }
        if (after.length) deps.set(String(m.id), after);
    }
    if (!deps.size) return;
    // a wait that leads back to itself (males trading places): the first of
    // them in the run goes now
    const waiting = new Set(deps.keys());
    const reaches = (from, target, seen) => {
        for (const d of deps.get(from) || []) {
            if (d === target) return true;
            if (!waiting.has(d) || seen.has(d)) continue;
            seen.add(d);
            if (reaches(d, target, seen)) return true;
        }
        return false;
    };
    for (const m of out.moves) {
        const id = String(m.id);
        if (waiting.has(id) && reaches(id, id, new Set())) waiting.delete(id);
    }
    for (let i = 0; i < out.moves.length; i++) {
        const m = out.moves[i];
        const id = String(m.id);
        if (!waiting.has(id)) continue;
        const a = model.animals.get(id);
        const after = deps.get(id);
        out.waits.push(Object.assign({}, m, { from: homeOf(a), hab: String(m.to), after, names: after.map(x => model.animals.get(x).name) }));
        out.moves.splice(i--, 1);
    }
}

// Packs (rule.pack: only the leaders mate, and the eldest there is promoted
// when a leader leaves): a leader the run moves out of its habitat waits
// until the run's newcomers of its sex have arrived there and the others of
// its sex leaving it have gone, so the one promoted is the one the plan made
// leader. Keepers carry each move in their own time: with the leader gone
// first, the eldest still there would lead, perhaps a young one (2026-10-28,
// Cradle #2's wild dogs). Two leaders trading packs: the first of them in
// the run goes now. The waits carry kind 'leader', at (its habitat) and
// arrive (the newcomers).
function waitForNewLeaders(input, out) {
    const { model, species } = input;
    if (!model || !out.moves.length) return;
    const rule = groupRule(input.info || {}, input.ratio || 'auto');
    if (!rule.pack) return;
    const grown = a => !!a && a.species === species && !a.juv && !a.exhibit && a.alive !== false;
    const deps = new Map();
    for (const m of out.moves) {
        const a = model.animals.get(String(m.id));
        if (!grown(a) || !a.alpha || !a.hab || String(m.to) === a.hab) continue;
        const arrive = [], after = [];
        for (const x of out.moves) {
            const b = model.animals.get(String(x.id));
            if (!grown(b) || b === a || b.sex !== a.sex) continue;
            if (String(x.to) === a.hab && b.hab !== a.hab) arrive.push(String(b.id));
            else if (b.hab === a.hab && String(x.to) !== a.hab) after.push(String(b.id));
        }
        if (arrive.length || after.length) deps.set(String(a.id), { arrive, after, at: a.hab });
    }
    if (!deps.size) return;
    // a wait that leads back to itself (leaders trading packs): the first of
    // them in the run goes now
    const waiting = new Set(deps.keys());
    const reaches = (from, target, seen) => {
        const d = deps.get(from);
        for (const x of d ? d.arrive.concat(d.after) : []) {
            if (x === target) return true;
            if (!waiting.has(x) || seen.has(x)) continue;
            seen.add(x);
            if (reaches(x, target, seen)) return true;
        }
        return false;
    };
    for (const m of out.moves) {
        const id = String(m.id);
        if (waiting.has(id) && reaches(id, id, new Set())) waiting.delete(id);
    }
    const nameOf = id => model.animals.get(id).name;
    for (let i = 0; i < out.moves.length; i++) {
        const m = out.moves[i];
        const id = String(m.id);
        if (!waiting.has(id)) continue;
        const a = model.animals.get(id);
        const d = deps.get(id);
        out.waits.push(Object.assign({}, m, { kind: 'leader', from: homeOf(a), hab: String(m.to), at: d.at, arrive: d.arrive, after: d.after,
            names: d.arrive.concat(d.after).map(nameOf), arriveNames: d.arrive.map(nameOf), afterNames: d.after.map(nameOf) }));
        out.moves.splice(i--, 1);
    }
}

// A waiting move in words: what it waits for ('Kito and Zuri have left',
// 'Abeo has arrived and Kito has left').
export function waitText(w) {
    const list = names => names.join(' and ') + (names.length === 1 ? ' has' : ' have');
    if (w.kind !== 'leader') return `${list(w.names)} left`;
    const parts = [];
    if (w.arriveNames.length) parts.push(`${list(w.arriveNames)} arrived`);
    if (w.afterNames.length) parts.push(`${list(w.afterNames)} left`);
    return parts.join(' and ');
}

// The run's waiting moves (waitForLeavingMales, waitForNewLeaders) on the
// zoo as it is now: ready once every animal it waits for has left the
// habitat (`at`, else its destination) and every newcomer it waits for
// (arrive) is there; dropped when one of them is still there, or a newcomer
// is elsewhere, and no longer on the move (that move did not happen), or the
// waiting animal has gone or moved meanwhile.
// -> { ready: [wait], still: [wait], dropped: [{ wait, why }] }
export function waitsReady(model, waits) {
    const out = { ready: [], still: [], dropped: [] };
    for (const w of waits || []) {
        const a = model && model.animals.get(String(w.id));
        if (!a || a.alive === false) {
            out.dropped.push({ wait: w, why: 'it is no longer in the zoo' });
            continue;
        }
        if (a.moving || homeOf(a) !== w.from) {
            out.dropped.push({ wait: w, why: 'it was moved meanwhile' });
            continue;
        }
        const at = w.at || w.hab;
        let stayed = null, missing = null, onTheWay = false;
        for (const id of w.after || []) {
            const b = model.animals.get(String(id));
            // gone from the habitat: sold, carried off, or arrived elsewhere
            if (!b || b.alive === false || b.hab !== at) continue;
            if (b.moving) onTheWay = true;
            else stayed = b;
        }
        for (const id of w.arrive || []) {
            const b = model.animals.get(String(id));
            if (!b || b.alive === false) missing = missing || { name: 'a newcomer' };
            else if (b.moving) onTheWay = true;
            else if (b.hab !== at) missing = missing || b;
        }
        if (stayed) out.dropped.push({ wait: w, why: `${stayed.name} did not leave` });
        else if (missing) out.dropped.push({ wait: w, why: `${missing.name} did not arrive` });
        else if (onTheWay) out.still.push(w);
        else out.ready.push(w);
    }
    return out;
}

export function planAutoRun(input) {
    const prep = prepareAutoRun(input);
    if (!input.model || !input.species) return prep.out;
    const r = planProgramme(prep.model, input.species, input.info || {}, input.destinations || null, {
        assignments: input.assignments || null,
        options: programmeOptionsFor(prep.settings, input.ratio || 'auto', prep.pins, input.tune || null),
    });
    return finishAutoRun(input, prep, r);
}

// --------------------------------------------------------------- watching

// Per species: what a plan depends on, as one string. A ready plan is made
// again when this changes.
export function speciesFingerprints(model) {
    const out = new Map();
    if (!model) return out;
    const parts = new Map();
    for (const a of model.animals.values()) {
        if (!a.species || a.exhibit) continue;
        if (!parts.has(a.species)) parts.set(a.species, []);
        const f = a.fert ? a.fert.state : '';
        parts.get(a.species).push([a.guid || a.id, a.hab, a.lt, a.moving ? 1 : 0, a.juv ? 1 : 0, a.contra ? 1 : 0, a.infertile ? 1 : 0, a.preg ? 1 : 0, f, a.bond ? a.bond.mate : '', a.alive === false ? 0 : 1, a.alpha ? 1 : 0].join(':'));
    }
    for (const [sp, list] of parts) out.set(sp, list.sort().join('|'));
    return out;
}

// ------------------------------------------------------------------ texts

export function sexMark(a) {
    return a && a.sex === Sex.Male ? '♂' : a && a.sex === Sex.Female ? '♀' : '';
}

export function actionText(model, x, destinations) {
    const a = model && model.animals.get(String(x.id));
    if (!a) return String(x.id);
    return moveText(model, x, destinations);
}

// The park's calendar as one number: months since the start of year 0
// (Year*12 + Month-1 + the part of the month gone). gate: PZ2QoL_AutoGate's
// answer. null when the game gave no date.
export function calendarMonths(gate) {
    if (!gate || typeof gate.year !== 'number' || typeof gate.month !== 'number') return null;
    const p = typeof gate.monthProp === 'number' ? Math.max(0, Math.min(1, gate.monthProp)) : 0;
    return gate.year * 12 + (gate.month - 1) + p;
}

// "1 month", "1 season", "2 seasons", "1 year"
export function everyWords(months) {
    if (months === 12) return '1 year';
    if (months % 3 === 0) return months === 3 ? '1 season' : `${months / 3} seasons`;
    return months === 1 ? '1 month' : `${months} months`;
}

export function everyText(months) {
    return months === 12 ? 'every year' : months === 3 ? 'every season' : `every ${everyWords(months)}`;
}

// Game time left, in months: "in 2 months", "in half a month", "now".
export function dueText(months) {
    if (!(months > 0.02)) return 'now';
    if (months < 0.75) return 'in under a month';
    const m = Math.round(months * 2) / 2;
    return `in ${m === 1 ? '1 month' : `${m} months`}`;
}

// The same in real time at the speed the game runs now ("about 4 min"), or
// '' while it is paused or not measured yet. rate: months per real ms.
export function realTimeText(months, rate) {
    if (!(months > 0) || !(rate > 0)) return '';
    const s = months / rate / 1000;
    if (s < 60) return 'under a minute';
    const m = Math.round(s / 60);
    return m < 90 ? `about ${m} min` : `about ${Math.round(m / 60 * 10) / 10} h`;
}
