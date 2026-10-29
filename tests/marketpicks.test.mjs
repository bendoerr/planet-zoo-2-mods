// node --test tests/marketpicks.test.mjs
// Market picks (experimental; marketpickcore.js): the herd's facts the park
// keeps for the hub, their text in the setting, and the score of a market
// row against them (its young with the herd's best mate for it against the
// young of the herd's best pairs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKinModel, Sex } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kincore.js';
import {
    benchYoung, decodeMarketFacts, encodeMarketFacts, genesFromLoci, herdMarketFacts, isPick, marketAge, pickText, pickWhy, pickWords,
    PICK_MATES, PICK_MIN, PICK_STRAND_WEIGHT, scoreListing,
} from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/marketpickcore.js';

const M = Sex.Male, F = Sex.Female;
// a Vitality / Longevity strand with v good letters (A) out of 6, the rest C
const str = v => 'A'.repeat(v) + 'C'.repeat(6 - v);
// genes: Size and Longevity strands, Fertility and Immunity strands as 12 letters
const G = (s1, s2, l1, l2, f = 'ABCDABBADCBA', i = 'ABCDABDCBADC') => ({ F: f, I: i, S: str(s1) + str(s2), L: str(l1) + str(l2) });
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
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const GENES = ['size', 'longevity', 'fertility', 'immunity'];

// One species' facts by hand: a male and a female mate, the bench at 60.
const facts = (over = {}) => Object.assign({
    n: 10, K: 2, inf: 15, best: { S: 5, L: 5 }, copies: { S: 8, L: 8 },
    bench: { size: 0.6, longevity: 0.6, fertility: 0.6, immunity: 0.6, pairs: 2 },
    mates: [
        { sex: M, S: 8, L: 8, F: 'AAAAAABBBBBB', I: 'AAAAAABBBBBB' },
        { sex: F, S: 12, L: 12, F: 'AAAAAAAAAAAA', I: 'BBBBBBBBBBBB' },
    ],
}, over);

// ------------------------------------------------------------ the row

test("a row's genes from its genetic identity: strand A then strand B per locus", () => {
    const lit = x => `[STRING_LITERAL:Value=|${x}|]`;
    assert.equal(genesFromLoci(['AC', 'BD', 'AA', 'AB', 'CD', 'DD'].map(lit)), 'ABAACDCDABDD');
    assert.equal(genesFromLoci(['ac', ' BD ', 'AA', 'AB', 'CD', 'DD']), 'ABAACDCDABDD', 'plain pairs, any case');
    assert.equal(genesFromLoci(['AC', 'BD', 'AA', 'AB', 'CD', '']), null, 'a locus missing');
    assert.equal(genesFromLoci(['AC', 'BD', 'AA', 'AB', 'CD', 'Z?']), null, 'not two of A-D');
    assert.equal(genesFromLoci(['AC', 'BD']), null);
    assert.equal(genesFromLoci(undefined), null);
});

test("a market row's age from its text", () => {
    assert.equal(marketAge('[AnimalExchange_Animal_Age:Years=(13.711668)]'), 13.711668);
    assert.equal(marketAge('[AnimalExchange_Animal_Age:Years=(2)]'), 2);
    assert.equal(marketAge(4.5), 4.5);
    assert.equal(marketAge('soon'), null);
    assert.equal(marketAge(undefined), null);
});

// ------------------------------------------------------------ the herd

