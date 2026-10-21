// Best strands: how far breeding can raise a species' Size (the game shows
// it as Vitality) and Longevity. Pure, no game imports (Node tests).
//
// A young takes one whole strand per gene from each parent (kincore.js
// predictOffspring). Size and Longevity count the good letters (A, B) on
// both strands, so a young's expected Size and Longevity are always its
// parents' average: pairing alone can't raise them, only stacking the best
// strands can. Fertility and Immunity count the loci where the young's two
// strands differ, so they are not passed on as scores.
//
//   strand value  its good letters, 0..6
//   best          the species' highest strand value per gene, over the
//                 animals present that are not past breeding (juveniles
//                 included)
//   copies        an animal's strands at that value: 0, 1 or 2
//   carrier       an animal not past breeding with at least one copy
//   ceiling       (2 x best Size + 2 x best Longevity + 12 + 12) / 48: the
//                 best young the strands present allow
//
// From parents with c1 and c2 copies a young gets two copies with chance
// c1/2 x c2/2. The "Push the ceiling" goal (kinprogtune.js) scores a pair by
// its best young (youngUpside) instead of its average one
// (kinprogramme.js), and Thin out keeps the carriers (kincull.js). Mutation
// (about 1% per letter) is left out.
import { Sex, offspringTwelfths, ownGrades, strandGood } from './kincore.js';

export const STRAND_GENES = Object.freeze(['S', 'L']);
// the game's names for the two genes (Size is Vitality in game)
export const STRAND_LABEL = Object.freeze({ S: 'V', L: 'L' });
export const STRAND_NAME = Object.freeze({ S: 'Vitality', L: 'Longevity' });

// The species' fertility ages: the game's (info), else the kin snapshot's.
function withAges(model, species, info) {
    if (info && info.fertilityAges) return info;
    const facts = model && model.speciesFacts && model.speciesFacts[species];
    if (!facts || facts.maturity == null) return info || {};
    return Object.assign({}, info, { fertilityAges: { maturity: facts.maturity, infertility: facts.infertility } });
}

// Too old, or an infertile adult that is not merely young: its strands can
// no longer reach a young. Contraception can be lifted, so it does not count.
export function pastBreeding(a, info = {}) {
    if (!a) return true;
    const st = a.fert && a.fert.state;
    if (st === 'old' || st === 'sterile') return true;
    if (a.infertile && !a.juv && st !== 'young' && st !== 'juvenile') return true;
    const b = info.fertilityAges;
    return !!(b && typeof a.age === 'number' && b.infertility != null && b.infertility < 900 && a.age >= b.infertility);
}

// One species' strands:
// { species, best: { S, L } (0..6, null: no gene data), ceiling (0..1 or
//   null), copies: Map(id -> { S, L } (0..2, null: no data)), carriers:
//   { S: [animal], L: [animal] }, sole: { S, L } (the only carrier or null),
//   past: Set(id) (past breeding) }
// Copies are counted for every animal present; only those not past
// breeding set the best and are carriers.
export function speciesStrands(model, species, info = {}) {
    const out = { species, best: { S: null, L: null }, ceiling: null, copies: new Map(), carriers: { S: [], L: [] }, sole: { S: null, L: null }, past: new Set() };
    if (!model || !model.animals || !species) return out;
    const ix = withAges(model, species, info);
    const all = Array.from(model.animals.values()).filter(a => a.species === species && !a.exhibit && a.alive !== false);
    const vals = new Map();
    for (const a of all) {
        const v = { S: strandGood(a.genes, 'S'), L: strandGood(a.genes, 'L') };
        vals.set(a.id, v);
        if (pastBreeding(a, ix)) {
            out.past.add(a.id);
            continue;
        }
        for (const k of STRAND_GENES) if (v[k]) out.best[k] = Math.max(out.best[k] == null ? 0 : out.best[k], v[k][0], v[k][1]);
    }
    for (const a of all) {
        const v = vals.get(a.id);
        const c = {};
        for (const k of STRAND_GENES) c[k] = v[k] && out.best[k] != null ? (v[k][0] >= out.best[k] ? 1 : 0) + (v[k][1] >= out.best[k] ? 1 : 0) : null;
        out.copies.set(a.id, c);
        if (out.past.has(a.id)) continue;
        for (const k of STRAND_GENES) if (c[k] > 0) out.carriers[k].push(a);
    }
    for (const k of STRAND_GENES) out.sole[k] = out.carriers[k].length === 1 ? out.carriers[k][0] : null;
    if (out.best.S != null && out.best.L != null) out.ceiling = (2 * out.best.S + 2 * out.best.L + 24) / 48;
    return out;
}

// The copies that can still reach a young: none past breeding. { S, L } or null.
export function usefulCopies(stats, a) {
    const c = stats && a ? stats.copies.get(a.id) : null;
    if (!c) return null;
    return stats.past.has(a.id) ? { S: 0, L: 0 } : c;
}

