// Thin out: which animals of one species to send to the trade centre (to
// sell, trade or release) when its habitats are full. Pure, no game
// imports (Node tests).
//
// Per habitat: a target number of adults = the habitat's room for the
// species (social maximum and space, as the breeding programme measures
// it) x a fill level (core only / strict 55% / lean 70% / balanced 85% /
// full 100%; the room left is for the young). Habitats over their target
// give up their least valuable animals until they fit.
//
// Gene rules go first and apply whether a habitat is full or not, to clear
// poor genes out of the gene pool: a 0% fertility gene (on by default), and
// a "poor genes" level (weakest: under 35 or a 0% immunity gene; below the
// species average; best only: the best quarter of each sex stays). They
// also overrule the breeding core; only the player's keeps, pregnant
// females, animals on the move and the last breeder of a sex stay.
//
// Keep value (higher = keep):
//   genes        the animal's own gene score (the game's grades, 0..1)
//   fertility    fertile years ahead: too old / infertile 0, last fertile
//                years 0.3, young or fertile 1
//   relatives    each related animal in the same habitat lowers it (its
//                young there would be inbred)
//   role         alpha and bonded animals a little higher; a fertile male
//                beyond what the group make-up allows for the habitat's
//                females (the breeding programme's rule: a harem keeps one,
//                1:3 keeps one per three females) lower
// Juveniles are only sent away by hand, or by the gene rules with `young`.
// Never sent away: pregnant females,
// animals on the move, the best fertile
// male and the best fertile females of each habitat (a breeding core), and
// the species' best genes overall (`keepBest` per sex).
//
// Goal 'ceiling' (the Breeding goal "Push the ceiling", kinstrands.js): the
// last two carriers of each best strand stay (one of each sex where
// possible). Once the herd's mean is within ceilingWithin of its ceiling
// (it waits until then, culling as for the average young), the genes part is
// the animal's breeding value (its better Size and Longevity strands, its
// Fertility grade, the Immunity of its young with the herd), not its own
// average; and when a habitat is over its room, grown animals with no copy
// of either best strand go first, then breeders outclassed by a fertile
// animal of their sex with more copies, then the rest by keep value.
//
// Who counts as related (kinRule, kinprogramme.js relatedBy) follows the
// programme's rule.
import { ownGrades, fertilityText, Sex } from './kincore.js';
import { TRADE } from './kinboardcore.js';
import { habitatCapacity, estimateSpacePerAdult, groupRule, ratioKey, relatedBy, youngByHabitat } from './kinprogramme.js';
import { breedingValue, carrierKeepers, ceilingWaiting, copiesText, outclasses, speciesStrands, usefulCopies } from './kinstrands.js';

export const FILL_STEPS = Object.freeze([
    { id: 'core', label: 'Core only', fill: 0 },
    { id: 'strict', label: 'Strict', fill: 0.55 },
    { id: 'lean', label: 'Lean', fill: 0.7 },
    { id: 'balanced', label: 'Balanced', fill: 0.85 },
    { id: 'full', label: 'Full', fill: 1 },
]);

// Poor genes: sent away from every habitat, full or not (levels add up)
export const GENE_STEPS = Object.freeze([
    { id: 'off', label: 'Off', tip: 'Genes only count where a habitat is over its room' },
    { id: 'weak', label: 'Weakest', tip: 'Gene score under 35, or a 0% immunity gene' },
    { id: 'below', label: 'Below average', tip: 'Gene score below the species average (and the weakest)' },
    { id: 'best', label: 'Best only', tip: 'Only the best quarter of each sex stays' },
]);
export const WEAK_GENE = 0.35;

