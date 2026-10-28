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
// (1% per letter, to a random other letter) is left out.
//
// The goal waits (ceilingWaiting) while the herd's mean is far below its
// ceiling: there the limit is how fast good strands spread, and breeding for
// the average young does better (a simulation of the owner's herds,
// 2026-10-21: the ceiling goal lowered the herd's mean by 2-8 points over 20
// years while it was 23-35 points below).
import { Sex, geneStrands, offspringTwelfths, ownGrades, strandGood } from './kincore.js';
import { speciesId } from './speciesnamecore.js';

// 'ceiling' waits while the herd's mean is more than this below the ceiling
export const CEILING_WITHIN = 0.05;

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
//   past: Set(id) (past breeding), mean (the herd's own gene average 0..1,
//   null: no gene data), iStrands: [{ id, s }] (Immunity strands) }
// Copies are counted for every animal present; only those not past
// breeding set the best, are carriers and count for the mean and iStrands.
export function speciesStrands(model, species, info = {}) {
    const out = { species, best: { S: null, L: null }, ceiling: null, copies: new Map(), carriers: { S: [], L: [] }, sole: { S: null, L: null }, past: new Set(), mean: null, iStrands: [] };
    if (!model || !model.animals || !species) return out;
    const ix = withAges(model, species, info);
    const all = Array.from(model.animals.values()).filter(a => a.species === species && !a.exhibit && a.alive !== false);
    const vals = new Map();
    let sum = 0, n = 0;
    for (const a of all) {
        const v = { S: strandGood(a.genes, 'S'), L: strandGood(a.genes, 'L') };
        vals.set(a.id, v);
        if (pastBreeding(a, ix)) {
            out.past.add(a.id);
            continue;
        }
        for (const k of STRAND_GENES) if (v[k]) out.best[k] = Math.max(out.best[k] == null ? 0 : out.best[k], v[k][0], v[k][1]);
        const g = Object.values(ownGrades(a.genes));
        if (g.length) {
            sum += g.reduce((x, y) => x + y, 0) / g.length;
            n++;
        }
        const im = geneStrands(a.genes, 'I');
        if (im) for (const s of im) out.iStrands.push({ id: a.id, s });
    }
    out.mean = n ? sum / n : null;
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

// The Immunity its young would have with the herd (0..1, null without
// data): how far its two Immunity strands differ, locus by locus, from the
// other animals' strands (stats.iStrands), on average. Immunity is not passed
// on as a score; strands unlike the herd's are what keep the young immune.
export function youngImmunity(stats, a) {
    const own = a ? geneStrands(a.genes, 'I') : null;
    if (!own || !stats || !stats.iStrands) return null;
    let sum = 0, n = 0;
    for (const s of own) {
        for (const o of stats.iStrands) {
            if (o.id === a.id) continue;
            let d = 0;
            for (let i = 0; i < 6; i++) if (s[i] !== o.s[i]) d++;
            sum += d / 6;
            n++;
        }
    }
    return n ? sum / n : null;
}

// What an animal passes on (0..1, null without gene data): the young it
// would have with a partner like itself on its better Size and Longevity
// strands (2 x the better strand / 12 each), its own Fertility grade
// (conception uses it), and the Immunity of its young with the herd
// (youngImmunity; without stats, its own Immunity grade). Not its own
// average. (Without Immunity, Thin out let the herd's Immunity fall to
// 54-72% in a simulation of the owner's herds, 2026-10-21.)
export function breedingValue(a, stats = null) {
    const g = a && a.genes;
    const parts = [];
    for (const k of STRAND_GENES) {
        const v = strandGood(g, k);
        if (v) parts.push(2 * Math.max(v[0], v[1]) / 12);
    }
    const own = ownGrades(g);
    if (typeof own.fertility === 'number') parts.push(own.fertility);
    const im = stats ? youngImmunity(stats, a) : null;
    if (im != null) parts.push(im);
    else if (typeof own.immunity === 'number') parts.push(own.immunity);
    return parts.length ? parts.reduce((s, v) => s + v, 0) / parts.length : null;
}

// The ceiling goal waits while the herd's mean is more than `within` below
// the ceiling (no gene data: it does not wait).
export function ceilingWaiting(stats, within = CEILING_WITHIN) {
    return !!(stats && stats.ceiling != null && stats.mean != null && stats.ceiling - stats.mean > within + 1e-9);
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

// Whether `a` is the last carrier of a best strand among `staying` (the
// animals in habitats that stay; `a` itself left out): what the game's most
// per sex may not send away, so the strand stays in the zoo. -> the reason,
// or ''.
export function lastCarrier(stats, a, staying) {
    if (!stats || stats.past.has(a.id)) return '';
    const mine = stats.copies.get(a.id) || {};
    for (const k of STRAND_GENES) {
        if (stats.best[k] == null || !(mine[k] > 0)) continue;
        const other = staying.some(b => b.id !== a.id && !stats.past.has(b.id) && (stats.copies.get(b.id) || {})[k] > 0);
        if (!other) return `the last carrier of the best ${STRAND_NAME[k]} strand (${stats.best[k]}/6)`;
    }
    return '';
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

// ----------------------------------------- better strands elsewhere
//
// Animals outside the herd (on the market, in Animal Storage, waiting at the
// trade centre) that carry a better Size or Longevity strand than any animal
// in the herd's habitats: the only way to raise its ceiling (the developer,
// 2026-10-28: no wild dog had a Longevity strand above 5/6, and the market
// shows only the grades). strandmark.js keeps the herd's best for the hub,
// where the park is not loaded; badges.js and kinboard.js show the marks.

// The herd's best strands per species: the animals in a habitat (not
// waiting at the trade centre, not stored) that are not past breeding,
// juveniles included. -> Map(species id -> { S, L, n }) (0..6; species
// without gene data left out).
export function herdBest(model) {
    const out = new Map();
    if (!model || !model.animals) return out;
    const ages = new Map();
    for (const a of model.animals.values()) {
        if (!a.species || a.exhibit || a.alive === false || a.stored || !a.hab || a.lt === 'trade') continue;
        if (!ages.has(a.species)) ages.set(a.species, withAges(model, a.species, {}));
        if (pastBreeding(a, ages.get(a.species))) continue;
        const s = strandGood(a.genes, 'S'), l = strandGood(a.genes, 'L');
        if (!s || !l) continue;
        const key = speciesId(a.species);
        const b = out.get(key) || { S: 0, L: 0, n: 0 };
        b.S = Math.max(b.S, s[0], s[1]);
        b.L = Math.max(b.L, l[0], l[1]);
        b.n++;
        out.set(key, b);
    }
    return out;
}

// A gene's two strands as good letters (A, B) each, from the game's
// genetic identity: six loci, each written as strand A's letter then strand
// B's ("[STRING_LITERAL:Value=|AC|]": GenealogyPopup.getAnimalToleranceBarData
// writes tGenes[i] .. tGenes[i + 6]). -> [a, b] (0..6), or null when a locus
// is missing or unknown ('?').
export function strandsFromLoci(loci) {
    if (!Array.isArray(loci) || loci.length !== 6) return null;
    let a = 0, b = 0;
    for (const raw of loci) {
        const s = String(raw == null ? '' : raw);
        const m = /\|([A-Za-z])([A-Za-z])\|/.exec(s) || /^\s*([A-Za-z])([A-Za-z])\s*$/.exec(s);
        if (!m) return null;
        if (/[AB]/.test(m[1].toUpperCase())) a++;
        if (/[AB]/.test(m[2].toUpperCase())) b++;
    }
    return [a, b];
}

// An animal's best strands against the herd's (best: { S, L }), per gene:
// { value, exact, beats, best }. From its strands ([a, b]) when known: its
// better strand. Else from its grade alone (0..1, as the game shows it):
// t twelfths of good letters on both strands mean the better strand has at
// least ceil(t / 2) (not exact; it may be more). beats: better for sure.
// own: { S, L } strands or null; grades: { S, L } or null.
export function strandEdge(own, grades, best) {
    const out = {};
    for (const k of STRAND_GENES) {
        const b = best ? best[k] : null;
        if (typeof b !== 'number') continue;
        const s = own && own[k];
        if (s) {
            const v = Math.max(s[0], s[1]);
            out[k] = { value: v, exact: true, beats: v > b, best: b };
            continue;
        }
        const g = grades ? grades[k] : null;
        if (typeof g !== 'number' || !isFinite(g)) continue;
        const v = Math.ceil(Math.round(Math.max(0, Math.min(1, g)) * 12) / 2);
        out[k] = { value: v, exact: false, beats: v > b, best: b };
    }
    return out;
}

// "L6", "V6 L5+" (+: at least, from the grade alone); '' when it beats none.
// labels: per gene (the market badge's "V" is its value: Vit, Long there).
export function strandEdgeText(edge, labels = STRAND_LABEL) {
    return STRAND_GENES.filter(k => edge && edge[k] && edge[k].beats).map(k => `${labels[k]}${edge[k].value}${edge[k].exact ? '' : '+'}`).join(' ');
}

// The same in words, for a tooltip ('' when it beats none). where: the
// herd's zoo, or ''.
export function strandEdgeWords(edge, where = '') {
    const parts = STRAND_GENES.filter(k => edge && edge[k] && edge[k].beats).map(k => {
        const e = edge[k];
        return `a ${STRAND_NAME[k]} strand of ${e.exact ? '' : 'at least '}${e.value}/6 (your best: ${e.best}/6)`;
    });
    if (!parts.length) return '';
    return `Better than any in your herd${where ? ` at ${where}` : ''}: ${parts.join(' and ')}.`;
}

// The herd's best for the hub (prefs.js, at most maxChars of it):
// 'Dog_AfricanWild:65,Lion:54' (Size then Longevity), the species with
// the most animals first when it has to be cut.
export function encodeHerdBest(best, maxChars = 1500) {
    const list = Array.from(best || [], ([sp, b]) => ({ sp: speciesId(sp), b })).filter(x => x.sp && /^[A-Za-z0-9_]+$/.test(x.sp))
        .sort((x, y) => y.b.n - x.b.n || (x.sp < y.sp ? -1 : 1));
    const out = [];
    let len = 0;
    for (const { sp, b } of list) {
        const item = `${sp}:${b.S}${b.L}`;
        if (len + item.length + 1 > maxChars) break;
        out.push(item);
        len += item.length + 1;
    }
    return out.sort().join(',');
}

// -> Map(species id -> { S, L })
export function decodeHerdBest(text) {
    const out = new Map();
    for (const item of String(text || '').split(',')) {
        const m = /^([A-Za-z0-9_]+):([0-6])([0-6])$/.exec(item);
        if (m) out.set(m[1], { S: Number(m[2]), L: Number(m[3]) });
    }
    return out;
}
