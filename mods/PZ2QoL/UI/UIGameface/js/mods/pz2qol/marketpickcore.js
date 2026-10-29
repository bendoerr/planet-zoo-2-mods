// Market picks (experimental, off by default; Kin setting marketPicks): the
// market animals that would raise a herd the player keeps, and why. Pure, no
// game imports (Node tests).
//
// A young takes one whole strand per gene from each parent (kincore.js
// predictOffspring): its Vitality and Longevity are its parents' average,
// its Fertility and Immunity how far the two strands it got differ. So a
// market animal is worth what its young with the herd's best mate for it
// would be, against the young of the herd's own best pairs ("Pick +2.1": 2.1
// points better), plus a little for a Vitality or Longevity strand the herd
// lacks or has few copies of (it spreads over the generations; kinstrands.js).
// An animal near the end of its breeding years counts less.
//
// Park page (strandmark.js, only while the setting is on): per species in
// the zoo's habitats, the herd's facts go into the player-wide setting
// herdStrands (field mk, at most PICK_MAX_CHARS): how many pairs it breeds
// and their young per gene, its breeders and their copies of the best
// strands, its infertility age, and its best PICK_MATES mates of each sex.
// Hub page (badges.js, bars.js): each market row is scored against them.
//
// Market rows show the strands letter by letter (geneticIdentities: on all
// 24 rows of Helix's market copy, in game, 2026-10-20). Without them a row is
// scored from its percentages: Vitality and Longevity exactly (the young get
// the parents' average), Fertility and Immunity as the herd's pairs' young
// ("rough").
import { Sex, geneStrands, predictOffspring, strandGood } from './kincore.js';
import { breedingValue, pastBreeding, speciesStrands, STRAND_GENES, STRAND_NAME } from './kinstrands.js';
import { speciesId } from './speciesnamecore.js';

// best mates kept per sex and species (the simulation found 2 as good as 3
// or every breeder; 2 keep a zoo of 12 species in about 800 characters)
export const PICK_MATES = 2;
// a pick adds at least this to the young (0..1: 2 points; 1 point bought
// half as many again for the same gain in the simulation)
export const PICK_MIN = 0.02;
// weight of the best-strand copies an animal brings (strandPart): 0, so a
// pick is its young alone and the strands are only named. A simulation of
// the owner's herds (2026-10-28, 12 seeds, 25 years) gained nothing from
// 0.1 or 0.25 (dogs lost up to 1.4 points; hyenas within the noise).
export const PICK_STRAND_WEIGHT = 0;
// an animal with fewer breeding years left than this counts in proportion
export const PICK_FULL_YEARS = 2;
// the herd's facts in the player-wide setting (prefs.js caps all settings
// at 4000 characters; the herd's best strands take up to 1500 of them)
export const PICK_MAX_CHARS = 1000;

const GENES = ['size', 'longevity', 'fertility', 'immunity'];
const GENE_NAME = { size: 'Vitality', longevity: 'Longevity', fertility: 'Fertility', immunity: 'Immunity' };
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const LETTERS = 'ABCD';

// ------------------------------------------------------------ the herd

// The species' fertility ages for pastBreeding, from the kin snapshot.
function agesOf(model, species) {
    const f = model && model.speciesFacts && model.speciesFacts[species];
    return f && f.maturity != null ? { fertilityAges: { maturity: f.maturity, infertility: f.infertility } } : {};
}

function hasGenes(g) {
    return !!(g && strandGood(g, 'S') && strandGood(g, 'L') && geneStrands(g, 'F') && geneStrands(g, 'I'));
}

function twelfths(g, k) {
    const v = strandGood(g, k);
    return v ? v[0] + v[1] : null;
}

// The young's mean per gene (0..1) of a pair, or null.
function young(x, y) {
    const p = predictOffspring(x.genes, y.genes);
    if (!p || GENES.some(g => !p[g])) return null;
    const out = {};
    for (const g of GENES) out[g] = p[g].mean;
    return out;
}

function meanOf(v) {
    return GENES.reduce((s, g) => s + v[g], 0) / GENES.length;
}

function mateable(x, y) {
    return x.sex === Sex.Unisex || y.sex === Sex.Unisex || x.sex !== y.sex;
}