test('herd facts: habitats only, not past breeding, best strands and their copies, the best mates per sex', () => {
    const animals = [
        an('m1', M, '1', G(6, 3, 5, 5)),
        an('m2', M, '2', G(4, 4, 4, 4)),
        an('m3', M, '1', G(3, 3, 3, 3)),
        an('m4', M, '2', G(2, 2, 2, 2)),
        an('f1', F, '1', G(5, 5, 6, 6)),
        an('f2', F, '2', G(4, 4, 4, 4)),
        // the trade centre and the old leave the herd's facts alone
        an('t1', F, '', G(6, 6, 6, 6)),
        an('o1', F, '1', G(6, 6, 6, 6), { age: 16 }),
    ];
    const f = herdMarketFacts(buildKinModel(snap(animals))).get('Lion');
    assert.equal(f.n, 6);
    assert.equal(f.K, 2);
    assert.equal(f.inf, 15);
    assert.deepEqual(f.best, { S: 6, L: 6 });
    assert.deepEqual(f.copies, { S: 1, L: 2 });
    assert.equal(PICK_MATES, 2);
    assert.equal(f.mates.length, 2 * PICK_MATES, 'two males, two females');
    assert.deepEqual(f.mates.filter(m => m.sex === M).map(m => m.S), [9, 8], 'the best breeders first; m3, m4 left out');
    assert.deepEqual(f.mates[0], { sex: M, S: 9, L: 10, F: 'ABCDABBADCBA', I: 'ABCDABDCBADC' });
    assert.ok(f.bench && f.bench.pairs === 2);
    assert.equal(herdMarketFacts(buildKinModel(snap(animals)), { mates: 1 }).get('Lion').mates.length, 2);
    assert.equal(herdMarketFacts(buildKinModel(snap(animals)), { mates: 3 }).get('Lion').mates.length, 5, 'three males, the two females');
    assert.equal(herdMarketFacts(null).size, 0);
});

test("the bench: the herd's best pairs, no animal twice, none the game calls inbred", () => {
    const animals = [
        an('m1', M, '1', G(6, 6, 6, 6)),
        an('f1', F, '1', G(6, 6, 6, 6), { par: ['gm1', 'gx'] }),
        an('m2', M, '2', G(2, 2, 2, 2)),
        an('f2', F, '2', G(2, 2, 2, 2)),
    ];
    const model = buildKinModel(snap(animals));
    const breeders = Array.from(model.animals.values());
    // m1 x f1 is father and daughter: m1 x f2 and m2 x f1 instead
    const b = benchYoung(model, breeders, 2);
    assert.equal(b.pairs, 2);
    assert.ok(near(b.size, (8 / 12 + 8 / 12) / 2), 'each pair: (12 + 4) / 24');
    // one pair: the best that is allowed
    assert.ok(near(benchYoung(model, breeders, 1).size, 8 / 12));
    assert.equal(benchYoung(model, breeders.filter(a => a.sex === M), 2), null, 'no pair');
});

// ------------------------------------------------------- the setting's text

test("the facts' text: round trip, the cap drops the smallest herds, broken items left out", () => {
    const a = facts();
    const b = facts({ n: 3, K: 1, inf: 0, best: { S: 6, L: 4 }, copies: { S: 1, L: 3 }, mates: [a.mates[0]] });
    const text = encodeMarketFacts(new Map([['Lion', a], ['Tiger', b]]));
    assert.match(text, /^Lion:[A-Za-z0-9_-]+,Tiger:[A-Za-z0-9_-]+$/);
    const back = decodeMarketFacts(text);
    assert.deepEqual(back.get('Lion'), a);
    assert.deepEqual(back.get('Tiger'), Object.assign({}, b, { bench: Object.assign({}, a.bench, { pairs: 1 }) }));
    assert.equal(text.length, 'Lion:'.length + 14 + 20 + 1 + 'Tiger:'.length + 14 + 10, 'fourteen characters, then ten per mate');
    // the cap: the species with fewer breeders goes first
    const cut = decodeMarketFacts(encodeMarketFacts(new Map([['Lion', a], ['Tiger', b]]), 40));
    assert.deepEqual(Array.from(cut.keys()), ['Lion']);
    // no bench: K 0
    assert.equal(decodeMarketFacts(encodeMarketFacts(new Map([['Lion', facts({ bench: null })]]))).get('Lion').bench, null);
    // a mate whose Fertility or Immunity letters are not A-D is left out
    const odd = facts({ mates: [Object.assign({}, a.mates[0], { F: 'AAAAAAZZZZZZ' }), a.mates[1]] });
    assert.equal(decodeMarketFacts(encodeMarketFacts(new Map([['Lion', odd]]))).get('Lion').mates.length, 1);
    assert.equal(decodeMarketFacts('Lion:abc,Tiger,:x,' + text.split(',')[1]).size, 1, 'broken items left out');
    assert.equal(decodeMarketFacts(undefined).size, 0);
});

