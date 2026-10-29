// node --test tests/kinauto_combined.test.mjs
// Auto mode's guards on one run together (kinautocore.js finishAutoRun):
// Thin out's herd cull, the breeding season's hold, the staging of
// restructures (at most AUTO_LIMITS.packsPerRun packs a run), the pack waits
// (new leaders first, the mate that leads first) and the notes. Each was
// built on its own (2026-10-28); these are the cases where they meet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKinModel, Sex } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kincore.js';
import { TRADE } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinboardcore.js';
import { packLeaderOf, planProgramme } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinprogramme.js';
import { AUTO_LIMITS, finishAutoRun, prepareAutoRun, programmeOptionsFor, waitsReady } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinautocore.js';
import { founderGenes, rng } from './helpers/zoogen.mjs';

const M = Sex.Male, F = Sex.Female;
const G = (a, b) => ({ F: a.repeat(6) + b.repeat(6), I: a.repeat(6) + b.repeat(6), S: 'AAAAAACCCCCC', L: 'AAAAAACCCCCC' });
const an = (id, sex, hab, over = {}) => Object.assign({
    id, key: 'animal_' + id, guid: 'g' + id, name: 'N' + id, species: 'Dog', sex, juv: false, contra: false, infertile: false,
    hab, loc: 'H' + hab, lt: hab ? 'habitat' : 'trade', par: [], mates: [], genes: G('C', 'D'), age: 5,
}, over);
const HABS = ['1', '2', '3', '4', '5', '6'];
const snap = animals => ({
    v: 1, seq: 1, scope: 'park', mode: 'offline', park: 'P',
    habitats: HABS.map(h => ({ id: h, name: 'Wild Dog 0' + h })), habs: HABS.map(h => ({ id: h, name: 'Wild Dog 0' + h, hid: 'h' + h })),
    animals, anc: {}, speciesFacts: { Dog: { maturity: 1.5, infertility: 10, life: 14 } }, tradeCentre: { id: '99', name: 'Trade Centre' },
});
const DEST = { bySpecies: { Dog: Object.fromEntries(HABS.map(h => [h, { ok: true }])) }, habitats: [], tradeCentre: { id: '99', name: 'Trade Centre' } };
const SUMMER = [false, true, false, false];
const PACK = (seasons = SUMMER) => Object.assign({
    social: { min: 2, max: 20 }, mating: 'monogamy', fertilityAges: { maturity: 1.5, infertility: 10 }, interBirthYears: 1, leaderMale: true, leaderFemale: true,
    habitats: Object.fromEntries(HABS.map(h => [h, { available: { land: 4000 }, required: { land: 1000 }, adults: 2 }])),
}, seasons ? { breedingSeasons: seasons } : {});
const at = monthOfYear => 48 * 12 + monthOfYear;
const inputOf = (animals, { months = null, info = PACK(), settings = { thin: false }, tradeFree = null } = {}) => ({
    model: buildKinModel(snap(animals)), species: 'Dog', info, destinations: DEST, assignments: null, settings, view: {}, tradeFree, months,
});
const runWith = (animals, moves, opts = {}) => {
    const input = inputOf(animals, opts);
    return finishAutoRun(input, prepareAutoRun(input), { moves, groups: opts.groups });
};
const ids = r => r.moves.concat(r.waits || []).map(m => m.id).sort();
const heldIds = r => r.held.map(h => h.id).sort();

// packs 1-4 breed (bonded leader pairs); pack 5's leader female had young
// this summer (0.3): her wait between litters, so pack 5 does not breed now
// or in the coming season. Two better females and two males at the trade centre.
const pair = h => [an('m' + h, M, h, { alpha: true, mates: ['f' + h], bond: { mate: 'f' + h } }), an('f' + h, F, h, { alpha: true, mates: ['m' + h], bond: { mate: 'm' + h } })];
const ZOO = () => [...['1', '2', '3', '4', '5'].flatMap(pair), an('pup5', F, '5', { juv: true, age: 0.3, par: ['gm5', 'gf5'] }),
    an('s2', F, '', { genes: G('E', 'D') }), an('s3', F, '', { genes: G('E', 'F') }), an('n1', M, ''), an('n5', M, '')];
