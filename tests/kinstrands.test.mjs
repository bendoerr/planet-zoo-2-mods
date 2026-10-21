// node --test tests/kinstrands.test.mjs
// Best strands and the Breeding goal "Push the ceiling" (kinstrands.js):
// the young's outcome distribution, copies, carriers and the ceiling; the
// default goal plans and culls exactly as before; the ceiling goal pairs
// carriers and Thin out (by hand and in Auto mode) keeps them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKinModel, predictOffspring, Sex } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kincore.js';
import { TRADE } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinboardcore.js';
import { planProgramme, youngQuality } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinprogramme.js';
import { cullPlan } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kincull.js';
import { planAutoRun, programmeOptionsFor } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinautocore.js';
import {
    breedingValue, carrierKeepers, ceilingText, copiesText, outclasses, speciesStrands, usefulCopies, youngDistribution, youngUpside,
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

test('breeding value: the better strands and the fertility grade, not immunity', () => {
    const a = { genes: G(5, 1, 2, 4, 3, 0) };
    assert.ok(near(breedingValue(a), (10 / 12 + 8 / 12 + 0.5) / 3));
    assert.ok(near(breedingValue({ genes: G(5, 1, 2, 4, 3, 6) }), breedingValue(a)));
    assert.equal(breedingValue({ genes: null }), null);
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
            const ceil = planProgramme(model, sp, info(), z.dest, { assignments: z.assignments, options: Object.assign({ goal: 'ceiling' }, base) });
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
        const plan = planProgramme(model, 'Lion', { mating: 'monogamy', social: { max: 2 } }, DEST(['1']), { options: { moveCost: 0, outsiderCost: 0, goal: 'ceiling' } });
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
    const ceil = cullPlan(model, 'Lion', GUARD_INFO, { options: { fill: 1, goal: 'ceiling' } });
    const gone = new Set(ceil.moves.map(x => x.id));
    // the carriers, the breeding core (mb, fb, fc) and the Longevity
    // keepers stay: only fd can leave, so the habitat stays one over
    assert.deepEqual(Array.from(gone), ['fd']);
    assert.deepEqual(ceil.strands.best, { S: 5, L: 3 });
    assert.ok(ceil.strands.keep.includes('ma') && ceil.strands.keep.includes('fa'));
    const keep = ceil.habitats[0].keep.find(x => x.id === 'ma');
    assert.match(keep.why, /best Vitality strand/);
    // the player's own choice still wins
    const hand = cullPlan(model, 'Lion', GUARD_INFO, { options: { fill: 1, goal: 'ceiling', cullIds: new Set(['ma']) } });
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
    const ceil = cullPlan(model, 'Lion', GUARD_INFO, { options: { fill: 1, goal: 'ceiling' } });
    assert.deepEqual(ceil.moves.map(x => x.id), ['f3'], 'no copy of either best strand goes first');
    assert.equal(ceil.moves[0].reason, 'carries neither best strand (V0 L0)');
    // room for 3: the outclassed one goes too
    const tight = cullPlan(model, 'Lion', { social: { max: 3 }, mating: 'polygyny' }, { options: { fill: 1, goal: 'ceiling' } });
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
