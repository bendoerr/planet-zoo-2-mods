// node --test tests/kinstrands.test.mjs
// Best strands and the Breeding goal "Push the ceiling" (kinstrands.js):
// the young's outcome distribution, copies, carriers and the ceiling; the
// default goal plans and culls exactly as before; the ceiling goal pairs
// carriers and Thin out (by hand and in Auto mode) keeps them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKinModel, predictOffspring, Sex } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kincore.js';
import { TRADE } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinboardcore.js';
import { planProgramme, relatedBy, youngQuality } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinprogramme.js';
import { cullPlan, keepValue } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kincull.js';
import { planAutoRun, programmeOptionsFor } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinautocore.js';
import {
    breedingValue, carrierKeepers, ceilingText, ceilingWaiting, copiesText, lastCarrier, outclasses, speciesStrands, usefulCopies, youngDistribution, youngImmunity, youngUpside,
    decodeHerdBest, encodeHerdBest, herdBest, strandEdge, strandEdgeText, strandEdgeWords, strandsFromLoci,
} from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinstrands.js';
import { SEEDS } from './helpers/enginedigest.mjs';
import { makeZoo } from './helpers/zoogen.mjs';

const M = Sex.Male, F = Sex.Female;
// a strand with v good letters (A) out of 6
const str = v => 'A'.repeat(v) + 'Z'.repeat(6 - v);
// a hetero gene (fertility, immunity) whose two strands differ at k loci
const het = k => 'AAAAAA' + 'B'.repeat(k) + 'A'.repeat(6 - k);
// genes: Size and Longevity strands, fertility and immunity grades (k of 6)
const G = (s1, s2, l1, l2, f = 6, i = 6) => ({ F: het(f), I: het(i), S: str(s1) + str(s2), L: str(l1) + str(l2) });
const FACTS = { Lion: { maturity: 3, infertility: 15, life: 20 } };
const an = (id, sex, hab, genes, over = {}) => Object.assign({
    id, key: 'animal_' + id, guid: 'g' + id, name: id.toUpperCase(), species: 'Lion', sex, juv: false, contra: false, infertile: false,
    hab, loc: 'H' + hab, lt: hab ? 'habitat' : 'trade', par: [], mates: [], genes, age: 6,
}, over);
const snap = (animals, habs = ['1', '2']) => ({
    v: 1, seq: 1, scope: 'park', mode: 'offline', park: 'P',
    habitats: habs.map(h => ({ id: h, name: 'H' + h })), habs: habs.map(h => ({ id: h, name: 'H' + h, hid: 'h' + h })),
    animals, anc: {}, speciesFacts: FACTS, tradeCentre: { id: '99', name: 'Trade Centre' },
});
const DEST = ids => ({ bySpecies: { Lion: Object.fromEntries(ids.map(i => [i, { ok: true }])) }, habitats: [], tradeCentre: { id: '99', name: 'Trade Centre' } });
const near = (a, b) => Math.abs(a - b) < 1e-9;

// ------------------------------------------------------------ the young

test('youngUpside: strands (5,1) x (5,1) give Size young 10, 6, 6 and 2 twelfths', () => {
    const p = { genes: { S: str(5) + str(1) } };
    const pred = predictOffspring(p.genes, p.genes);
    assert.ok(near(pred.size.mean, 6 / 12), 'the mean is the parents\' average');
    const d = youngDistribution(p, p);
    assert.equal(d.genes, 1);
    assert.equal(d.total, 4);
    assert.deepEqual([d.dist[2], d.dist[6], d.dist[10]], [1, 2, 1]);
    // one gene: the best quarter is the best outcome
    assert.ok(near(youngUpside(p, p), 10 / 12));
});

test('youngUpside: the best quarter of the 256 four-gene outcomes', () => {
    // fertility and immunity identical strands (0), Longevity (3,3) always 6, Size (5,1)
    const c = { genes: { F: 'AAAAAAAAAAAA', I: 'AAAAAAAAAAAA', S: str(5) + str(1), L: str(3) + str(3) } };
    const n = { genes: { F: 'AAAAAAAAAAAA', I: 'AAAAAAAAAAAA', S: str(3) + str(3), L: str(3) + str(3) } };
    const d = youngDistribution(c, c);
    assert.equal(d.total, 256);
    assert.deepEqual([d.dist[8], d.dist[12], d.dist[16]], [64, 128, 64]);
    assert.ok(near(youngQuality(c, c), 0.25));
    // the best 64 are the young with Size 10/12: (0 + 0 + 10 + 6) / 48
    assert.ok(near(youngUpside(c, c), 16 / 48));
    // an equal-average pair without the spread: the best young are the average
    assert.ok(near(youngQuality(n, n), 0.25));
    assert.ok(near(youngUpside(n, n), 0.25));
    // the expected young can't tell them apart; the best young can
    assert.ok(youngUpside(c, c) > youngUpside(n, n));
    assert.equal(youngUpside({ genes: null }, c), 0.5, 'no gene data: neutral, like youngQuality');
});