// packs 2 and 3 get better leader females: the two changes that gain most
const SWAPS = ['2', '3'].flatMap(h => [{ id: 'f' + h, to: TRADE, reason: 'a better pair leads now' }, { id: 's' + h, to: h, reason: 'to lead a pack' }]);

test('staging: a pack pair split by the run waits whole (no mate goes alone); a pack that does not breed changes now', () => {
    // pack 1's pair splits (she leads a new pack 6 with n1, he goes; waitForMates: she first),
    // the least gain of three changes: staged out, both stay, and no wait is left for him
    const split = [{ id: 'f1', to: '6', reason: 'to lead a pack' }, { id: 'm1', to: TRADE, reason: 'a better pair leads now' }, { id: 'n1', to: '6', reason: 'to lead a pack' }];
    const groups = [{ hab: '6', leaders: ['n1', 'f1'] }];
    const out = runWith(ZOO(), SWAPS.concat(split), { info: PACK(null), groups });
    assert.deepEqual(heldIds(out), ['f1', 'm1'], JSON.stringify(out.held));
    assert.ok(!out.waits.some(w => w.id === 'm1' || w.id === 'f1'), JSON.stringify(out.waits));
    // when it fits the run, he waits for her
    const fits = runWith(ZOO(), SWAPS.slice(0, 2).concat(split), { info: PACK(null), groups });
    assert.ok(fits.waits.some(w => w.id === 'm1' && w.after.includes('f1')), JSON.stringify(fits.waits));
    // pack 5 (her wait: it does not breed now) gives its male to lead pack 1,
    // whose change waits: he goes anyway and joins pack 1 under its leader, to
    // be promoted when it leaves; pack 5's mourning costs no litter now, later
    // it would (the simulator, 2026-10-29: holding such changes whole, -0.5 at year 15)
    const back = runWith(ZOO(), SWAPS.concat([{ id: 'm5', to: '1', reason: 'to lead a pack' }, { id: 'm1', to: TRADE, reason: 'a better pair leads now' },
        { id: 'n5', to: '5', reason: 'to lead a pack' }]), { info: PACK(null) });
    assert.deepEqual(heldIds(back), ['m1'], JSON.stringify(back.held));
    assert.ok(ids(back).includes('m5'));
    assert.ok(back.notes.includes('At most 2 breeding groups change leaders in one run: Wild Dog 01 keeps its leaders until the next run.'), JSON.stringify(back.notes));
});