// The herd's best pairs: up to k pairs of adults, the best young first, no
// animal twice and none the game calls inbred. -> their young per gene
// (0..1) and pairs, or null.
export function benchYoung(model, breeders, k) {
    const adults = breeders.filter(a => !a.juv && !(a.fert && a.fert.state === 'young'));
    const cand = [];
    for (let i = 0; i < adults.length; i++) {
        for (let j = i + 1; j < adults.length; j++) {
            const x = adults[i], y = adults[j];
            if (!mateable(x, y)) continue;
            const rel = model && model.ped && x.guid && y.guid ? model.ped.relation(x.guid, y.guid) : null;
            if (rel && rel.game) continue;
            const v = young(x, y);
            if (v) cand.push({ x, y, v, m: meanOf(v) });
        }
    }
    cand.sort((p, q) => q.m - p.m);
    const used = new Set();
    const pick = [];
    for (const c of cand) {
        if (pick.length >= k) break;
        if (used.has(c.x.id) || used.has(c.y.id)) continue;
        used.add(c.x.id);
        used.add(c.y.id);
        pick.push(c);
    }
    if (!pick.length) return null;
    const out = { pairs: pick.length };
    for (const g of GENES) out[g] = pick.reduce((s, c) => s + c.v[g], 0) / pick.length;
    return out;
}

// Per species in the zoo's habitats (not the trade centre, not storage), the
// animals not past breeding with all four genes: -> Map(species id -> {
//   n (breeders), K (habitats with breeders: the pairs the herd breeds),
//   inf (infertility age in years, 0: none or unknown),
//   best: { S, L } (best strand 0..6), copies: { S, L } (strands at the best),
//   bench: { size, longevity, fertility, immunity, pairs } (the young of the
//     herd's best K pairs) or null,
//   mates: [{ sex, S, L (twelfths 0..12), F, I (12 letters) }] (the best
//     `mates` of each sex by breedingValue) }).
export function herdMarketFacts(model, { mates = PICK_MATES } = {}) {
    const out = new Map();
    if (!model || !model.animals) return out;
    const bySpecies = new Map();
    for (const a of model.animals.values()) {
        if (!a.species || a.exhibit || a.alive === false || a.stored || !a.hab || a.lt === 'trade') continue;
        if (!bySpecies.has(a.species)) bySpecies.set(a.species, []);
        bySpecies.get(a.species).push(a);
    }
    for (const [species, list] of bySpecies) {
        const info = agesOf(model, species);
        const breeders = list.filter(a => !pastBreeding(a, info) && hasGenes(a.genes));
        const key = speciesId(species);
        if (!breeders.length || !/^[A-Za-z0-9_]+$/.test(key)) continue;
        const best = { S: 0, L: 0 }, copies = { S: 0, L: 0 };
        for (const a of breeders) for (const k of STRAND_GENES) best[k] = Math.max(best[k], ...strandGood(a.genes, k));
        for (const a of breeders) for (const k of STRAND_GENES) copies[k] += strandGood(a.genes, k).filter(v => v >= best[k]).length;
        const stats = speciesStrands(model, species, info);
        const chosen = [];
        for (const sex of [Sex.Male, Sex.Female, Sex.Unisex]) {
            breeders.filter(a => a.sex === sex)
                .map(a => ({ a, v: breedingValue(a, stats) || 0 }))
                .sort((x, y) => y.v - x.v || (String(x.a.id) < String(y.a.id) ? -1 : 1))
                .slice(0, mates)
                .forEach(x => chosen.push(x.a));
        }
        const habs = new Set(breeders.map(a => a.hab));
        const f = model.speciesFacts && model.speciesFacts[species];
        const inf = f && typeof f.infertility === 'number' && f.infertility > 0 && f.infertility < 64 ? Math.round(f.infertility) : 0;
        out.set(key, {
            n: breeders.length, K: habs.size, inf, best, copies,
            bench: benchYoung(model, breeders, habs.size),
            mates: chosen.map(a => ({ sex: a.sex, S: twelfths(a.genes, 'S'), L: twelfths(a.genes, 'L'), F: strandText(a.genes, 'F'), I: strandText(a.genes, 'I') })),
        });
    }
    return out;
}

function strandText(g, k) {
    const s = geneStrands(g, k);
    return s ? s[0].join('') + s[1].join('') : '';
}

// --------------------------------------------------- the setting's text
//
// 'Dog_AfricanWild:<body>,Hyena_Spotted:<body>', each body in base-64
// characters (A-Z a-z 0-9 - _): K, inf, n (capped at 63), best S x 7 + best
// L, copies S, copies L, the bench's four genes in thousandths (two
// characters each; K 0: no bench), then 10 per mate: sex x 13 + S, L, and
// the 24 Fertility and Immunity letters at 2 bits each.