// ------------------------------------------------ copies and the ceiling

test('speciesStrands: best strands, copies, carriers, sole carrier and the ceiling', () => {
    const animals = [
        an('m1', M, '1', G(5, 1, 4, 4)),
        an('f1', F, '1', G(5, 5, 2, 1)),
        an('f2', F, '1', G(3, 2, 4, 3)),
        // a juvenile counts: it holds the best Longevity strand
        an('j1', M, '1', G(2, 2, 6, 1), { juv: true, age: 1 }),
        // too old: its strands don't count for the best, it is no carrier
        an('o1', F, '1', G(6, 6, 6, 6), { age: 16, infertile: true }),
    ];
    const model = buildKinModel(snap(animals));
    const st = speciesStrands(model, 'Lion');
    assert.deepEqual(st.best, { S: 5, L: 6 });
    assert.deepEqual(st.copies.get('m1'), { S: 1, L: 0 });
    assert.deepEqual(st.copies.get('f1'), { S: 2, L: 0 });
    assert.deepEqual(st.copies.get('j1'), { S: 0, L: 1 });
    assert.deepEqual(st.copies.get('o1'), { S: 2, L: 2 }, 'copies are counted for every animal');
    assert.deepEqual(usefulCopies(st, model.animals.get('o1')), { S: 0, L: 0 }, 'but an old one passes none on');
    assert.deepEqual(st.carriers.S.map(a => a.id).sort(), ['f1', 'm1']);
    assert.deepEqual(st.carriers.L.map(a => a.id), ['j1']);
    assert.equal(st.sole.L.id, 'j1');
    assert.equal(st.sole.S, null);
    assert.ok(near(st.ceiling, (10 + 12 + 24) / 48));
    assert.equal(ceilingText(st), 'Ceiling 95% · best V 5/6 (2 carry) · L 6/6 (only J1)');
    assert.equal(copiesText(st.copies.get('m1')), 'V1 L0');
    assert.equal(ceilingText(speciesStrands(model, 'Zebra')), '', 'no animals: no ceiling');
});

test('breeding value: the better strands, the fertility grade and the Immunity of its young with the herd', () => {
    // without a herd: its own Immunity grade stands in
    const a = { genes: G(5, 1, 2, 4, 3, 0) };
    assert.ok(near(breedingValue(a), (10 / 12 + 8 / 12 + 0.5 + 0) / 4));
    assert.equal(breedingValue({ genes: null }), null);
    // with the herd: how far its Immunity strands differ from the others'
    const animals = [
        an('m1', M, '1', Object.assign(G(5, 1, 3, 3), { I: 'AAAAAABBBBBB' })),
        an('f1', F, '1', Object.assign(G(5, 1, 3, 3), { I: 'AAAAAABBBBBB' })),
        an('f2', F, '1', Object.assign(G(5, 1, 3, 3), { I: 'CCCCCCDDDDDD' })),
    ];
    const model = buildKinModel(snap(animals));
    const st = speciesStrands(model, 'Lion');
    assert.equal(st.iStrands.length, 6);
    // m1 against f1 (A, B) and f2 (C, D): 2 of 4 strands differ at every locus
    assert.ok(near(youngImmunity(st, model.animals.get('m1')), 0.75));
    assert.ok(near(youngImmunity(st, model.animals.get('f2')), 1));
    assert.ok(breedingValue(model.animals.get('f2'), st) > breedingValue(model.animals.get('m1'), st));
});

test('outclasses: at least as many copies of each and more of one', () => {
    assert.equal(outclasses({ S: 2, L: 1 }, { S: 1, L: 1 }), true);
    assert.equal(outclasses({ S: 1, L: 1 }, { S: 1, L: 1 }), false);
    assert.equal(outclasses({ S: 2, L: 0 }, { S: 0, L: 1 }), false);
    assert.equal(outclasses({ S: 2, L: null }, { S: 0, L: 0 }), false);
});

