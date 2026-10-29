// node --test tests/kinauto_season.test.mjs
// Auto mode and a seasonal breeder (kinautocore.js seasonHold): a pack's
// breeding pair stays together through its breeding season and the month
// before it, and earlier in the year where its new leader would not be of
// age for the season; at most AUTO_LIMITS.packsPerRun packs change their
// breeding leaders in one run (stageRestructures). Simulation and reasons:
// docs/PLAN-best-breeder.md 6.1 b and e.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKinModel, Sex } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kincore.js';
import { TRADE } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinboardcore.js';
import { AUTO_LIMITS, breedingWindow, finishAutoRun, planAutoRun, prepareAutoRun } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinautocore.js';

const M = Sex.Male, F = Sex.Female;
const G = (a, b) => ({ F: a.repeat(6) + b.repeat(6), I: a.repeat(6) + b.repeat(6), S: 'AAAAAACCCCCC', L: 'AAAAAACCCCCC' });
const an = (id, sex, hab, over = {}) => Object.assign({
    id, key: 'animal_' + id, guid: 'g' + id, name: 'N' + id, species: 'Dog', sex, juv: false, contra: false, infertile: false,
    hab, loc: 'H' + hab, lt: hab ? 'habitat' : 'trade', par: [], mates: [], genes: G('C', 'D'), age: 5,
}, over);
const HABS = ['1', '2', '3', '4'];
const snap = animals => ({
    v: 1, seq: 1, scope: 'park', mode: 'offline', park: 'P',
    habitats: HABS.map(h => ({ id: h, name: 'Wild Dog 0' + h })), habs: HABS.map(h => ({ id: h, name: 'Wild Dog 0' + h, hid: 'h' + h })),
    animals, anc: {}, speciesFacts: { Dog: { maturity: 1.5, infertility: 10, life: 14 } }, tradeCentre: { id: '99', name: 'Trade Centre' },
});
const DEST = { bySpecies: { Dog: Object.fromEntries(HABS.map(h => [h, { ok: true }])) }, habitats: [], tradeCentre: { id: '99', name: 'Trade Centre' } };
const SUMMER = [false, true, false, false];
// a pack species (only the leader pair breeds), summer breeders unless said
const PACK = (seasons = SUMMER) => Object.assign({
    social: { min: 2, max: 20 }, mating: 'monogamy', fertilityAges: { maturity: 1.5, infertility: 10 }, interBirthYears: 1, leaderMale: true, leaderFemale: true,
    habitats: Object.fromEntries(HABS.map(h => [h, { available: { land: 4000 }, required: { land: 1000 }, adults: 2 }])),
}, seasons ? { breedingSeasons: seasons } : {});
// the park's calendar: year 48, the month of the year (0-based) and part of it
const at = monthOfYear => 48 * 12 + monthOfYear;
// one run with the programme's moves given (finishAutoRun's guards on them)
const runWith = (animals, moves, { months = null, info = PACK(), settings = { thin: false } } = {}) => {
    const model = buildKinModel(snap(animals));
    const input = { model, species: 'Dog', info, destinations: DEST, assignments: null, settings, view: {}, tradeFree: null, months };
    return finishAutoRun(input, prepareAutoRun(input), { moves });
};
// what the run moves, now or once its new leaders are there
const ids = r => r.moves.concat(r.waits || []).map(m => m.id).sort();

// pack 1 led by a bonded pair; a better female waits at the trade centre to
// replace its leader female, a young one (1.1) is a member; a female and a
// male on their own elsewhere (none of them the last breeder of its sex)
const PACK1 = () => [
    an('m1', M, '1', { alpha: true, bond: { mate: 'f1', ring: true } }), an('f1', F, '1', { alpha: true, bond: { mate: 'm1', ring: true } }),
    an('y1', F, '1', { age: 1.1, infertile: true }), an('s', F, '', { genes: G('E', 'F') }), an('o', F, '3'), an('p', M, '4'),
];
const REPLACE = [{ id: 'f1', to: TRADE, reason: 'it led its pack: a better pair leads now' }, { id: 's', to: '1', reason: 'to lead a pack' }];