function enc(n, width = 1) {
    let v = Math.max(0, Math.min(Math.pow(64, width) - 1, Math.round(Number(n) || 0)));
    let s = '';
    for (let i = 0; i < width; i++) {
        s = B64[v % 64] + s;
        v = Math.floor(v / 64);
    }
    return s;
}

function dec(s, at, width = 1) {
    let v = 0;
    for (let i = 0; i < width; i++) {
        const d = B64.indexOf(s[at + i]);
        if (d < 0) return NaN;
        v = v * 64 + d;
    }
    return v;
}

function packLetters(text) {
    if (!/^[A-D]{24}$/.test(text)) return null;
    let s = '';
    for (let i = 0; i < 24; i += 3) s += B64[LETTERS.indexOf(text[i]) * 16 + LETTERS.indexOf(text[i + 1]) * 4 + LETTERS.indexOf(text[i + 2])];
    return s;
}

function unpackLetters(s) {
    let out = '';
    for (const c of s) {
        const v = B64.indexOf(c);
        out += LETTERS[v >> 4] + LETTERS[(v >> 2) & 3] + LETTERS[v & 3];
    }
    return out;
}

function encodeOne(f) {
    const b = f.bench;
    let s = enc(b ? f.K : 0) + enc(f.inf) + enc(f.n) + enc(f.best.S * 7 + f.best.L) + enc(f.copies.S) + enc(f.copies.L);
    for (const g of GENES) s += enc(b ? b[g] * 1000 : 0, 2);
    for (const m of f.mates) {
        const fi = packLetters(`${m.F}${m.I}`);
        if (fi == null || m.S == null || m.L == null) continue;
        s += enc(Math.min(2, m.sex) * 13 + m.S) + enc(m.L) + fi;
    }
    return s;
}

// The facts for the setting, at most maxChars: the species with the most
// breeders first when it has to be cut.
export function encodeMarketFacts(facts, maxChars = PICK_MAX_CHARS) {
    const list = Array.from(facts || [], ([sp, f]) => ({ sp, f })).filter(x => /^[A-Za-z0-9_]+$/.test(x.sp))
        .sort((x, y) => y.f.n - x.f.n || (x.sp < y.sp ? -1 : 1));
    const out = [];
    let len = 0;
    for (const { sp, f } of list) {
        const item = `${sp}:${encodeOne(f)}`;
        if (len + item.length + 1 > maxChars) continue;
        out.push(item);
        len += item.length + 1;
    }
    return out.sort().join(',');
}

// -> Map(species id -> facts as herdMarketFacts gives them; bench null when
// the herd has no pair). Broken items are left out.
export function decodeMarketFacts(text) {
    const out = new Map();
    for (const item of String(text || '').split(',')) {
        const m = /^([A-Za-z0-9_]+):([A-Za-z0-9_-]+)$/.exec(item);
        if (!m || (m[2].length - 14) % 10 !== 0 || m[2].length < 14) continue;
        const s = m[2];
        const K = dec(s, 0), bs = dec(s, 3);
        const f = { n: dec(s, 2), K, inf: dec(s, 1), best: { S: Math.floor(bs / 7), L: bs % 7 }, copies: { S: dec(s, 4), L: dec(s, 5) }, bench: null, mates: [] };
        if (K > 0) {
            f.bench = { pairs: K };
            GENES.forEach((g, i) => { f.bench[g] = dec(s, 6 + 2 * i, 2) / 1000; });
        }
        for (let at = 14; at < s.length; at += 10) {
            const a = dec(s, at);
            const fi = unpackLetters(s.slice(at + 2, at + 10));
            f.mates.push({ sex: Math.floor(a / 13), S: a % 13, L: dec(s, at + 1), F: fi.slice(0, 12), I: fi.slice(12) });
        }
        if ([f.n, f.K, f.inf, bs, f.copies.S, f.copies.L].some(v => !isFinite(v)) || f.best.S > 6 || f.mates.some(x => x.S > 12 || x.L > 12)) continue;
        out.set(m[1], f);
    }
    return out;
}

// --------------------------------------------------- a market animal