// "V2 L1" ('' without gene data).
export function copiesText(c) {
    if (!c) return '';
    return STRAND_GENES.filter(k => c[k] != null).map(k => `${STRAND_LABEL[k]}${c[k]}`).join(' ');
}

// "Ceiling 87% · best V 5/6 (3 carry) · L 4/6 (only Fola)" ('' without gene
// data). The percentage is rounded down, as the game shows genes.
export function ceilingText(stats) {
    if (!stats || stats.ceiling == null) return '';
    const part = k => {
        const n = stats.carriers[k].length;
        const who = stats.sole[k] ? `only ${stats.sole[k].name || 'one'}` : `${n} carry`;
        return `${STRAND_LABEL[k]} ${stats.best[k]}/6 (${who})`;
    };
    return `Ceiling ${Math.floor(stats.ceiling * 100 + 1e-9)}% · best ${part('S')} · ${part('L')}`;
}

// x has at least y's copies of each best strand and more of one.
export function outclasses(x, y) {
    if (!x || !y || STRAND_GENES.some(k => x[k] == null || y[k] == null)) return false;
    return STRAND_GENES.every(k => x[k] >= y[k]) && STRAND_GENES.some(k => x[k] > y[k]);
}

// What an animal passes on (0..1, null without gene data): the young it
// would have with a partner like itself on its better Size and Longevity
// strands (2 x the better strand / 12 each), and its own Fertility grade
// (conception uses it). Not its Immunity or its own average: those are not
// passed on as scores.
export function breedingValue(a) {
    const g = a && a.genes;
    const parts = [];
    for (const k of STRAND_GENES) {
        const v = strandGood(g, k);
        if (v) parts.push(2 * Math.max(v[0], v[1]) / 12);
    }
    const f = ownGrades(g).fertility;
    if (typeof f === 'number') parts.push(f);
    return parts.length ? parts.reduce((s, v) => s + v, 0) / parts.length : null;
}

// The carriers that must stay, from `animals` (the ones in habitats): per
// best strand the last two, one of each sex where possible (like Thin out's
// keepBest), the most copies first, then both strands, then breeding now.
// -> Map(id -> reason)
export function carrierKeepers(stats, animals, breedsNow = () => true) {
    const out = new Map();
    if (!stats) return out;
    for (const k of STRAND_GENES) {
        if (stats.best[k] == null) continue;
        const list = (animals || []).filter(a => !stats.past.has(a.id) && (stats.copies.get(a.id) || {})[k] > 0);
        const total = a => {
            const c = stats.copies.get(a.id);
            return (c.S || 0) + (c.L || 0);
        };
        list.sort((x, y) => stats.copies.get(y.id)[k] - stats.copies.get(x.id)[k] || total(y) - total(x)
            || (breedsNow(y) ? 1 : 0) - (breedsNow(x) ? 1 : 0) || (String(x.id) < String(y.id) ? -1 : String(x.id) > String(y.id) ? 1 : 0));
        const male = list.find(a => a.sex === Sex.Male);
        const female = list.find(a => a.sex === Sex.Female);
        const pick = male && female ? [male, female] : list.slice(0, 2);
        const why = `carries the best ${STRAND_NAME[k]} strand (${stats.best[k]}/6)`;
        for (const a of pick) if (!out.has(a.id)) out.set(a.id, why);
    }
    return out;
}

// The young's four-gene average (the genes with data on both sides) over
// every equally likely outcome: one strand per gene from each parent, 4 per
// gene, genes independent (4^4 = 256). -> [count per twelfth of the summed
// genes] and the number of genes, or null.
export function youngDistribution(m, f) {
    const per = offspringTwelfths(m && m.genes, f && f.genes);
    const genes = per ? Object.values(per) : [];
    if (!genes.length) return null;
    let dist = [1];
    for (const vals of genes) {
        const next = new Array(dist.length + 12).fill(0);
        for (let s = 0; s < dist.length; s++) {
            if (dist[s]) for (const v of vals) next[s + v] += dist[s];
        }
        dist = next;
    }
    return { dist, genes: genes.length, total: Math.pow(4, genes.length) };
}

// A pair's best young (0..1): the mean of the best quarter of those
// outcomes (64 of 256). 0.5 without gene data, like youngQuality.
export function youngUpside(m, f) {
    const d = youngDistribution(m, f);
    if (!d) return 0.5;
    const quarter = d.total / 4;
    let want = quarter, sum = 0;
    for (let s = d.dist.length - 1; s >= 0 && want > 0; s--) {
        const take = Math.min(want, d.dist[s]);
        sum += take * s;
        want -= take;
    }
    return sum / quarter / (12 * d.genes);
}