test('carrierKeepers: two per best strand, one of each sex where possible', () => {
    const animals = [
        an('m1', M, '1', G(5, 1, 3, 3)), an('m2', M, '1', G(5, 5, 3, 3)), an('f1', F, '1', G(5, 0, 3, 3)),
        an('f2', F, '1', G(2, 2, 3, 3)),
    ];
    const model = buildKinModel(snap(animals));
    const st = speciesStrands(model, 'Lion');
    const keep = carrierKeepers(st, Array.from(model.animals.values()));
    // Size: the male with two copies and the only female carrier; Longevity
    // (everyone 3/6, two copies): m2 (most copies of both), then f1 (by id)
    assert.deepEqual(Array.from(keep.keys()).sort(), ['f1', 'm2']);
    assert.match(keep.get('m2'), /best Vitality strand \(5\/6\)/);
    // one sex only: the two best of it
    const males = buildKinModel(snap([an('m1', M, '1', G(5, 1, 3, 3)), an('m2', M, '1', G(5, 5, 3, 3)), an('m3', M, '1', G(5, 2, 3, 3)), an('f2', F, '1', G(2, 2, 2, 2))]));
    const k2 = carrierKeepers(speciesStrands(males, 'Lion'), Array.from(males.animals.values()));
    assert.ok(k2.has('m2') && (k2.has('m1') || k2.has('m3')));
});

// ------------------------------------------------ the default is unchanged

const ZOO_SEEDS = SEEDS.slice(0, 10);
const progDigest = p => p && { moves: p.moves, score: p.score, startScore: p.startScore, before: p.before, after: p.after, evaluations: p.evaluations, groups: p.groups.map(g => [g.hab, g.animals.map(a => a.id)]) };

test('default goal: the same programme plans and Thin out culls as with no goal at all', () => {
    let differs = 0, species = 0;
    for (const seed of ZOO_SEEDS) {
        const z = makeZoo(seed);
        const model = buildKinModel(z.snap);
        for (const sp of z.species) {
            const info = () => JSON.parse(JSON.stringify(z.info[sp]));
            const base = { moveCost: 0.04 };
            const plain = planProgramme(model, sp, info(), z.dest, { assignments: z.assignments, options: base });
            const avg = planProgramme(model, sp, info(), z.dest, { assignments: z.assignments, options: Object.assign({ goal: 'average' }, base) });
            assert.deepEqual(progDigest(avg), progDigest(plain), `seed ${seed} ${sp}: programme`);
            const ceil = planProgramme(model, sp, info(), z.dest, { assignments: z.assignments, options: Object.assign({ goal: 'ceiling', ceilingWithin: 1 }, base) });
            if (plain && ceil && !near(plain.score, ceil.score)) differs++;
            for (const o of [{ fill: 0.85 }, { fill: 0.55, genes: 'below', oldAlways: true, young: true }]) {
                assert.deepEqual(cullPlan(model, sp, info(), { options: Object.assign({ goal: 'average' }, o) }), cullPlan(model, sp, info(), { options: o }), `seed ${seed} ${sp}: Thin out`);
            }
            species++;
        }
    }
    assert.ok(species >= 15, `only ${species} species checked`);
    assert.ok(differs > 0, 'the ceiling goal scores plans differently');
});

test('default goal: the tuning adds nothing, Auto mode gets the goal only when chosen', () => {
    const settings = { step: 3, trade: true };
    assert.equal('goal' in programmeOptionsFor(settings, 'auto', null, null), false);
    assert.equal('goal' in programmeOptionsFor(settings, 'auto', null, { goal: 'default' }), false);
    assert.equal(programmeOptionsFor(settings, 'auto', null, { goal: 'ceiling' }).goal, 'ceiling');
});

// ------------------------------------------------- the ceiling goal