// A gene's 12 letters (strand A, then strand B) from a market row's genetic
// identity: six loci, each strand A's letter then strand B's
// ("[STRING_LITERAL:Value=|AC|]" or "AC"; kinstrands.js strandsFromLoci).
// -> the letters, or null when a locus is missing or not two of A-D.
export function genesFromLoci(loci) {
    if (!Array.isArray(loci) || loci.length !== 6) return null;
    let a = '', b = '';
    for (const raw of loci) {
        const s = String(raw == null ? '' : raw);
        const m = /\|([A-Da-d])([A-Da-d])\|/.exec(s) || /^\s*([A-Da-d])([A-Da-d])\s*$/.exec(s);
        if (!m) return null;
        a += m[1].toUpperCase();
        b += m[2].toUpperCase();
    }
    return a + b;
}

// A market row's age in years from its text
// ("[AnimalExchange_Animal_Age:Years=(13.711668)]", or a number), or null.
export function marketAge(raw) {
    if (typeof raw === 'number') return isFinite(raw) ? raw : null;
    const m = /Years=\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)/.exec(String(raw == null ? '' : raw));
    return m ? Number(m[1]) : null;
}

function diff(a, b) {
    let n = 0;
    for (let i = 0; i < 6; i++) if (a[i] !== b[i]) n++;
    return n;
}

function split(text) {
    return typeof text === 'string' && text.length === 12 ? [text.slice(0, 6), text.slice(6)] : null;
}

// Fertility or Immunity of the young (0..1): the four equally likely strand
// pairs, how far each differs.
function heteroYoung(xs, ys) {
    let n = 0;
    for (const a of xs) for (const b of ys) n += diff(a, b);
    return n / 24;
}

// The best Vitality / Longevity strand a row carries: its strands, else the
// least its grade allows (t twelfths hold a strand of at least ceil(t / 2)).
function rowStrand(row, k) {
    const s = row.genes ? strandGood(row.genes, k) : null;
    if (s) {
        const v = Math.max(s[0], s[1]);
        return { value: v, n: s.filter(x => x >= v).length, exact: true };
    }
    const t = row.tw[k];
    return t == null ? null : { value: Math.ceil(t / 2), n: 1, exact: false };
}

// The strands it brings: per gene, a strand better than the herd's best
// (new), or one at the best while the herd has few copies (under half its
// strands). -> { bonus (0..2), notes: [{ k, value, isNew, best, copies }] }
function strandPart(row, f) {
    const out = { bonus: 0, notes: [] };
    for (const k of STRAND_GENES) {
        const r = rowStrand(row, k);
        if (!r || r.value <= 0) continue;
        const best = f.best[k];
        if (r.value > best) {
            out.bonus += r.n / 2;
            out.notes.push({ k, value: r.value, isNew: true, best, exact: r.exact });
            continue;
        }
        if (r.value < best || !f.n) continue;
        const share = f.copies[k] / (2 * f.n);
        if (share >= 0.5) continue;
        out.bonus += (r.n / 2) * (1 - 2 * share);
        out.notes.push({ k, value: r.value, isNew: false, best, copies: f.copies[k], exact: r.exact });
    }
    return out;
}

const INFERTILE = new Set([4, 5, 6]);