export const CULL_DEFAULTS = Object.freeze({
    fill: 0.85,
    oldAlways: false,       // send too-old animals away even from habitats that are not full
    zeroFertility: true,    // a 0% fertility gene: sent away from every habitat
    genes: 'off',           // GENE_STEPS id
    young: false,           // the gene rules also pick juveniles
    keepBest: 1,            // per sex, the species' best genes are never sent away
    coreMales: 1,           // fertile males kept per habitat
    coreFemales: 2,         // fertile females kept per habitat
    keepIds: null,          // Set: the player said keep
    cullIds: null,          // Set: the player said send away
    ratio: 'auto',          // the group make-up (the breeding programme's RATIO_CHOICES)
    goal: 'average',        // the Breeding goal (kinprogtune.js tuningCull): 'average' | 'ceiling'
    ceilingWithin: 0.05,    // 'ceiling' waits while the herd is more than this below its ceiling
    kinRule: 'pedigree',    // who counts as related (kinprogramme.js relatedBy): 'pedigree' | 'genes'
    kinFloor: 0.5,
});

// Breeding males a habitat keeps under the make-up: one per f females
// (at least one) for 1:f, one for a harem; the game's most per sex caps it.
export function maleRoom(rule, fertileFemales) {
    let n = rule && rule.m === 1 && rule.f > 1 ? Math.max(1, Math.ceil(fertileFemales / rule.f)) : Infinity;
    if (rule && rule.maxMales != null) n = Math.min(n, rule.maxMales);
    return n;
}