test('ceiling goal: a carrier x carrier pair beats an equal-average non-carrier pair', () => {
    // m carries the best Size strand (5,1); fc too, fn has (3,3): the same
    // average, so the expected young are equal; only the best young differ.
    // Fertility and immunity: the males' strands differ from the females' at
    // every locus, so every young gets 100% there (no spread to mask Size).
    const sexed = (sex, s1, s2) => Object.assign(G(s1, s2, 3, 3), sex === M ? { F: 'AAAAAABBBBBB', I: 'AAAAAABBBBBB' } : { F: 'CCCCCCDDDDDD', I: 'CCCCCCDDDDDD' });
    for (const order of [['fc', 'fn'], ['fn', 'fc']]) {
        const genes = { fc: sexed(F, 5, 1), fn: sexed(F, 3, 3) };
        const animals = [an('m', M, '1', sexed(M, 5, 1))].concat(order.map(id => an(id, F, '', genes[id])));
        const model = buildKinModel(snap(animals, ['1']));
        const [m, fc, fn] = ['m', 'fc', 'fn'].map(id => model.animals.get(id));
        assert.ok(near(youngQuality(m, fc), youngQuality(m, fn)));
        // best young: (12 + 12 + 10 + 6) / 48 against (12 + 12 + 8 + 6) / 48
        assert.ok(near(youngUpside(m, fc), 40 / 48) && near(youngUpside(m, fn), 38 / 48));
        const plan = planProgramme(model, 'Lion', { mating: 'monogamy', social: { max: 2 } }, DEST(['1']), { options: { moveCost: 0, outsiderCost: 0, goal: 'ceiling', ceilingWithin: 1 } });
        const to = new Map(plan.moves.map(x => [x.id, x.to]));
        assert.equal(to.get('fc'), '1', `order ${order}: the carrier joins the carrier`);
        assert.ok(!to.has('fn') || to.get('fn') !== '1', `order ${order}: the non-carrier stays out`);
    }
});

// one habitat, room 4: two carriers of the best Size strand with poor own
// grades (immunity), four animals with better own grades and no best strand
const guardZoo = () => [
    an('ma', M, '1', G(5, 0, 2, 2, 3, 1)), an('mb', M, '1', G(3, 3, 3, 3)),
    an('fa', F, '1', G(5, 0, 2, 2, 3, 1)), an('fb', F, '1', G(3, 3, 3, 3)), an('fc', F, '1', G(3, 3, 3, 3)), an('fd', F, '1', G(3, 3, 3, 3)),
];
const GUARD_INFO = { social: { max: 4 }, mating: 'polygyny' };

test('Thin out, ceiling goal: the last carriers of a best strand stay, one of each sex', () => {
    const model = buildKinModel(snap(guardZoo(), ['1']));
    const plain = cullPlan(model, 'Lion', GUARD_INFO, { options: { fill: 1 } });
    const out = new Set(plain.moves.map(x => x.id));
    assert.ok(out.has('ma') && out.has('fa'), `the default sends the carriers away (${Array.from(out)})`);
    const ceil = cullPlan(model, 'Lion', GUARD_INFO, { options: { fill: 1, goal: 'ceiling', ceilingWithin: 1 } });
    const gone = new Set(ceil.moves.map(x => x.id));
    // the carriers, the breeding core (mb, fb, fc) and the Longevity
    // keepers stay: only fd can leave, so the habitat stays one over
    assert.deepEqual(Array.from(gone), ['fd']);
    assert.deepEqual(ceil.strands.best, { S: 5, L: 3 });
    assert.ok(ceil.strands.keep.includes('ma') && ceil.strands.keep.includes('fa'));
    const keep = ceil.habitats[0].keep.find(x => x.id === 'ma');
    assert.match(keep.why, /best Vitality strand/);
    // the player's own choice still wins
    const hand = cullPlan(model, 'Lion', GUARD_INFO, { options: { fill: 1, goal: 'ceiling', ceilingWithin: 1, cullIds: new Set(['ma']) } });
    assert.ok(hand.moves.some(x => x.id === 'ma' && x.reason === 'your choice'));
});

test('Thin out, ceiling goal: no best strand goes first, then the outclassed', () => {
    // m1 and f1 hold two copies of both best strands (5/6); f2 one of each
    // and a poor fertility grade; f3 neither, with better own grades
    const animals = () => [
        an('m1', M, '1', G(5, 5, 5, 5)), an('f1', F, '1', G(5, 5, 5, 5)), an('f4', F, '1', G(5, 5, 5, 5)),
        an('f2', F, '1', G(5, 0, 5, 0, 3, 6)), an('f3', F, '1', G(4, 4, 4, 4)),
    ];
    const model = buildKinModel(snap(animals(), ['1']));
    const plain = cullPlan(model, 'Lion', GUARD_INFO, { options: { fill: 1 } });
    assert.deepEqual(plain.moves.map(x => x.id), ['f2'], 'the default: the weakest own grades');
    const ceil = cullPlan(model, 'Lion', GUARD_INFO, { options: { fill: 1, goal: 'ceiling', ceilingWithin: 1 } });
    assert.deepEqual(ceil.moves.map(x => x.id), ['f3'], 'no copy of either best strand goes first');
    assert.equal(ceil.moves[0].reason, 'carries neither best strand (V0 L0)');
    // room for 3: the outclassed one goes too
    const tight = cullPlan(model, 'Lion', { social: { max: 3 }, mating: 'polygyny' }, { options: { fill: 1, goal: 'ceiling', ceilingWithin: 1 } });
    assert.deepEqual(tight.moves.map(x => x.id).sort(), ['f2', 'f3']);
    assert.equal(tight.moves.find(x => x.id === 'f2').reason, 'outclassed by F1 (V2 L2 vs V1 L1)');
});