test('the breeding season on the calendar: when it starts and ends, and when nothing is known', () => {
    // winter, 0.6 months in (the 20:14 save): summer starts in 5.4 months, ends in 8.4
    const w = breedingWindow({ breedingSeasons: SUMMER }, at(9.6));
    assert.deepEqual([w.inSeason, +w.startsIn.toFixed(6), +w.endsIn.toFixed(6), +(w.until - at(9.6)).toFixed(6)], [false, 5.4, 8.4, 8.4]);
    const s = breedingWindow({ breedingSeasons: SUMMER }, at(4));
    assert.deepEqual([s.inSeason, s.startsIn, s.endsIn], [true, 0, 2]);
    assert.equal(breedingWindow({ breedingSeasons: SUMMER }, at(2.5)).startsIn, 0.5);
    // two seasons in a row (golden lion tamarin: autumn and winter), across the year's end
    const t = breedingWindow({ breedingSeasons: [false, false, true, true] }, at(10));
    assert.deepEqual([t.inSeason, t.endsIn], [true, 2]);
    const t2 = breedingWindow({ breedingSeasons: [false, false, true, true] }, at(1));
    assert.deepEqual([t2.inSeason, t2.startsIn, t2.endsIn], [false, 5, 11]);
    const wrap = breedingWindow({ breedingSeasons: [true, false, false, true] }, at(9.5));
    assert.deepEqual([wrap.inSeason, wrap.endsIn], [true, 5.5]);
    // breeds all year, never, no data, an odd shape, no calendar: nothing to keep to
    for (const seasons of [[true, true, true, true], [false, false, false, false], undefined, [1, 0, 0, 0], [true, false]]) {
        assert.equal(breedingWindow({ breedingSeasons: seasons }, at(4)), null, JSON.stringify(seasons));
    }
    assert.equal(breedingWindow({ breedingSeasons: SUMMER }, null), null);
    assert.equal(AUTO_LIMITS.seasonLeadMonths, 1);
});

test('in the breeding season a breeding pair is not broken up: its leader stays, the newcomer still comes', () => {
    const r = runWith(PACK1(), REPLACE, { months: at(4) });
    assert.deepEqual(ids(r), ['s'], JSON.stringify(r.moves));
    assert.match(r.held.find(h => h.id === 'f1').why, /breeding season is on/);
    assert.ok(r.notes.some(t => t === 'The breeding season is on: Wild Dog 01 keeps its breeding pair until it is over.'), JSON.stringify(r.notes));
    assert.equal(r.seasonUntil, at(6));
    assert.ok(r.notes.every(t => t.length <= 160));
    // the month before it too (keepers take their time, a new leader days)
    const soon = runWith(PACK1(), REPLACE, { months: at(2.5) });
    assert.deepEqual(ids(soon), ['s']);
    assert.ok(soon.notes.some(t => /^The breeding season starts within a month: Wild Dog 01 keeps its breeding pair until it is over\.$/.test(t)), JSON.stringify(soon.notes));
    // once the season has passed it goes
    assert.deepEqual(ids(runWith(PACK1(), REPLACE, { months: at(6.2) })), ['f1', 's']);
});