export function geneScore(a) {
    const g = ownGrades(a && a.genes);
    const vals = Object.values(g).filter(v => typeof v === 'number');
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

// The animal's fertility gene grade (0..1), or null.
export function fertilityGene(a) {
    const g = ownGrades(a && a.genes).fertility;
    return typeof g === 'number' ? g : null;
}

const pct = v => Math.round(v * 100);

// Species-wide gene rules: a => reason or null. score: the goal's gene
// measure (geneScore, or breedingValue for 'ceiling').
function geneRules(adults, opts, score = geneScore) {
    const level = Math.max(0, GENE_STEPS.findIndex(x => x.id === opts.genes));
    const known = adults.map(a => score(a)).filter(v => v != null);
    const avg = known.length ? known.reduce((s, v) => s + v, 0) / known.length : null;
    // best only: the gene score of the last animal in each sex's best quarter
    const cut = new Map();
    for (const sex of [Sex.Male, Sex.Female, Sex.Unisex]) {
        const v = adults.filter(a => a.sex === sex).map(a => score(a)).filter(x => x != null).sort((x, y) => y - x);
        if (v.length) cut.set(sex, v[Math.max(0, Math.ceil(v.length / 4) - 1)]);
    }
    return a => {
        if (a.juv && !opts.young) return null;
        const g = ownGrades(a.genes);
        if (opts.zeroFertility && g.fertility === 0) return '0% fertility genes';
        if (level < 1) return null;
        if (g.immunity === 0) return '0% immunity genes';
        const gs = score(a);
        if (gs == null) return null;
        if (gs < WEAK_GENE - 1e-9) return `poor genes (${pct(gs)})`;
        if (level >= 2 && avg != null && gs < avg - 1e-9) return `genes below the species average (${pct(gs)}; average ${pct(avg)})`;
        if (level >= 3 && cut.has(a.sex) && gs < cut.get(a.sex) - 1e-9) return `not in the best quarter of genes (${pct(gs)}; needs ${pct(cut.get(a.sex))})`;
        return null;
    };
}

function fertilityValue(a) {
    const st = a.fert && a.fert.state;
    if (st === 'old' || st === 'sterile') return 0;
    if (st === 'ending') return 0.3;
    if (!st && a.infertile && !a.juv) return 0;
    return 1;
}

export function breedsNow(a) {
    const st = a.fert && a.fert.state;
    return !a.juv && !a.contra && !a.infertile && st !== 'old' && st !== 'young' && st !== 'sterile';
}

// kin: { kinRule, kinFloor } (the programme's rule, kinprogramme.js relatedBy)
function related(model, a, b, kin = null) {
    return relatedBy(model, a, b, kin ? kin.kinRule : 'pedigree', kin && kin.kinFloor != null ? kin.kinFloor : 0.5);
}

// { value, gene, fert, relatives, parts }. males: breeding males the
// habitat keeps (maleRoom); without it a polygynous species keeps one.
// score: the genes part (geneScore; breedingValue for the 'ceiling' goal);
// kin: who counts as related ({ kinRule, kinFloor }, null: the family tree).
export function keepValue(model, a, group, { system = 'mixed', maleRank = 0, males, score = geneScore, kin = null } = {}) {
    if (males == null) males = system === 'polygyny' ? 1 : Infinity;
    const gene = score(a);
    const fert = fertilityValue(a);
    const relatives = group.filter(b => b !== a && related(model, a, b, kin)).length;
    let value = 0.55 * (gene == null ? 0.5 : gene) + 0.35 * fert - 0.06 * relatives;
    if (a.alpha) value += 0.08;
    if ((a.mates || []).some(id => group.some(b => b.id === id))) value += 0.05;
    if (a.sex === Sex.Male && breedsNow(a) && maleRank >= males) value -= 0.2;
    return { value, gene, fert, relatives };
}

function extraMaleWhy(rule, males) {
    const key = ratioKey(rule);
    if (key === '1:*' || males === 1 && rule.maxMales === 1) return 'an extra male (harem: one breeding male per habitat)';
    return `an extra male (${key.replace(':', ' ♂ : ')} ♀: room for ${males} breeding male${males === 1 ? '' : 's'} here)`;
}

// strand: the 'ceiling' goal's reason for a non-carrier or an outclassed
// breeder ('' otherwise); score: the goal's gene measure.
function cullReason(a, k, group, rule, maleRank, males, strand = '', score = geneScore) {
    const st = a.fert && a.fert.state;
    if (st === 'old') return 'too old to breed';
    if (st === 'sterile' || (!st && a.infertile && !a.juv)) return 'infertile';
    if (a.sex === Sex.Male && maleRank >= males && breedsNow(a)) return extraMaleWhy(rule, males);
    if (strand) return strand;
    if (st === 'ending') return fertilityText(a);
    const best = Math.max(...group.map(b => score(b) ?? 0));
    if (k.relatives >= 2) return `related to ${k.relatives} in this habitat`;
    if (k.gene != null) return `weaker genes (${Math.round(k.gene * 100)}; best here ${Math.round(best * 100)})`;
    return 'surplus';
}

// The plan for one species. info: the breeding programme's species facts
// (social, habitats space...), or {} (then the current count is the room).
export function cullPlan(model, species, info = {}, { options = {} } = {}) {
    const opts = Object.assign({}, CULL_DEFAULTS, options);
    if (!model || !species) return null;
    const ceilingGoal = opts.goal === 'ceiling';
    // 'ceiling': the species' best strands; their last two carriers stay
    const strands = ceilingGoal ? speciesStrands(model, species, info) : null;
    // the goal waits while the herd is far below its ceiling: Thin out then
    // keeps by the animals' own genes, as for the average young (the
    // carriers still stay)
    const waiting = ceilingGoal && ceilingWaiting(strands, opts.ceilingWithin);
    const ceiling = ceilingGoal && !waiting;
    // the genes part: the animal's own grades, or what it passes on
    const bvCache = new Map();
    const score = ceiling ? a => {
        if (!bvCache.has(a.id)) bvCache.set(a.id, breedingValue(a, strands));
        return bvCache.get(a.id);
    } : geneScore;
    const keepIds = opts.keepIds instanceof Set ? opts.keepIds : new Set(opts.keepIds || []);
    const cullIds = opts.cullIds instanceof Set ? opts.cullIds : new Set(opts.cullIds || []);
    const rule = groupRule(info, opts.ratio);
    const system = rule.system;
    const all = Array.from(model.animals.values()).filter(a => a.species === species && !a.exhibit && a.alive !== false);
    // juveniles share the game's space requirement and don't take adults' room
    const infoX = Object.assign({}, info);
    if (!infoX.spacePerAdult) infoX.spacePerAdult = estimateSpacePerAdult(info, youngByHabitat(all));
    const inHabitats = all.filter(a => a.hab);
    const atTrade = all.filter(a => !a.hab && a.lt === 'trade').length;
    const poorWhy = geneRules(inHabitats.filter(a => !a.juv), opts, score);
    const poor = new Map();
    for (const a of inHabitats) {
        const w = poorWhy(a);
        if (w) poor.set(a.id, w);
    }
    const carriers = ceilingGoal ? carrierKeepers(strands, inHabitats, breedsNow) : new Map();
    // ... and who goes first from a habitat over its room: no copy of either
    // best strand (tier 0), a breeder outclassed by a fertile animal of its
    // sex with more copies (tier 1), the rest (2)
    const breedingNow = ceiling ? inHabitats.filter(breedsNow) : [];
    const strandRank = a => {
        const c = ceiling && !a.juv ? usefulCopies(strands, a) : null;
        if (!c || c.S == null || c.L == null) return { tier: 2, why: '' };
        if (!c.S && !c.L) return { tier: 0, why: `carries neither best strand (${copiesText(c)})` };
        if (!breedsNow(a)) return { tier: 2, why: '' };
        const by = breedingNow.find(b => b !== a && b.sex === a.sex && outclasses(usefulCopies(strands, b), c));
        return by ? { tier: 1, why: `outclassed by ${by.name} (${copiesText(usefulCopies(strands, by))} vs ${copiesText(c)})` } : { tier: 2, why: '' };
    };
    // the species' best genes, per sex: never sent away. Poor genes don't
    // count, unless every breeder of that sex has them (then the best of
    // them stays, so the species can still breed)
    const protectedBest = new Set();
    const lastOfSex = new Set();
    for (const sex of [Sex.Male, Sex.Female, Sex.Unisex]) {
        const breeders = inHabitats.filter(a => a.sex === sex && !a.juv && fertilityValue(a) > 0)
            .sort((x, y) => (score(y) ?? 0) - (score(x) ?? 0));
        const good = breeders.filter(a => !poor.has(a.id));
        (good.length ? good : breeders).slice(0, opts.keepBest).forEach(a => {
            protectedBest.add(a.id);
            if (poor.has(a.id)) lastOfSex.add(a.id);
        });
    }
    const byHab = new Map();
    for (const a of inHabitats) {
        if (!byHab.has(a.hab)) byHab.set(a.hab, []);
        byHab.get(a.hab).push(a);
    }
    const habitats = [];
    const moves = [];
    for (const [hab, group] of byHab) {
        const adults = group.filter(a => !a.juv);
        const r = habitatCapacity(infoX, hab, NaN); // NaN: the game gave no room for it
        const room = Number.isFinite(r) ? r : null;
        const capacity = room != null ? room : adults.length;
        const target = Math.max(opts.coreMales + opts.coreFemales, Math.floor(capacity * opts.fill + 1e-9));
        // the fertile males ranked by genes; the make-up says how many stay breeding
        const fertileMales = group.filter(a => a.sex === Sex.Male && breedsNow(a)).sort((x, y) => (score(y) ?? 0) - (score(x) ?? 0));
        const maleRankOf = a => fertileMales.indexOf(a);
        const males = maleRoom(rule, group.filter(a => a.sex === Sex.Female && breedsNow(a)).length);
        const scored = group.map(a => ({ a, k: keepValue(model, a, group, { system, maleRank: Math.max(0, maleRankOf(a)), males, score, kin: opts }) }));
        // the breeding core: the best fertile male(s), then the best fertile
        // females not related to them (keep value, so relatives rank lower)
        const valueOf = new Map(scored.map(x => [x.a.id, x.k.value]));
        const byValue = list => list.slice().sort((x, y) => valueOf.get(y.id) - valueOf.get(x.id));
        const core = new Set();
        const coreMales = fertileMales.filter(a => !poor.has(a.id)).slice(0, opts.coreMales);
        coreMales.forEach(a => core.add(a.id));
        const females = group.filter(a => a.sex === Sex.Female && breedsNow(a) && !poor.has(a.id));
        const unrelatedFirst = byValue(females).sort((x, y) => coreMales.some(m => related(model, m, x, opts)) - coreMales.some(m => related(model, m, y, opts)));
        unrelatedFirst.slice(0, opts.coreFemales).forEach(a => core.add(a.id));
        byValue(group.filter(a => a.sex === Sex.Unisex && breedsNow(a) && !poor.has(a.id))).slice(0, opts.coreMales + opts.coreFemales).forEach(a => core.add(a.id));
        const fixed = a => keepIds.has(a.id) || a.preg || a.moving || a.away || core.has(a.id) || protectedBest.has(a.id) || carriers.has(a.id);
        const why = new Map();
        // the player's choices first
        // (never a pregnant one: she can't be sold and has to give birth first)
        for (const { a } of scored) if (cullIds.has(a.id) && !a.moving && !a.preg && !a.away) why.set(a.id, 'your choice');
        // the player's sends come on top: they do not make room for another to stay
        let over = adults.length - target;
        // poor genes go from every habitat, full or not; they make room
        for (const { a } of scored) {
            if (fixed(a) || why.has(a.id) || !poor.has(a.id)) continue;
            why.set(a.id, poor.get(a.id));
            if (!a.juv) over--;
        }
        const rank = new Map(ceiling ? scored.map(x => [x.a.id, strandRank(x.a)]) : []);
        const candidates = scored.filter(x => !fixed(x.a) && !why.has(x.a.id))
            .sort(ceiling ? (x, y) => rank.get(x.a.id).tier - rank.get(y.a.id).tier || x.k.value - y.k.value : (x, y) => x.k.value - y.k.value);
        for (const x of candidates) {
            const oldOne = fertilityValue(x.a) === 0 && !x.a.juv;
            // juveniles only by hand: the target counts adults, and the room
            // left by the fill level is for the young
            if (x.a.juv) continue;
            if (over > 0 || (opts.oldAlways && oldOne)) {
                why.set(x.a.id, cullReason(x.a, x.k, group, rule, Math.max(0, maleRankOf(x.a)), males, ceiling ? rank.get(x.a.id).why : '', score));
                if (!x.a.juv) over--;
            }
        }
        const cull = scored.filter(x => why.has(x.a.id)).map(x => ({ id: x.a.id, reason: why.get(x.a.id), value: x.k.value, gene: x.k.gene }));
        const keep = scored.filter(x => !why.has(x.a.id)).map(x => ({
            id: x.a.id, value: x.k.value, gene: x.k.gene,
            why: keepIds.has(x.a.id) ? 'your choice' : x.a.preg ? 'pregnant' : x.a.away ? 'away for now' : x.a.moving ? 'on the move' : core.has(x.a.id) ? 'breeding core'
                : lastOfSex.has(x.a.id) ? 'last breeder of its sex' : carriers.has(x.a.id) ? carriers.get(x.a.id)
                    : protectedBest.has(x.a.id) ? 'best genes of the species' : '',
            poor: poor.get(x.a.id) || '',
        }));
        habitats.push({ hab, adults: adults.length, juveniles: group.length - adults.length, capacity, room: room != null, target, keep, cull,
            keptAdults: keep.filter(x => !model.animals.get(x.id).juv).length });
        for (const c of cull) moves.push({ id: c.id, to: TRADE, reason: c.reason });
    }
    habitats.sort((x, y) => (y.adults - y.target) - (x.adults - x.target));
    const avg = list => {
        const v = list.map(a => geneScore(a)).filter(x => x != null);
        return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length * 100) : null;
    };
    const culled = new Set(moves.map(m => m.id));
    const kept = inHabitats.filter(a => !culled.has(a.id));
    const gone = inHabitats.filter(a => culled.has(a.id));
    const sum = list => ({
        animals: list.length, adults: list.filter(a => !a.juv).length, gene: avg(list),
        old: list.filter(a => fertilityValue(a) === 0 && !a.juv).length,
        zeroFert: list.filter(a => fertilityGene(a) === 0).length,
    });
    const out = {
        species, system, rule, fill: opts.fill, moves, habitats, atTrade,
        // poor genes that stay (pregnant, kept, on the move, last breeder)
        poorKept: inHabitats.filter(a => poor.has(a.id) && !culled.has(a.id)).length,
        before: sum(inHabitats),
        after: sum(kept),
        removedGene: avg(gone),
        estimated: !info.social && !(info.habitats && Object.keys(info.habitats).length),
    };
    // 'ceiling': the best strands, the ceiling, the carriers kept for them,
    // the herd's mean and whether the goal waits
    if (ceilingGoal) out.strands = { best: strands.best, ceiling: strands.ceiling, keep: Array.from(carriers.keys()), mean: strands.mean, waiting };
    return out;
}