test('the herd facts of a zoo fit the setting', () => {
    // 12 species of 30 animals (the owner's Cradle #2 holds 12) fit in 1000
    const animals = [];
    for (let s = 0; s < 12; s++) for (let i = 0; i < 30; i++) animals.push(an(`a${s}_${i}`, i % 2 ? F : M, String(1 + (i % 3)), G(i % 7, 3, 4, i % 6), { species: `Species_${s}` }));
    const text = encodeMarketFacts(herdMarketFacts(buildKinModel(snap(animals, ['1', '2', '3']))));
    assert.ok(text.length <= 1000, `${text.length} characters`);
    assert.equal(decodeMarketFacts(text).size, 12);
    assert.equal(decodeMarketFacts(encodeMarketFacts(herdMarketFacts(buildKinModel(snap(animals, ['1', '2', '3'])), { mates: 3 }))).size, 11, 'with 3 mates a sex: cut to 11');
});

// --------------------------------------------------------------- the score

test("score: its young with the herd's best mate for it against the herd's pairs' young", () => {
    // a male with Vitality and Longevity 6 of 12 and Fertility / Immunity strands unlike the female mate's
    const row = { sex: M, maturity: 2, age: 4, genes: { S: str(3) + str(3), L: str(3) + str(3), F: 'CCCCCCDDDDDD', I: 'CCCCCCDDDDDD' } };
    const r = scoreListing(row, facts());
    assert.equal(r.mate, 1, 'the female: the male mate is the same sex');
    assert.ok(near(r.youngGenes.size, 18 / 24) && near(r.youngGenes.longevity, 18 / 24), 'the parents\' average');
    assert.ok(near(r.youngGenes.fertility, 1) && near(r.youngGenes.immunity, 1), 'every strand pair differs everywhere');
    assert.ok(near(r.young, 0.875) && near(r.bench, 0.6));
    assert.ok(near(r.score, 0.275));
    assert.equal(r.sure, true);
    assert.deepEqual(GENES.map(g => Math.round(r.gains[g] * 100)), [15, 15, 40, 40]);
    assert.equal(pickText(r), 'Pick +27.5');
    assert.equal(pickWhy(r), 'young: Fertility +40, Immunity +40');
    assert.match(pickWords(r, facts().mates[r.mate], 'Cradle'), /^Its young with your best female for it would average 87; your herd's pairs' young at Cradle average 60\. Sure: its strands are on the listing\.$/);
    assert.ok(isPick(r));
});

test('score: Fertility and Immunity strands like the mate\'s give poor young', () => {
    const row = { sex: M, maturity: 2, age: 4, genes: { S: str(3) + str(3), L: str(3) + str(3), F: 'AAAAAAAAAAAA', I: 'BBBBBBBBBBBB' } };
    const r = scoreListing(row, facts());
    assert.ok(near(r.youngGenes.fertility, 0) && near(r.youngGenes.immunity, 0));
    assert.ok(r.score < 0 && !isPick(r));
});