test('in the season: her young on the way, the pair may change; a pair that does not breed may too', () => {
    // pregnant: the season's litter is made (and she stays put herself)
    const preg = PACK1().map(a => (a.id === 'f1' ? Object.assign(a, { preg: true }) : a));
    const r = runWith(preg, [{ id: 'm1', to: TRADE, reason: 'a better pair leads now' }], { months: at(4.5) });
    assert.deepEqual(ids(r), ['m1'], JSON.stringify(r.held));
    // too old to breed (10), mourning, or bonded elsewhere: nothing to keep
    for (const over of [{ age: 10.2 }, { bond: { mate: 'm1', mourn: 2 } }, { bond: { mate: 'zz' } }]) {
        const animals = PACK1().map(a => (a.id === 'f1' ? Object.assign(a, over) : a));
        assert.deepEqual(ids(runWith(animals, REPLACE, { months: at(4) })), ['f1', 's'], JSON.stringify(over));
    }
    // her young of last summer (0.7): the wait between litters (a year from
    // the birth, the species' interBirthYears) outlasts this season, so the
    // pair does not breed; at 0.9 it is over before the season ends (2 months
    // left) and the pair stays; with the wait unknown, the young don't count
    const pup = age => PACK1().concat([an('pup', F, '1', { juv: true, age, par: ['gm1', 'gf1'] })]);
    assert.deepEqual(ids(runWith(pup(0.7), REPLACE, { months: at(4) })), ['f1', 's'], 'young of 0.7');
    assert.deepEqual(ids(runWith(pup(0.9), REPLACE, { months: at(4) })), ['s'], 'young of 0.9');
    const unknown = Object.assign(PACK(), { interBirthYears: undefined });
    assert.deepEqual(ids(runWith(pup(0.7), REPLACE, { months: at(4), info: unknown })), ['s'], 'no wait known');
    // a longer wait (a lion's 2.7 years): young of 1.5 still hold her back
    const lion = Object.assign(PACK(), { interBirthYears: 2.7 });
    assert.deepEqual(ids(runWith(pup(1.5), REPLACE, { months: at(4), info: lion })), ['f1', 's'], 'a long wait');
});

test('before the season: a pair stays where its new leader would not be of age for it, else it changes', () => {
    // f1 leaves and nobody comes: y1 (1.1) would lead, 1.3 when summer starts
    const alone = [{ id: 'f1', to: TRADE, reason: 'it led its pack: a better pair leads now' }];
    const spring = runWith(PACK1(), alone, { months: at(0.5) });
    assert.deepEqual(ids(spring), []);
    assert.match(spring.held[0].why, /its new leaders could not breed in it/);
    assert.ok(spring.notes.some(t => t === 'Wild Dog 01 keeps its breeding pair until the breeding season is over: Ny1 would not be of age for it.'), JSON.stringify(spring.notes));
    // in winter she is of age (1.55) by the time summer starts
    assert.deepEqual(ids(runWith(PACK1(), alone, { months: at(9.6) })), ['f1']);
    // one too young for next summer holds the pair from the autumn on too
    const younger = PACK1().map(a => (a.id === 'y1' ? Object.assign(a, { age: 0.6 }) : a));
    assert.deepEqual(ids(runWith(younger, alone, { months: at(7) })), []);
    // a female of age replacing her: the pair changes (the staying male's
    // mourning is the same whenever it comes)
    assert.deepEqual(ids(runWith(PACK1(), REPLACE, { months: at(0.5) })), ['f1', 's']);
    // both leaders leaving with nobody of age to follow: they stay too
    const both = [{ id: 'f1', to: '2', reason: 'to lead a pack' }, { id: 'm1', to: '2', reason: 'to lead a pack' }];
    const r = runWith(PACK1().concat([an('k', M, '1', { age: 1.0, infertile: true })]), both, { months: at(0.5) });
    assert.deepEqual(ids(r), [], JSON.stringify(r.moves));
});

