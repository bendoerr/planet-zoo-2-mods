// Gene names for storage animals: the pure parts (Node tests). A gene name
// puts the scores around the animal's own name, so the storage list shows
// (and sorts by) them:
//
//   <gene score><breeder score> <name> <Vitality><Longevity>
//   "7987 Monifa 5858": gene score 79, breeder score 87, V 58, L 58
//
// Gene and breeder score as the mod's badges show them (scores.js); V and L
// rounded down, as the game shows genes. Each number is two digits (100
// shows as 99), so every gene name has the same shape and a name that has
// it already is left alone. The game takes at most 30 characters and no
// "|" (InfoPanelContainer.js maxInputLength 30, InputFieldBase.js).
import { breederScore, geneScore } from './scores.js';

export const NAME_MAX = 30;
// "dddd <name> dddd"
export const GENE_NAME = /^\d{4} .+ \d{4}$/;
const NUMBERS_LEN = 10;  // "dddd " + " dddd"

const two = n => String(Math.max(0, Math.min(99, n))).padStart(2, '0');
const pct = v => Math.floor(v * 100 + 1e-6);
const isNum = v => typeof v === 'number' && isFinite(v);

// The text of a name the player gave ("[STRING_LITERAL:Value=|Monifa|]"),
// or null for anything else (the game's own name key).
export function literalName(raw) {
    const m = /^\[STRING_LITERAL:Value=\|(.*)\|\]$/.exec(String(raw == undefined ? '' : raw));
    return m ? m[1] : null;
}

export function hasGeneName(name) {
    return GENE_NAME.test(String(name == undefined ? '' : name).trim());
}

// The name part: no "|", single spaces, cut so the whole name fits.
export function baseName(name) {
    const s = String(name == undefined ? '' : name).replace(/\|/g, '').replace(/\s+/g, ' ').trim();
    return s.slice(0, NAME_MAX - NUMBERS_LEN).trim();
}

// The gene name for one storage animal (readAnimal shape), or null when its
// genes don't give all four numbers (shoals, exhibit animals: no Vitality).
// shown: the name as the game shows it (translated).
export function geneName(a, shown) {
    if (!a || a.isShoal || a.isExhibit) return null;
    const g = a.genes || {};
    const gene = geneScore(a), breeder = breederScore(a);
    if (gene == null || breeder == null || !isNum(g.size) || !isNum(g.longevity)) return null;
    const base = baseName(shown);
    if (!base) return null;
    return `${two(gene)}${two(breeder)} ${base} ${two(pct(g.size))}${two(pct(g.longevity))}`;
}

// A park animal's gene grades (kincore.js ownGrades: twelfths and sixths)
// as the game sends them, 32-bit, so the scores round as the badges do
// ("7987": 0.875 as the game's float rounds to 87, not 88).
export function gameGrades(g) {
    const out = {};
    for (const k of ['size', 'longevity', 'fertility', 'immunity']) {
        if (g && isNum(g[k])) out[k] = Math.fround(g[k]);
    }
    return out;
}

// What a click would rename among these animals: { items: [{ a, from, to }],
// named (already a gene name), nogenes (no gene name possible), noname (no
// name to keep) }. nameOf(a): the name as the game shows it.
export function planRenames(animals, nameOf = a => a.name) {
    const out = { items: [], named: 0, nogenes: 0, noname: 0 };
    for (const a of animals || []) {
        const from = String(nameOf(a) ?? '').trim();
        if (!from) {
            out.noname++;
            continue;
        }
        if (hasGeneName(from)) {
            out.named++;
            continue;
        }
        const to = geneName(a, from);
        if (!to) {
            out.nogenes++;
            continue;
        }
        out.items.push({ a, from, to });
    }
    return out;
}

// The engine's job (pz2qol.lister.lua, mode "rename"): "v1 <paceMs> rename",
// then "<guid> <key> <name>" per animal, the name percent-encoded (no
// spaces). rows: [{ guid, key, to }]; rows without a usable id are left out.
export function encodeRenameJob(rows, { paceMs = 3000 } = {}) {
    const lines = [`v1 ${Math.max(1000, Math.round(paceMs))} rename`];
    const items = [];
    for (const r of rows || []) {
        if (!r.guid || !/^[A-Za-z0-9_.:-]+$/.test(String(r.guid)) || !/^[A-Za-z0-9_]+$/.test(String(r.key)) || !r.to) continue;
        lines.push(`${r.guid} ${r.key} ${encodeURIComponent(r.to)}`);
        items.push(r);
    }
    return { text: lines.join('\n'), items };
}

// "Renamed 35 of 37" (+ why the others were not), for a run's card.
export function renameSummary(state) {
    if (!state || !Array.isArray(state.results)) return '';
    const done = state.results.filter(r => r.status === 'renamed').length;
    const named = state.results.filter(r => r.kind === 'named').length;
    const other = state.results.filter(r => r.status !== 'renamed' && r.kind !== 'named' && r.status !== 'pending' && r.status !== 'working').length;
    const bits = [`Renamed ${done} of ${state.results.length}`];
    if (named) bits.push(`${named} had the name already`);
    if (other) bits.push(`${other} not renamed`);
    return bits.join(' · ');
}