// Auto mode: one habitat. C holds the only best Size strand but lives with
// his daughters, so the programme sends him to the trade centre (a harem:
// one breeding male, and no unrelated female for him)
const AUTO_INFO = {
    social: { min: 2, max: 6 }, mating: 'polygyny', fertilityAges: { maturity: 3, infertility: 15 },
    habitats: { 1: { available: { land: 4000 }, required: { land: 2500 }, adults: 5 } },
};
const autoZoo = () => [
    an('c', M, '1', G(5, 5, 3, 3)), an('n', M, '1', G(3, 3, 3, 3)),
    an('d1', F, '1', G(3, 3, 3, 3), { par: ['gc', 'gx'] }), an('d2', F, '1', G(3, 3, 3, 3), { par: ['gc', 'gx'] }),
    an('u', F, '1', G(3, 3, 3, 3)),
];
const autoRun = (tune, thin) => planAutoRun({
    model: buildKinModel(snap(autoZoo(), ['1'])), species: 'Lion', info: AUTO_INFO, destinations: DEST(['1']), assignments: null,
    settings: { thin }, view: {}, tradeFree: null, tune,
});

test('Auto mode, ceiling goal: the carrier guard holds against the programme and Thin out', () => {
    const plain = autoRun(null, false);
    assert.ok(plain.moves.some(m => m.id === 'c' && m.to === TRADE), `the default sends C away: ${JSON.stringify(plain.moves)}`);
    for (const thin of [false, true]) {
        const r = autoRun({ goal: 'ceiling' }, thin);
        assert.ok(!r.moves.some(m => m.id === 'c' && m.to === TRADE), `thin ${thin}: C stays: ${JSON.stringify(r.moves)}`);
        const held = r.held.find(x => x.id === 'c');
        assert.ok(held && /best Vitality strand/.test(held.why), `thin ${thin}: held ${JSON.stringify(r.held)}`);
        if (thin) assert.ok(r.thin && r.thin.strands, 'Thin out ran with the ceiling goal');
    }
    const off = autoRun(null, true);
    assert.ok(off.thin && !off.thin.strands, 'the default goal reaches Thin out too');
});

// ------------------------------------------- the ceiling goal waits

test('ceiling goal: far below the ceiling it waits and breeds for the average young', () => {
    // herd mean 83%, ceiling 91% (best V and L 5/6): 8 points below
    const animals = () => [
        an('m1', M, '1', G(5, 5, 5, 5)), an('f1', F, '1', G(5, 5, 5, 5)), an('f4', F, '1', G(5, 5, 5, 5)),
        an('f2', F, '1', G(5, 0, 5, 0, 3, 6)), an('f3', F, '1', G(4, 4, 4, 4)),
    ];
    const model = buildKinModel(snap(animals(), ['1']));
    const st = speciesStrands(model, 'Lion');
    assert.ok(near(st.mean, (3 * 11 / 12 + (0.5 + 1 + 5 / 12 + 5 / 12) / 4 * 1 + 10 / 12) / 5));
    assert.equal(ceilingWaiting(st), true);
    assert.equal(ceilingWaiting(st, 0.1), false, 'within 10 points it acts');
    // Thin out: by the animals' own genes, as the default (the carriers stay)
    const wait = cullPlan(model, 'Lion', GUARD_INFO, { options: { fill: 1, goal: 'ceiling' } });
    assert.equal(wait.strands.waiting, true);
    assert.deepEqual(wait.moves.map(x => x.id), cullPlan(model, 'Lion', GUARD_INFO, { options: { fill: 1 } }).moves.map(x => x.id));
    assert.deepEqual(cullPlan(model, 'Lion', GUARD_INFO, { options: { fill: 1, goal: 'ceiling', ceilingWithin: 0.1 } }).moves.map(x => x.id), ['f3']);
});

