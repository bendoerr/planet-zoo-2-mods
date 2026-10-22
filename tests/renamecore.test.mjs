// node --test tests/renamecore.test.mjs
// Gene names for storage animals (renamecore.js): the name, what is left
// alone, the engine's job text and the run's summary.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GENE_NAME, NAME_MAX, baseName, encodeRenameJob, geneName, hasGeneName, literalName, planRenames, renameSummary } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/renamecore.js';
import { breederScore, geneScore } from '../mods/PZ2QoL/UI/UIGameface/js/mods/pz2qol/scores.js';

// the game sends genes as 32-bit floats
const f32 = v => Math.fround(v);
const animal = (v, l, f, i, over = {}) => Object.assign({ key: 'animal_1', genes: { size: f32(v), longevity: f32(l), fertility: f32(f), immunity: f32(i) } }, over);

test('gene name: gene score, breeder score, the name, V and L, two digits each', () => {
    // the developer's examples
    const monifa = animal(7 / 12, 7 / 12, 1, 1);
    assert.equal(geneScore(monifa), 79);
    assert.equal(breederScore(monifa), 87);
    assert.equal(geneName(monifa, 'Monifa'), '7987 Monifa 5858');
    assert.equal(geneName(animal(9 / 12, 6 / 12, 5 / 6, 1), 'Olabisi'), '7778 Olabisi 7550');
    // V and L rounded down, as the game shows them (8/12 = 66.7 shows 66)
    assert.match(geneName(animal(8 / 12, 11 / 12, 1, 1), 'Ada'), / Ada 6691$/);
    // a single digit gets a leading zero; 100 shows as 99 (the shape stays)
    assert.equal(geneName(animal(1 / 12, 1, 0, 0), 'Low'), `${String(geneScore(animal(1 / 12, 1, 0, 0))).padStart(2, '0')}${String(breederScore(animal(1 / 12, 1, 0, 0))).padStart(2, '0')} Low 0899`);
    assert.equal(geneName(animal(1, 1, 1, 1), 'Max'), '9999 Max 9999');
    assert.ok(GENE_NAME.test(geneName(animal(0, 0, 0, 0), 'Zero')));
});

test('gene name: none without the four genes, for shoals and exhibit animals, or without a name', () => {
    assert.equal(geneName(animal(0.5, 0.5, 0.5, 0.5, { isShoal: true }), 'Fish'), null);
    assert.equal(geneName(animal(0.5, 0.5, 0.5, 0.5, { isExhibit: true }), 'Frog'), null);
    assert.equal(geneName({ genes: { longevity: 0.5, fertility: 0.5, immunity: 0.5 } }, 'NoV'), null);
    assert.equal(geneName(animal(0.5, 0.5, 0.5, 0.5), '   '), null);
    assert.equal(geneName(null, 'x'), null);
});

test('gene name: fits the game\'s 30 characters, no "|", single spaces', () => {
    const long = geneName(animal(0.5, 0.5, 0.5, 0.5), 'Abcdefghijklmnopqrstuvwxyz Long');
    assert.ok(long.length <= NAME_MAX, long);
    assert.ok(GENE_NAME.test(long), long);
    assert.equal(baseName('  Mon|ifa   Two  '), 'Monifa Two');
    assert.equal(baseName('A'.repeat(40)).length, NAME_MAX - 10);
    assert.equal(baseName(undefined), '');
});

test('the pattern: names that have it are left alone', () => {
    assert.ok(hasGeneName('7987 Monifa 5858'));
    assert.ok(hasGeneName(' 7778 Olabisi Two 7550 '));
    assert.ok(!hasGeneName('Monifa'));
    assert.ok(!hasGeneName('798 Monifa 5858'));
    assert.ok(!hasGeneName('7987 Monifa'));
    assert.ok(!hasGeneName('7987  5858'.replace('  ', ' ')));
    assert.ok(!hasGeneName(undefined));
});

test('plan: what a click renames, what it leaves', () => {
    const rows = [
        animal(7 / 12, 7 / 12, 1, 1, { key: 'animal_1', name: 'Monifa' }),
        animal(0.5, 0.5, 0.5, 0.5, { key: 'animal_2', name: '7987 Old 5858' }),
        animal(0.5, 0.5, 0.5, 0.5, { key: 'animal_3', name: 'Fish', isShoal: true }),
        animal(9 / 12, 6 / 12, 5 / 6, 1, { key: 'animal_4', name: '[AnimalNames_X_00001]' }),
    ];
    const plan = planRenames(rows, a => (a.name === '[AnimalNames_X_00001]' ? 'Olabisi' : a.name));
    assert.deepEqual(plan.items.map(i => [i.a.key, i.from, i.to]), [['animal_1', 'Monifa', '7987 Monifa 5858'], ['animal_4', 'Olabisi', '7778 Olabisi 7550']]);
    assert.equal(plan.named, 1);
    assert.equal(plan.nogenes, 1);
    assert.deepEqual(planRenames([]), { items: [], named: 0, nogenes: 0, noname: 0 });
    assert.equal(planRenames([animal(0.5, 0.5, 0.5, 0.5, { name: '' })]).noname, 1);
    assert.equal(literalName('[STRING_LITERAL:Value=|7987 Monifa 5858|]'), '7987 Monifa 5858');
    assert.equal(literalName('[AnimalNames_X_00001]'), null);
});

test('job: the rename mode, one line per animal, the name percent-encoded', () => {
    const { text, items } = encodeRenameJob([
        { guid: '4501', key: 'animal_1', to: '7987 Monifa 5858' },
        { guid: 'fp3', key: 'animal_2', to: '7778 Olabisí 7550' },
        { guid: '', key: 'animal_3', to: 'x' },
        { guid: 'bad guid', key: 'animal_4', to: 'x' },
        { guid: '9', key: 'animal_5', to: '' },
    ], { paceMs: 2500 });
    assert.equal(text, 'v1 2500 rename\n4501 animal_1 7987%20Monifa%205858\nfp3 animal_2 7778%20Olabis%C3%AD%207550');
    assert.equal(items.length, 2);
    // the pace is at least 1 s
    assert.match(encodeRenameJob([], { paceMs: 10 }).text, /^v1 1000 rename$/);
});

test('summary: renamed, already named, not renamed', () => {
    const s = { results: [{ status: 'renamed' }, { status: 'renamed' }, { status: 'skipped', kind: 'named' }, { status: 'unconfirmed', kind: 'unconfirmed' }, { status: 'pending' }] };
    assert.equal(renameSummary(s), 'Renamed 2 of 5 · 1 had the name already · 1 not renamed');
    assert.equal(renameSummary(null), '');
});