test('score from the grades alone (no strands on the row): rough, Fertility and Immunity as the bench', () => {
    const row = { sex: F, maturity: 2, age: 4, genes: {}, grades: { size: 1, longevity: 11 / 12, fertility: 0.5, immunity: 0.5 } };
    const r = scoreListing(row, facts());
    assert.equal(r.mate, 0, 'the male');
    assert.equal(r.sure, false);
    assert.ok(near(r.youngGenes.size, 20 / 24) && near(r.youngGenes.longevity, 19 / 24));
    assert.ok(near(r.youngGenes.fertility, 0.6) && near(r.youngGenes.immunity, 0.6));
    // the grades bound its strands: 12 and 11 twelfths hold a 6/6 strand, better than the herd's 5
    assert.deepEqual(r.strand.notes.map(n => [n.k, n.value, n.isNew, n.exact]), [['S', 6, true, false], ['L', 6, true, false]]);
    assert.equal(pickWhy(r), 'Vitality and Longevity 6/6 strands; your best is 5/6', '11 of 12 holds a 6/6 strand for sure');
    // 10 of 12: at least a 5/6 strand
    const five = scoreListing(Object.assign({}, row, { grades: { size: 10 / 12, longevity: 0.5 } }), facts({ best: { S: 4, L: 6 } }));
    assert.equal(pickWhy(five), 'Vitality at least 5/6 strand; your best is 4/6');
    assert.match(pickWords(r, facts().mates[0]), /Rough: the listing showed no strands; Fertility and Immunity taken as your pairs' young\.$/);
    // with no grades either, nothing to score
    assert.equal(scoreListing({ sex: F, maturity: 2, genes: {} }, facts()), null);
});

test('score: a best strand the herd has few copies of is named; the strand weight is 0', () => {
    assert.equal(PICK_STRAND_WEIGHT, 0);
    const row = { sex: M, maturity: 2, age: 4, genes: { S: str(5) + str(1), L: str(2) + str(2), F: 'CCCCCCDDDDDD', I: 'CCCCCCDDDDDD' } };
    const few = scoreListing(row, facts({ copies: { S: 2, L: 8 } }));
    assert.deepEqual(few.strand.notes, [{ k: 'S', value: 5, isNew: false, best: 5, copies: 2, exact: true }]);
    assert.ok(near(few.strand.bonus, 0.5 * (1 - 2 * 2 / 20)));
    assert.equal(pickWhy(few), 'Vitality 5/6 strand; the herd has 2 copies');
    // half the herd's strands or more at the best: not named
    assert.deepEqual(scoreListing(row, facts({ copies: { S: 10, L: 8 } })).strand.notes, []);
    // the weight is an option (the simulation's)
    const w = scoreListing(row, facts({ copies: { S: 2, L: 8 } }), { strandWeight: 0.2 });
    assert.ok(near(w.score - few.score, 0.2 * few.strand.bonus / 2));
});

test('score: infertile or too old is skipped; the last breeding years count in proportion', () => {
    const genes = { S: str(3) + str(3), L: str(3) + str(3), F: 'CCCCCCDDDDDD', I: 'CCCCCCDDDDDD' };
    for (const maturity of [4, 5, 6]) assert.deepEqual(scoreListing({ sex: M, maturity, age: 4, genes }, facts()), { skip: 'infertile' });
    assert.deepEqual(scoreListing({ sex: M, maturity: 2, age: 15, genes }, facts()), { skip: 'old' });
    const full = scoreListing({ sex: M, maturity: 2, age: 4, genes }, facts());
    const late = scoreListing({ sex: M, maturity: 2, age: 14, genes }, facts());
    assert.equal(late.factor, 0.5, 'one year left of two');
    assert.ok(near(late.score, full.score / 2));
    assert.match(pickWords(late, facts().mates[1]), /Counted at 50%: about 1 breeding years left\./);
    // unknown age or infertility age: counted in full
    assert.equal(scoreListing({ sex: M, maturity: 2, age: null, genes }, facts()).factor, 1);
    assert.equal(scoreListing({ sex: M, maturity: 2, age: 30, genes }, facts({ inf: 0 })).factor, 1);
});

test('score: nothing without facts, a bench or a mate of the other sex', () => {
    const row = { sex: M, maturity: 2, age: 4, genes: { S: str(3) + str(3), L: str(3) + str(3) } };
    assert.equal(scoreListing(row, null), null);
    assert.equal(scoreListing(row, facts({ bench: null })), null);
    assert.equal(scoreListing(row, facts({ mates: [facts().mates[0]] })), null, 'only a male mate');
    // a row of unknown sex may pair with either
    assert.equal(scoreListing(Object.assign({}, row, { sex: undefined }), facts({ mates: [facts().mates[0]] })).mate, 0);
});

test('a pick adds at least 2 points', () => {
    assert.equal(PICK_MIN, 0.02);
    assert.ok(isPick({ score: 0.02 }));
    assert.ok(!isPick({ score: 0.0199 }));
    assert.ok(!isPick({ skip: 'old' }));
    assert.ok(!isPick(null));
    assert.equal(pickText({ score: 0.0214 }), 'Pick +2.1');
});