test('ceiling goal: the programme waits too, with the same plan as the average young', () => {
    const sexed = (sex, s1, s2) => Object.assign(G(s1, s2, 3, 3), sex === M ? { F: 'AAAAAABBBBBB', I: 'AAAAAABBBBBB' } : { F: 'CCCCCCDDDDDD', I: 'CCCCCCDDDDDD' });
    const animals = [an('m', M, '1', sexed(M, 5, 1)), an('fc', F, '', sexed(F, 5, 1)), an('fn', F, '', sexed(F, 3, 3))];
    const model = buildKinModel(snap(animals, ['1']));
    const opts = extra => ({ options: Object.assign({ moveCost: 0, outsiderCost: 0 }, extra) });
    const INFO = { mating: 'monogamy', social: { max: 2 } };
    const avg = planProgramme(model, 'Lion', INFO, DEST(['1']), opts({}));
    const wait = planProgramme(model, 'Lion', INFO, DEST(['1']), opts({ goal: 'ceiling' }));
    // mean 75%, ceiling 83%
    assert.ok(wait.ceilingWait && near(wait.ceilingWait.mean, 0.75) && near(wait.ceilingWait.ceiling, 40 / 48), JSON.stringify(wait.ceilingWait));
    assert.deepEqual(wait.moves, avg.moves);
    assert.ok(near(wait.score, avg.score));
    const act = planProgramme(model, 'Lion', INFO, DEST(['1']), opts({ goal: 'ceiling', ceilingWithin: 0.1 }));
    assert.equal(act.ceilingWait, undefined);
    assert.equal(new Map(act.moves.map(x => [x.id, x.to])).get('fc'), '1');
});

// ------------------------------------------- who counts as related

// grandparents ga x gb; their son c1 and daughter c2; c1's son x and c2's
// daughter y are first cousins (kinship 1/16, the default close kin). The
// elders and x's sister xf don't breed (infertile), so only x and y can pair.
const ELDER = { infertile: true };
const cousins = (xGenes, yGenes) => [
    an('ga', M, '3', G(3, 3, 3, 3), Object.assign({ age: 12 }, ELDER)), an('gb', F, '3', G(3, 3, 3, 3), Object.assign({ age: 12 }, ELDER)),
    an('c1', M, '3', G(3, 3, 3, 3), Object.assign({ par: ['gga', 'ggb'], age: 8 }, ELDER)), an('c2', F, '3', G(3, 3, 3, 3), Object.assign({ par: ['gga', 'ggb'], age: 8 }, ELDER)),
    an('x', M, '1', xGenes, { par: ['gc1', 'gu1'] }), an('y', F, '2', yGenes, { par: ['gu2', 'gc2'] }),
    an('xf', F, '3', G(3, 3, 3, 3), Object.assign({ par: ['gc1', 'gu1'], age: 4 }, ELDER)),
];
const GOOD_X = Object.assign(G(3, 3, 3, 3), { F: 'AAAAAABBBBBB', I: 'AAAAAABBBBBB' });
const GOOD_Y = Object.assign(G(3, 3, 3, 3), { F: 'CCCCCCDDDDDD', I: 'CCCCCCDDDDDD' });
const SAME = Object.assign(G(3, 3, 3, 3), { F: 'AAAAAAAAAAAA', I: 'AAAAAAAAAAAA' });

test('kin rule: by the young\'s genes, close kin with good young are not related; the game\'s own rule always is', () => {
    const model = buildKinModel(snap(cousins(GOOD_X, GOOD_Y), ['1', '2', '3']));
    const [x, y, c1, xf] = ['x', 'y', 'c1', 'xf'].map(id => model.animals.get(id));
    const rel = model.ped.relation(x.guid, y.guid);
    assert.ok(rel && !rel.game && near(rel.kinship, 1 / 16), JSON.stringify(rel));
    assert.equal(relatedBy(model, x, y), true, 'the family tree: first cousins are close kin');
    assert.equal(relatedBy(model, x, y, 'genes'), false, 'by genes: their young would have 100% Fertility and Immunity');
    assert.equal(relatedBy(model, c1, xf, 'genes'), true, 'father and daughter: the game\'s own rule');
    const bad = buildKinModel(snap(cousins(SAME, SAME), ['1', '2', '3']));
    assert.equal(relatedBy(bad, bad.animals.get('x'), bad.animals.get('y'), 'genes'), true, 'young with 0% Fertility: related');
    // Thin out counts relatives by the same rule
    assert.equal(keepValue(model, x, [x, y]).relatives, 1);
    assert.equal(keepValue(model, x, [x, y], { kin: { kinRule: 'genes' } }).relatives, 0);
});

