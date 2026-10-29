// The Breeding programme's fine tuning (kinprogtune.js): known keys and
// choices only, defaults left out, applied on top of the options, a stable
// cache key, and the engine reads every tuned option.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAMME_TUNING, applyTuning, normalizeTuning, tuningChoice, tuningCount, tuningCull, tuningGoal, tuningKey } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinprogtune.js';
import { PROGRAMME_DEFAULTS } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinprogramme.js';
import { AUTO_STRAND_BONUS, programmeOptionsFor } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/kinautocore.js';

test('every tuning has one default choice and options the engine knows', () => {
    for (const t of PROGRAMME_TUNING) {
        assert.equal(t.choices.filter(c => c.id === 'default').length, 1, t.key);
        assert.ok(!t.choices.find(c => c.id === 'default').value, `${t.key}: the default changes nothing`);
        for (const c of t.choices) for (const k of Object.keys(c.value || {})) assert.ok(k in PROGRAMME_DEFAULTS, `${t.key}.${c.id}: ${k}`);
        assert.equal(new Set(t.choices.map(c => c.id)).size, t.choices.length, `${t.key}: ids repeat`);
    }
});

test('normalizeTuning keeps known keys and choices, drops defaults and junk', () => {
    assert.deepEqual(normalizeTuning({ relatedPenalty: 'allow', lineBonus: 'default', bogus: 'x', spareOut: 'nope' }), { relatedPenalty: 'allow' });
    assert.deepEqual(normalizeTuning(null), {});
    assert.deepEqual(normalizeTuning(['allow']), {});
});

test('applyTuning puts the choices on top, the rest untouched', () => {
    const base = { moveCost: 0.08, useTradeCentre: true, maxEvaluations: 3000000, timeBudgetMs: 6000 };
    assert.deepEqual(applyTuning(base, null), base);
    const o = applyTuning(base, { moveCost: 'free', search: 'quick', spareOut: 'stay', defaultCapacity: '12' });
    assert.equal(o.moveCost, 0);
    assert.equal(o.maxEvaluations, 600000);
    assert.equal(o.timeBudgetMs, 1500);
    assert.equal(o.spareOut, false);
    assert.equal(o.defaultCapacity, 12);
    assert.equal(o.useTradeCentre, true);
    assert.equal(base.moveCost, 0.08, 'the input is not changed');
});

test('tuningKey is stable and empty for the defaults', () => {
    assert.equal(tuningKey({}), '');
    assert.equal(tuningKey({ lineBonus: 'default' }), '');
    assert.equal(tuningKey({ spareOut: 'stay', lineBonus: 'off' }), tuningKey({ lineBonus: 'off', spareOut: 'stay' }));
    assert.equal(tuningCount({ spareOut: 'stay', lineBonus: 'off', x: 1 }), 2);
    assert.equal(tuningChoice({}, 'relatedPenalty').id, 'default');
    assert.equal(tuningChoice({ relatedPenalty: 'avoid' }, 'relatedPenalty').label, 'Avoid');
});

test('Breeding goal: Average young by default, Push the ceiling sets goal', () => {
    assert.equal(tuningChoice({}, 'goal').label, 'Average young');
    assert.equal(tuningGoal(null), 'average');
    assert.equal(tuningGoal({ goal: 'default' }), 'average');
    assert.equal(tuningGoal({ goal: 'nope' }), 'average');
    assert.equal(tuningGoal({ goal: 'ceiling' }), 'ceiling');
    assert.equal(applyTuning({}, { goal: 'ceiling' }).goal, 'ceiling');
    assert.equal(PROGRAMME_DEFAULTS.goal, 'average');
    assert.equal(tuningKey({ goal: 'ceiling' }), 'goal=ceiling', 'part of the plans\' cache key');
});

test('Who counts as related: the family tree by default; Thin out gets the goal and the rule', () => {
    assert.equal(tuningChoice({}, 'kinRule').label, 'Family tree');
    assert.equal(applyTuning({}, { kinRule: 'genes' }).kinRule, 'genes');
    assert.equal(PROGRAMME_DEFAULTS.kinRule, 'pedigree');
    assert.deepEqual(tuningCull(null), { goal: 'average', kinRule: 'pedigree', pairs: 'normal' });
    assert.deepEqual(tuningCull({ kinRule: 'genes', goal: 'ceiling' }), { goal: 'ceiling', kinRule: 'genes', pairs: 'normal' });
    assert.deepEqual(tuningCull({ kinRule: 'nope', bondBreakCost: 'nope' }), { goal: 'average', kinRule: 'pedigree', pairs: 'normal' });
    // splitting a bonded pair: Thin out's PAIR_STEPS ids
    for (const id of ['free', 'low', 'high', 'never']) assert.equal(tuningCull({ bondBreakCost: id }).pairs, id);
});

test('Strand bonus: off on the board unless chosen; Auto mode plans with its own unless chosen', () => {
    assert.equal(PROGRAMME_DEFAULTS.strandBonus, 0);
    assert.equal(PROGRAMME_DEFAULTS.strandGate, 0.5);
    assert.equal(tuningChoice({}, 'strandBonus').id, 'default');
    assert.equal('strandBonus' in applyTuning({ moveCost: 0 }, {}), false, 'the board: nothing added');
    assert.deepEqual(['low', 'mid', 'high'].map(id => applyTuning({}, { strandBonus: id }).strandBonus), [0.1, 0.25, 0.4]);
    assert.equal(tuningKey({ strandBonus: 'mid' }), 'strandBonus=mid', 'part of the plans\' cache key');
    const settings = { step: 3, trade: true };
    const auto = programmeOptionsFor(settings, 'auto', null);
    assert.equal(auto.strandBonus || 0, AUTO_STRAND_BONUS);
    if (!AUTO_STRAND_BONUS) assert.equal('strandBonus' in auto, false, 'off: Auto mode\'s options as before');
    assert.equal(programmeOptionsFor(settings, 'auto', null, { strandBonus: 'high' }).strandBonus, 0.4);
    // never Thin out's (a keep value with it lowered Immunity, 2026-10-28)
    assert.deepEqual(tuningCull({ strandBonus: 'high' }), tuningCull({}));
});

test('Auto mode applies the tuning on top of its own search budget', () => {
    const settings = { step: 3, trade: true };
    const plain = programmeOptionsFor(settings, 'auto', null);
    assert.equal(plain.relatedPenalty, undefined);
    const tuned = programmeOptionsFor(settings, 'auto', null, { relatedPenalty: 'allow', search: 'long' });
    assert.equal(tuned.relatedPenalty, 0);
    assert.equal(tuned.maxEvaluations, 10000000);
    assert.equal(tuned.moveCost, plain.moveCost);
});