test('the breeding season: a pack that does not breed in it changes; a breeding pair linked to a held change stays', () => {
    const moves = [{ id: 'm5', to: '1', reason: 'to lead a pack' }, { id: 'm1', to: TRADE, reason: 'a better pair leads now' }, { id: 'n5', to: '5', reason: 'to lead a pack' }];
    // in the season pack 1 keeps its pair; pack 5 (her wait) still gives its male
    const on = runWith(ZOO(), moves, { months: at(4) });
    assert.deepEqual(heldIds(on), ['m1'], JSON.stringify(on.held));
    assert.deepEqual(ids(on), ['m5', 'n5']);
    assert.ok(on.notes.includes('The breeding season is on: Wild Dog 01 keeps its breeding pair until it is over.'), JSON.stringify(on.notes));
    // in spring, pack 1's new male would be of age: the change goes
    assert.deepEqual(ids(runWith(ZOO(), moves, { months: at(0.5) })), ['m1', 'm5', 'n5']);
    // before the season, pack 1 held (only a young female would lead it):
    // pack 2's male, to lead pack 1 with her, stays with his own breeding
    // mate (before: he left her mourning, and neither pack bred)
    const young = ZOO().concat([an('y1', F, '1', { age: 1.1, infertile: true })]);
    const far = [{ id: 'f1', to: TRADE, reason: 'a better pair leads now' }, { id: 'm1', to: TRADE, reason: 'a better pair leads now' },
        { id: 'm2', to: '1', reason: 'to lead a pack' }, { id: 'n1', to: '2', reason: 'to lead a pack' }];
    const r = runWith(young, far, { months: at(0.5) });
    assert.deepEqual(heldIds(r), ['f1', 'm1', 'm2'], JSON.stringify(r.held));
    assert.match(r.held.find(h => h.id === 'm2').why, /its change goes with Wild Dog 01's/);
    assert.ok(r.notes.includes('Wild Dog 01 and Wild Dog 02 keep their breeding pairs until the breeding season is over: Ny1 would not be of age for it.'), JSON.stringify(r.notes));
});

test('a leader that waits for its new leader does not leave just before the breeding season', () => {
    // in spring (summer starts in 1.5 months) pack 1's male goes once n1 has
    // come: if n1 is slow, that would be within the month before the season
    const animals = ZOO();
    const r = runWith(animals, [{ id: 'm1', to: TRADE, reason: 'a better pair leads now' }, { id: 'n1', to: '1', reason: 'to lead a pack' }], { months: at(1.5) });
    const w = r.waits.find(x => x.id === 'm1');
    assert.ok(w && w.kind === 'leader' && w.by === at(3) - AUTO_LIMITS.seasonLeadMonths && w.pair.join() === 'f1', JSON.stringify(r.waits));
    const arrived = buildKinModel(snap(animals.map(a => (a.id === 'n1' ? Object.assign({}, a, { hab: '1', loc: 'H1', lt: 'habitat' }) : a))));
    assert.deepEqual(waitsReady(arrived, r.waits, at(1.8)).ready.map(x => x.id), ['m1'], 'in time: he goes');
    const late = waitsReady(arrived, r.waits, at(2.1));
    assert.deepEqual(late.ready, []);
    assert.match(late.dropped[0].why, /breeding season is close/);
    assert.deepEqual(waitsReady(arrived, r.waits).ready.map(x => x.id), ['m1'], 'no calendar: as before');
    // his mate has gone meanwhile: the pair is broken anyway, he goes
    const alone = buildKinModel(snap(animals.map(a => (a.id === 'n1' ? Object.assign({}, a, { hab: '1', loc: 'H1', lt: 'habitat' }) : a)).filter(a => a.id !== 'f1')));
    assert.deepEqual(waitsReady(alone, r.waits, at(2.1)).ready.map(x => x.id), ['m1']);
    // both leaders leaving (a pair of age stays to lead), the one that leads
    // first (waitForMates): her leaving breaks the pair, his wait has no date
    const stay = ZOO().concat([an('k1', M, '1', { age: 4 }), an('k2', F, '1', { age: 4 })]);
    const both = runWith(stay, [{ id: 'f1', to: '6', reason: 'to lead a pack' }, { id: 'm1', to: TRADE, reason: 'a better pair leads now' }],
        { months: at(1.5), groups: [{ hab: '6', leaders: ['f1'] }] });
    assert.ok(both.waits.some(x => x.id === 'm1') && both.waits.every(x => x.by === undefined), JSON.stringify(both));
    // planned in autumn: the month before next summer; an all-year breeder's or with no calendar: no date
    const autumn = runWith(ZOO(), [{ id: 'm1', to: TRADE, reason: 'a better pair leads now' }, { id: 'n1', to: '1', reason: 'to lead a pack' }], { months: at(7) });
    assert.equal(autumn.waits[0].by, at(14));
    for (const opts of [{ months: at(1.5), info: PACK(null) }, { months: null }]) {
        const x = runWith(ZOO(), [{ id: 'm1', to: TRADE, reason: 'a better pair leads now' }, { id: 'n1', to: '1', reason: 'to lead a pack' }], opts);
        assert.ok(x.waits.length && x.waits.every(y => y.by === undefined), JSON.stringify(opts));
    }
});

test('notes: what the player can act on comes before what waits for the season or the next run', () => {
    // in the season, with the trade centre full: the run keeps 3 notes
    const moves = [{ id: 'm1', to: '6', reason: 'to lead a pack' }, { id: 'f1', to: '6', reason: 'to lead a pack' }, { id: 'x', to: TRADE, reason: 'breeding programme' }];
    const r = runWith(ZOO().concat([an('x', F, '1', { age: 3 })]), moves, { months: at(4), tradeFree: 0 });
    assert.deepEqual(r.notes, ['The trade centre is full: some animals stay until there is room (sell or release the ones waiting there).',
        'The breeding season is on: Wild Dog 01 keeps its breeding pair until it is over.'], JSON.stringify(r));
});

test('a pen the player stocked (a place of the species): its pair is held with the change it is part of', () => {
    // packs 1-4 assigned, pen 5 not (the owner's Wild Dog 05+: Jabarl and Mapalo). The plan
    // (the owner's 20:14 save, Matla moved to a pen of his own): pack 3's male leads the pen,
    // the pen's male leads pack 2 with pack 3's female, and a male of pack 3 joins the pen
    // (Amare). Before the summer pack 3 keeps its pair (only a young one would lead it), so the
    // pen keeps its own: before, its male went to an empty pack 2 (the pen would still have a
    // pair, the newcomer and its mourning female) and neither bred that summer
    const animals = [...pair('3'), an('a3', M, '3', { age: 4 }), an('y3', F, '3', { age: 1.1, infertile: true }), ...pair('5'), an('k', M, '1', { age: 3 }), an('q', F, '1', { age: 3 })];
    const moves = [{ id: 'm3', to: '5', reason: 'to lead a pack' }, { id: 'f3', to: '2', reason: 'to lead a pack' }, { id: 'm5', to: '2', reason: 'to lead a pack' },
        { id: 'a3', to: '5', reason: 'joins another' }];
    const input = Object.assign(inputOf(animals, { months: at(1) }), { assignments: { 1: ['Dog'], 2: ['Dog'], 3: ['Dog'], 4: ['Dog'] } });
    const prep = prepareAutoRun(input);
    assert.deepEqual(prep.places, ['5']);
    const r = finishAutoRun(input, prep, { moves, groups: [{ hab: '5', leaders: ['m3', 'f5'] }, { hab: '2', leaders: ['m5', 'f3'] }] });
    assert.deepEqual(ids(r), ['a3'], JSON.stringify(r));
    assert.deepEqual(heldIds(r), ['f3', 'm3', 'm5']);
    assert.deepEqual(r.notes, ['Wild Dog 03 and Wild Dog 05 keep their breeding pairs until the breeding season is over: Ny3 would not be of age for it.',
        "Wild Dog 05 counts as one of this species' habitats: no other species lives there."]);
    // after the summer all of it goes, the pen's male once pack 3's has come
    const later = finishAutoRun(Object.assign({}, input, { months: at(6.5) }), prepareAutoRun(Object.assign({}, input, { months: at(6.5) })), { moves, groups: [{ hab: '5', leaders: ['m3', 'f5'] }, { hab: '2', leaders: ['m5', 'f3'] }] });
    assert.deepEqual(ids(later), ['a3', 'f3', 'm3', 'm5'], JSON.stringify(later));
    assert.ok(later.waits.some(w => w.id === 'm5' && w.arrive.includes('m3')), JSON.stringify(later.waits));
});

// ------------------------------------------------- the real planner, many zoos

// Random pack zoos: 5 packs with their leaders (the eldest of each sex,
// bonded), grown young and pups, newcomers at the trade centre.
function packZoo(seed) {
    const r = rng(seed);
    const animals = [];
    let n = 0;
    const add = (sex, hab, over) => {
        const a = an('d' + (++n), sex, hab, Object.assign({ genes: founderGenes(r, r.int(4, 9)) }, over));
        animals.push(a);
        return a;
    };
    for (const h of ['1', '2', '3', '4', '5']) {
        const here = [];
        for (let i = r.int(2, 6); i > 0; i--) here.push(add(r.chance(0.5) ? M : F, h, { age: 1 + r.next() * 9 }));
        for (const sex of [M, F]) {
            const l = packLeaderOf(here, sex);
            if (l) l.alpha = true;
        }
        const m = here.find(a => a.alpha && a.sex === M), f = here.find(a => a.alpha && a.sex === F);
        if (m && f) {
            Object.assign(m, { mates: [f.id], bond: { mate: f.id } });
            Object.assign(f, { mates: [m.id], bond: { mate: m.id } });
            for (let i = r.int(0, 3); i > 0; i--) add(r.chance(0.5) ? M : F, h, { juv: true, age: r.next() * 0.9, par: [m.guid, f.guid] });
            if (r.chance(0.15)) f.preg = true;
        }
        for (const a of here) if (a.age < 1.5) a.infertile = true;
    }
    for (let i = r.int(0, 3); i > 0; i--) add(r.chance(0.5) ? M : F, '', { age: 2 + r.next() * 3, genes: founderGenes(r, 10) });
    return animals;
}

test('the real planner on random pack zoos: a pack pair is held together, no wait waits on a held move, Thin out sends no leader', () => {
    let holds = 0, runs = 0, thin = 0;
    for (let seed = 1; seed <= 12; seed++) {
        const animals = packZoo(seed);
        for (const [months, info] of [[at(4), PACK()], [at(1), PACK()], [at(1.5), PACK()], [null, PACK(null)]]) {
            const input = inputOf(animals, { months, info, settings: { thin: seed % 2 === 0, step: 4 } });
            const prep = prepareAutoRun(input);
            const prog = planProgramme(prep.model, 'Dog', info, DEST, { options: Object.assign(programmeOptionsFor(prep.settings, 'auto', prep.pins), { maxEvaluations: 40000, timeBudgetMs: 400 }) });
            const out = finishAutoRun(input, prep, prog);
            runs++;
            const where = `seed ${seed} months ${months}`;
            const model = input.model;
            const going = new Set(out.moves.concat(out.waits).map(m => String(m.id)));
            const whyOf = new Map(out.held.map(h => [String(h.id), h.why]));
            const staged = id => /breeding season|breeds this season|at most \d+ groups/.test(whyOf.get(String(id)) || '');
            // a pack's leaders the programme moves out: held together or not at all
            for (const h of ['1', '2', '3', '4', '5', '6']) {
                const group = Array.from(model.animals.values()).filter(a => a.hab === h && !a.juv);
                const lm = [M, F].map(sex => packLeaderOf(group, sex)).filter(l => l && prog.moves.some(m => String(m.id) === String(l.id) && String(m.to) !== h));
                const held = lm.filter(l => staged(l.id));
                if (held.length) holds++;
                assert.ok(!held.length || !lm.some(l => going.has(String(l.id))), `${where}: in ${h} ${held.map(l => l.id)} held, the other goes`);
            }
            // a wait with a date: its pair stays
            for (const w of out.waits.filter(x => x.by != null)) assert.ok(w.pair.every(id => !going.has(id)), `${where}: ${w.id}'s pair moves`);
            for (const w of out.waits) {
                for (const id of (w.after || []).concat(w.arrive || [])) assert.ok(going.has(String(id)), `${where}: ${w.id} waits for ${id}, which does not move`);
            }
            // Thin out (the herd cull, first) sends no planned leader, and its sends go at once
            const leaders = new Set(((prog && prog.groups) || []).flatMap(g => g.leaders || []).map(String));
            for (const m of out.moves.concat(out.waits).filter(x => x.stage === 'thin')) {
                assert.ok(!leaders.has(String(m.id)) && !out.waits.includes(m), `${where}: Thin out's ${m.id}`);
                thin++;
            }
            assert.ok(out.notes.every(t => t.length <= 160) && new Set(out.notes).size === out.notes.length, `${where}: ${JSON.stringify(out.notes)}`);
        }
    }
    assert.ok(holds >= 4 && thin >= 5, `only ${holds} held packs and ${thin} Thin out sends in ${runs} runs`);
});