test('kin rule: by the young\'s genes the programme pairs first cousins the family tree leaves idle', () => {
    const model = buildKinModel(snap(cousins(GOOD_X, GOOD_Y), ['1', '2', '3']));
    const INFO = { mating: 'monogamy', social: { max: 2 } };
    const plan = extra => planProgramme(model, 'Lion', INFO, DEST(['1', '2']), { options: Object.assign({ moveCost: 0, outsiderCost: 0 }, extra) });
    const tree = plan({});
    const genes = plan({ kinRule: 'genes' });
    const pairedXY = p => {
        const to = new Map(p.moves.map(m => [m.id, m.to]));
        const hx = to.get('x') || '1', hy = to.get('y') || '2';
        return hx === hy;
    };
    assert.equal(pairedXY(tree), false, 'the family tree keeps them apart');
    assert.equal(pairedXY(genes), true, `by genes they breed together: ${JSON.stringify(genes.moves)}`);
});

// The game's most per sex outranks the strand guard while another carrier
// of the strand stays in the habitats (2026-10-26: two male leopards, both
// carrying the best Longevity strand, were both kept in one habitat).
const LEO = { social: { min: 1, max: 2 }, mating: 'mixed', sexMax: { male: 1, female: 1 }, bachelorMax: { male: 1, female: 2 }, fertilityAges: { maturity: 3, infertility: 15 } };

test('lastCarrier: the last staying carrier of a best strand, else nobody', () => {
    const model = buildKinModel(snap([an('a', M, '1', G(3, 3, 5, 2)), an('b', M, '1', G(3, 3, 5, 3)), an('c', F, '2', G(6, 2, 2, 2))]));
    const st = speciesStrands(model, 'Lion');
    const [a, b, c] = ['a', 'b', 'c'].map(id => model.animals.get(id));
    assert.equal(lastCarrier(st, a, [a, b, c]), '', 'b carries it too');
    assert.match(lastCarrier(st, a, [a, c]), /last carrier of the best Longevity strand \(5\/6\)/);
    assert.match(lastCarrier(st, c, [a, b, c]), /Vitality/);
    assert.equal(lastCarrier(st, b, [b]), lastCarrier(st, b, []), 'itself never counts');
});

test("the game's most per sex: a strand's second carrier gives way, its last one stays and is named", () => {
    // H1: two males alone, both carry the best Longevity strand; H2: a pair
    let model = buildKinModel(snap([an('a', M, '1', G(3, 3, 5, 2)), an('b', M, '1', G(3, 3, 5, 3)), an('m', M, '2', G(3, 3, 2, 2)), an('f', F, '2', G(3, 3, 2, 2))]));
    let plan = cullPlan(model, 'Lion', LEO, { options: { fill: 1, ratio: '1:1', goal: 'ceiling' } });
    assert.equal(plan.moves.length, 1, JSON.stringify(plan.moves));
    assert.ok(['a', 'b'].includes(plan.moves[0].id) && plan.moves[0].limit === true);
    // Auto mode's carrier guard lets that send go (the other carrier stays)
    const run = planAutoRun({ model, species: 'Lion', info: LEO, destinations: DEST(['1', '2']), assignments: null, settings: { thin: true }, view: {}, tradeFree: null, ratio: '1:1', tune: { goal: 'ceiling' } });
    assert.ok(run.moves.some(m => m.id === plan.moves[0].id && m.to === TRADE), JSON.stringify([run.moves, run.held]));
    // each carries a best strand nobody else has: both stay, the one over the limit is named
    model = buildKinModel(snap([an('a', M, '1', G(6, 2, 2, 2)), an('b', M, '1', G(2, 2, 6, 2)), an('m', M, '2', G(3, 3, 2, 2)), an('f', F, '2', G(3, 3, 2, 2))]));
    plan = cullPlan(model, 'Lion', LEO, { options: { fill: 1, ratio: '1:1', goal: 'ceiling' } });
    assert.deepEqual(plan.moves, []);
    assert.equal(plan.overLimit.length, 1);
    assert.equal(plan.overLimit[0].hab, '1');
    // a female not yet of age next to an adult one: not sent away for the
    // limit (the programme places her); room for three here
    model = buildKinModel(snap([an('m', M, '1', G(3, 3, 3, 3)), an('f', F, '1', G(3, 3, 3, 3)), an('y', F, '1', G(3, 3, 3, 3), { age: 2.6, infertile: true })]));
    plan = cullPlan(model, 'Lion', Object.assign({}, LEO, { social: { min: 1, max: 3 } }), { options: { fill: 1, ratio: '1:1' } });
    assert.ok(!plan.moves.some(m => m.id === 'y'), JSON.stringify(plan.moves));
});