test('a pack left without a breeding pair holds the leaders it would lose, in turn', () => {
    // pack 1's pair is to lead pack 2, pack 2's pair to go: with pack 1 kept
    // for the season (only young of 1.1 left there), pack 2 would be empty too
    const animals = PACK1().concat([an('m2', M, '2', { alpha: true }), an('f2', F, '2', { alpha: true })]);
    const moves = [{ id: 'm1', to: '2', reason: 'to lead a pack' }, { id: 'f1', to: '2', reason: 'to lead a pack' },
        { id: 'm2', to: TRADE, reason: 'a better pair leads now' }, { id: 'f2', to: TRADE, reason: 'a better pair leads now' }];
    const r = runWith(animals, moves, { months: at(1) });
    assert.deepEqual(ids(r), [], JSON.stringify(r.moves));
    assert.equal(r.held.length, 4);
    assert.ok(r.notes.some(t => /^Wild Dog 01 and Wild Dog 02 keep their breeding pairs until the breeding season is over/.test(t)), JSON.stringify(r.notes));
    // in winter too (the season starts in 5 months); a pack left with nobody
    // to lead is not held right after the season, so it never waits a year
    assert.deepEqual(ids(runWith(animals, moves, { months: at(10) })), []);
    assert.deepEqual(ids(runWith(animals, moves, { months: at(6.5) })), ['f1', 'f2', 'm1', 'm2']);
    // a run once a year has no run to wait for
    assert.equal(ids(runWith(animals, moves, { months: at(1), settings: { thin: false, every: 12 } })).length, 4);
});

test('species without season data, all-year breeders, no calendar, no leader rule: as before', () => {
    for (const opts of [{ info: PACK(null), months: at(4) }, { info: PACK([true, true, true, true]), months: at(4) }, { months: null }]) {
        const r = runWith(PACK1(), REPLACE, opts);
        assert.deepEqual(ids(r), ['f1', 's'], JSON.stringify(opts));
        assert.ok(!r.notes.some(t => /breeding season/.test(t)) && r.seasonUntil === undefined);
    }
    const free = Object.assign(PACK(), { leaderMale: false, leaderFemale: false });
    assert.deepEqual(ids(runWith(PACK1(), REPLACE, { info: free, months: at(4) })), ['f1', 's']);
});

test('harems (only the leader male mates): the male stays through the season, the females move as planned', () => {
    const HAREM = Object.assign(PACK(), { mating: 'polygyny', leaderFemale: false, sexMax: { male: 1, female: 6 } });
    const animals = [an('h', M, '1', { alpha: true }), an('w1', F, '1'), an('w2', F, '1'), an('n', M, '', { genes: G('E', 'F') })];
    const moves = [{ id: 'h', to: TRADE, reason: 'a better male' }, { id: 'n', to: '1', reason: 'into a breeding group' }, { id: 'w2', to: '2', reason: 'breeding programme' }];
    const r = runWith(animals, moves, { info: HAREM, months: at(4) });
    // the new male would be a second one there: the game's most per sex holds him too
    assert.deepEqual(ids(r), ['w2'], JSON.stringify(r));
    assert.match(r.held.find(h => h.id === 'h').why, /breeding season is on/);
    assert.ok(r.held.some(h => h.id === 'n' && / than the game allows /.test(h.why)), JSON.stringify(r.held));
    // in autumn the male goes, the new one after him
    const later = runWith(animals, moves, { info: HAREM, months: at(7) });
    assert.deepEqual(ids(later), ['h', 'n', 'w2']);
});

test('a leader that is held does not wait for its new leader either', () => {
    // the planner's own plan: a strong female from the trade centre leads
    // pack 1 and the old leader female leaves once she has arrived
    const animals = [an('m1', M, '1', { alpha: true, genes: G('A', 'B') }), an('f1', F, '1', { alpha: true, genes: G('A', 'B') }),
        an('k', F, '1', { age: 3.5, genes: G('A', 'B') }), an('s', F, '', { genes: G('E', 'F') })];
    const model = buildKinModel(snap(animals));
    const base = { model, species: 'Dog', info: PACK(), destinations: DEST, assignments: null, settings: { thin: false }, view: {}, tradeFree: null };
    const off = planAutoRun(Object.assign({}, base, { months: at(7) }));
    assert.ok(off.moves.some(m => m.id === 's' && m.to === '1') && off.waits.some(w => w.id === 'f1' && w.kind === 'leader'), JSON.stringify([off.moves, off.waits]));
    const on = planAutoRun(Object.assign({}, base, { months: at(4) }));
    assert.ok(!on.moves.some(m => m.id === 'f1') && !on.waits.some(w => w.id === 'f1'), JSON.stringify([on.moves, on.waits]));
    assert.ok(on.held.some(h => h.id === 'f1' && /breeding season/.test(h.why)));
});