// A market (or storage) row against one species' herd facts.
// row: { sex (Sex), maturity (EAnimalMaturity), age (years or null),
//   genes: { S, L, F, I } (12 letters each; missing ones left out) or null,
//   grades: { size, longevity, fertility, immunity } (0..1, as shown) }.
// -> null (no facts, no bench or no mate of the other sex), { skip:
// 'infertile' | 'old' }, or { score (0..1 points of the young; may be
// negative), young, bench (the young's means), gains (per gene), mate (its
// index in f.mates), strand: { bonus, notes }, factor, years, sure }.
export function scoreListing(row, f, { strandWeight = PICK_STRAND_WEIGHT } = {}) {
    if (!row || !f || !f.bench || !f.mates || !f.mates.length) return null;
    if (INFERTILE.has(row.maturity)) return { skip: 'infertile' };
    const years = f.inf && typeof row.age === 'number' && isFinite(row.age) ? f.inf - row.age : null;
    if (years != null && years <= 0) return { skip: 'old' };
    const g = row.grades || {};
    const tw = { S: twelfths(row.genes, 'S'), L: twelfths(row.genes, 'L') };
    if (tw.S == null && typeof g.size === 'number') tw.S = Math.round(g.size * 12);
    if (tw.L == null && typeof g.longevity === 'number') tw.L = Math.round(g.longevity * 12);
    if (tw.S == null || tw.L == null) return null;
    const own = { F: split(strandText(row.genes, 'F')), I: split(strandText(row.genes, 'I')) };
    const sure = !!(own.F && own.I && strandGood(row.genes, 'S') && strandGood(row.genes, 'L'));
    let best = null;
    f.mates.forEach((m, i) => {
        if (!mateable({ sex: row.sex }, m)) return;
        const v = {
            size: (tw.S + m.S) / 24,
            longevity: (tw.L + m.L) / 24,
            fertility: own.F && split(m.F) ? heteroYoung(own.F, split(m.F)) : f.bench.fertility,
            immunity: own.I && split(m.I) ? heteroYoung(own.I, split(m.I)) : f.bench.immunity,
        };
        const mean = meanOf(v);
        if (!best || mean > best.mean + 1e-12) best = { v, mean, i };
    });
    if (!best) return null;
    const benchMean = meanOf(f.bench);
    const gains = {};
    for (const k of GENES) gains[k] = best.v[k] - f.bench[k];
    const strand = strandPart(Object.assign({}, row, { tw }), f);
    const factor = years == null ? 1 : Math.max(0, Math.min(1, years / PICK_FULL_YEARS));
    const score = factor * (best.mean - benchMean + strandWeight * strand.bonus / 2);
    return { score, young: best.mean, bench: benchMean, gains, youngGenes: best.v, mate: best.i, strand, factor, years, sure };
}

export function isPick(r, min = PICK_MIN) {
    return !!(r && typeof r.score === 'number' && r.score >= min - 1e-12);
}

// "Pick +2.1"
export function pickText(r) {
    return `Pick +${(Math.round(r.score * 1000) / 10).toFixed(1)}`;
}

// Why, in a few words: its strands first, else the young's genes that gain
// most. "Longevity 6/6 strand; the herd has 2 copies", "young: Immunity +14,
// Fertility +9".
export function pickWhy(r) {
    const parts = [];
    const notes = r.strand.notes;
    // Vitality and Longevity alike: one note
    const same = notes.length === 2 && notes[0].isNew === notes[1].isNew && notes[0].value === notes[1].value && notes[0].best === notes[1].best
        && notes[0].copies === notes[1].copies && notes[0].exact === notes[1].exact;
    for (const n of same ? [notes[0]] : notes) {
        // a grade of 11 or 12 twelfths holds a 6/6 strand for sure
        const what = `${same ? `${STRAND_NAME.S} and ${STRAND_NAME.L}` : STRAND_NAME[n.k]} ${n.exact || n.value >= 6 ? '' : 'at least '}${n.value}/6 strand${same ? 's' : ''}`;
        if (n.isNew) parts.push(`${what}; your best is ${n.best}/6`);
        else parts.push(`${what}; the herd has ${n.copies} ${n.copies === 1 ? 'copy' : 'copies'}`);
    }
    if (!parts.length) {
        const up = GENES.map(g => ({ g, d: Math.round(r.gains[g] * 100) })).filter(x => x.d >= 2).sort((x, y) => y.d - x.d).slice(0, 2);
        if (up.length) parts.push(`young: ${up.map(x => `${GENE_NAME[x.g]} +${x.d}`).join(', ')}`);
    }
    if (!parts.length) parts.push(`young ${Math.floor(r.young * 100 + 1e-9)}, your pairs' ${Math.floor(r.bench * 100 + 1e-9)}`);
    return parts.join(' · ');
}

// The longer story, for the badge's title and the debug log.
export function pickWords(r, mate, where = '') {
    const who = mate ? (mate.sex === Sex.Male ? 'your best male for it' : mate.sex === Sex.Female ? 'your best female for it' : 'your best mate for it') : 'your best mate for it';
    const s = [`Its young with ${who} would average ${Math.floor(r.young * 100 + 1e-9)}; your herd's pairs' young${where ? ` at ${where}` : ''} average ${Math.floor(r.bench * 100 + 1e-9)}.`];
    if (r.strand.notes.length) s.push(pickWhy(r) + '.');
    if (r.factor < 1) s.push(`Counted at ${Math.round(r.factor * 100)}%: about ${Math.max(0, Math.round(r.years * 10) / 10)} breeding years left.`);
    s.push(r.sure ? 'Sure: its strands are on the listing.' : 'Rough: the listing showed no strands; Fertility and Immunity taken as your pairs\' young.');
    return s.join(' ');
}