// ------------------------------------------- better strands elsewhere
// The market shows only the grades (the developer, 2026-10-28): animals
// outside the herd with a better Vitality or Longevity strand are marked.

test("the herd's best strands: animals in habitats that can still breed, not the trade centre or storage", () => {
    const model = buildKinModel(snap([
        an('a', M, '1', G(4, 3, 5, 2)), an('b', F, '1', G(3, 3, 4, 4)),
        an('t', M, '', G(6, 6, 6, 6)),                                        // waiting at the trade centre
        an('o', F, '2', G(6, 1, 6, 1), { age: 16, infertile: true, ageQ: 3 }), // past breeding
        an('j', F, '2', G(5, 1, 1, 1), { juv: true, age: 1 }),               // young count
    ]));
    assert.deepEqual(herdBest(model).get('Lion'), { S: 5, L: 5, n: 3 });
    assert.equal(herdBest(null).size, 0);
});

test("strands from the game's genetic identity: strand A then strand B per locus", () => {
    const lit = (x, y) => `[STRING_LITERAL:Value=|${x}${y}|]`;
    assert.deepEqual(strandsFromLoci(['A', 'B', 'A', 'B', 'A', 'B'].map((x, i) => lit(x, i < 4 ? 'C' : 'A'))), [6, 2]);
    assert.deepEqual(strandsFromLoci(['AD', 'BD', 'CA', 'DB', 'AA', 'CC']), [3, 3]);
    assert.equal(strandsFromLoci(['AB', 'AB', '??', 'AB', 'AB', 'AB']), null, 'unknown locus');
    assert.equal(strandsFromLoci(['AB', 'AB']), null);
    assert.equal(strandsFromLoci(undefined), null);
});

test('a strand edge: exact from the strands, a lower bound from the grade alone', () => {
    const best = { S: 6, L: 5 };
    const e = strandEdge({ S: [5, 4], L: [6, 2] }, null, best);
    assert.deepEqual(e.L, { value: 6, exact: true, beats: true, best: 5 });
    assert.equal(e.S.beats, false);
    assert.equal(strandEdgeText(e), 'L6');
    assert.match(strandEdgeWords(e, 'Cradle'), /^Better than any in your herd at Cradle: a Longevity strand of 6\/6 \(your best: 5\/6\)\.$/);
    // grades: 11/12 (91%) must hold a 6/6 strand; 10/12 (83%) may be 5 + 5
    const g = grade => strandEdge(null, { S: 0.5, L: grade }, best).L;
    assert.deepEqual(g(0.92), { value: 6, exact: false, beats: true, best: 5 });
    assert.equal(g(0.9167).beats, true);
    assert.equal(g(0.83).beats, false);
    assert.equal(g(1).value, 6);
    assert.equal(strandEdgeText(strandEdge(null, { L: 0.92 }, { S: 4, L: 4 })), 'L6+');
    assert.equal(strandEdgeText(strandEdge(null, { S: 0.83, L: 0.92 }, { S: 4, L: 4 })), 'V5+ L6+');
    assert.equal(strandEdgeText(strandEdge(null, { S: 0.83, L: 0.92 }, { S: 4, L: 4 }), { S: 'Vit', L: 'Long' }), 'Vit5+ Long6+');
    assert.deepEqual(strandEdge({ S: null, L: null }, null, best), {}, 'nothing known: no mark');
    assert.equal(strandEdgeText({}), '');
    assert.equal(strandEdgeWords({}), '');
});

test("the herd's best for the hub: compact, cut by the fewest animals, read back", () => {
    const best = new Map([['Dog_AfricanWild', { S: 6, L: 5, n: 31 }], ['Lion', { S: 4, L: 3, n: 2 }], ['[Animal_Meerkat]', { S: 5, L: 5, n: 9 }], ['bad name!', { S: 1, L: 1, n: 50 }]]);
    const text = encodeHerdBest(best);
    assert.equal(text, 'Dog_AfricanWild:65,Lion:43,Meerkat:55');
    assert.deepEqual(Array.from(decodeHerdBest(text)), [['Dog_AfricanWild', { S: 6, L: 5 }], ['Lion', { S: 4, L: 3 }], ['Meerkat', { S: 5, L: 5 }]]);
    assert.equal(encodeHerdBest(best, 32), 'Dog_AfricanWild:65,Meerkat:55', 'cut: the species with the most animals stay');
    assert.equal(decodeHerdBest('x:9,Lion:43,:12,Okapi:7').size, 1);
    assert.equal(decodeHerdBest(undefined).size, 0);
});