// --------------------------------------------------------------- staging

// four packs, each led by a breeding pair; better females wait at the trade
// centre for three of them: s1 makes the best young, s3 the least good
const FOUR = () => [
    ...['1', '2', '3', '4'].flatMap(h => [an('m' + h, M, h, { alpha: true }), an('f' + h, F, h, { alpha: true })]),
    an('s1', F, '', { genes: G('E', 'F') }), an('s2', F, '', { genes: G('E', 'D') }),
    an('s3', F, '', { genes: { F: 'EEEEEEDDDDDD', I: 'CCCCCCDDDDDD', S: 'AAAAAACCCCCC', L: 'AAAAAACCCCCC' } }),
];
const SWAPS = ['1', '2', '3'].flatMap(h => [{ id: 'f' + h, to: TRADE, reason: 'a better pair leads now' }, { id: 's' + h, to: h, reason: 'to lead a pack' }]);

test('at most two packs change their breeding leaders in one run, the best gains first; the rest wait', () => {
    assert.equal(AUTO_LIMITS.packsPerRun, 2);
    // an all-year breeder: staging alone
    const r = runWith(FOUR(), SWAPS, { info: PACK(null) });
    assert.deepEqual(ids(r), ['f1', 'f2', 's1', 's2', 's3'], JSON.stringify(r.moves));
    assert.match(r.held.find(h => h.id === 'f3').why, /at most 2 groups/);
    assert.ok(r.notes.some(t => t === 'At most 2 breeding groups change leaders in one run: Wild Dog 03 keeps its leaders until the next run.'), JSON.stringify(r.notes));
    // two changes: both go
    assert.deepEqual(ids(runWith(FOUR(), SWAPS.slice(0, 4), { info: PACK(null) })), ['f1', 'f2', 's1', 's2']);
    // a pack whose leaders don't breed (too old) is no restructure to count
    const old = FOUR().map(a => (a.id === 'f3' ? Object.assign(a, { age: 10.5 }) : a));
    assert.deepEqual(ids(runWith(old, SWAPS, { info: PACK(null) })), ['f1', 'f2', 'f3', 's1', 's2', 's3']);
});

test('staging: a change spanning packs goes whole, and the first change always goes', () => {
    // the males move round: every pack's pair changes, as one change
    const round = [{ id: 'm1', to: '2', reason: 'to lead a pack' }, { id: 'm2', to: '3', reason: 'to lead a pack' }, { id: 'm3', to: '1', reason: 'to lead a pack' }];
    const r = runWith(FOUR(), round, { info: PACK(null) });
    assert.deepEqual(ids(r), ['m1', 'm2', 'm3'], JSON.stringify(r));
    // with a two-pack change beside it that gains more, the round waits
    const both = round.concat([{ id: 'm4', to: TRADE, reason: 'a better pair leads now' }, { id: 's1', to: '4', reason: 'to lead a pack' }]);
    const animals = FOUR().concat([an('n4', M, '', { genes: G('A', 'B') })]);
    const r2 = runWith(animals, both.concat([{ id: 'n4', to: '4', reason: 'to lead a pack' }, { id: 'f4', to: TRADE, reason: 'a better pair leads now' }]), { info: PACK(null) });
    assert.ok(['m4', 'f4', 'n4', 's1'].every(id => ids(r2).includes(id)), JSON.stringify(r2));
    assert.ok(['m1', 'm2', 'm3'].every(id => r2.held.some(h => h.id === id)), JSON.stringify(r2.held));
});
