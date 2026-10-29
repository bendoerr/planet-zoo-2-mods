// Market picks (experimental, off by default): on the hub's Market, the
// listings that would raise a herd the player keeps, marked on the row's
// badge with why ("Pick +2.1 · young: Immunity +14, Fertility +9 · sure"),
// and, from the market toolbar, this page's picks first or only them.
// Scoring: marketpickcore.js; the herd's facts come from the park page
// (strandmark.js, the setting herdStrands, field mk). The mod never buys:
// buying stays the game's own button.
//
// The game's market is paged (12 rows a page in game), so "first" and
// "only" sort and filter the page on screen, through the same list hook as
// the storage filters (listfilter.js).
import { getKinSettings, onKinSettings, setKinSettings } from '/js/mods/pz2qol/kin.js';
import { get, MARKET_LIST_KEY, readAnimal } from '/js/mods/pz2qol/game.js';
import { refreshList, registerListFilter } from '/js/mods/pz2qol/listfilter.js';
import { herdFactsFor, herdFactsKept } from '/js/mods/pz2qol/strandmark.js';
import { genesFromLoci, isPick, marketAge, pickText, pickWhy, pickWords, scoreListing } from '/js/mods/pz2qol/marketpickcore.js';
import { speciesId } from '/js/mods/pz2qol/speciesnamecore.js';
import { dlog } from '/js/mods/pz2qol/debuglog.js';

// 'mark' (marks only), 'first' (this page's picks first), 'only' (only them)
export const PICK_MODES = Object.freeze(['mark', 'first', 'only']);
const CACHE_MAX = 400;
const LOGGED_MAX = 200;

let mode = 'mark';
// per herd facts object (a new one when the park keeps new facts): content
// key -> pick or null
let caches = new WeakMap();
const logged = new Set();
const listeners = new Set();
let lastPage = '';
let summary = { rows: 0, scored: 0, identity: '0/0', picks: 0, best: '', herd: '' };

export function picksOn() {
    return getKinSettings().marketPicks === true;
}

export function setPicksOn(on) {
    setKinSettings({ marketPicks: !!on });
    dlog('ui', 'picks_setting', { on: !!on, mode });
}

export function picksMode() {
    return mode;
}

export function setPicksMode(m) {
    if (!PICK_MODES.includes(m) || m === mode) return;
    mode = m;
    dlog('ui', 'picks_setting', { on: picksOn(), mode });
    refreshList(MARKET_LIST_KEY);
    listeners.forEach(fn => fn());
}

export function onPicksChanged(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// A market row's four genes from its genetic identity (12 letters each),
// the ones missing left out.
function rowGenes(ctx) {
    const out = {};
    for (const [k, id] of [['S', 'size'], ['L', 'longevity'], ['F', 'fertility'], ['I', 'immunity']]) {
        const g = ctx.concat(['geneticIdentities', id, 'genes']);
        const s = genesFromLoci([0, 1, 2, 3, 4, 5].map(i => get(g, 'gene' + i)));
        if (s) out[k] = s;
    }
    return out;
}

// The pick for a market row: { r (scoreListing), pick (bool), text, why,
// words, zoo } or null (picks off, no herd of the species, not scored).
// a: readAnimal(ctx).
export function rowPick(ctx, a) {
    if (!picksOn() || !a || !a.species || a.isShoal || a.isExhibit) return null;
    const h = herdFactsFor(a.species);
    if (!h) return null;
    const ageRaw = get(ctx, 'age');
    // what the row shows (row ids are page slots): the strands are read once
    const key = [a.id, a.species, a.gender, a.maturity, ageRaw, a.price, a.isCC, a.name, a.auctionTimerSeconds > 0, ...Object.values(a.genes)].join('|');
    if (!caches.has(h.facts)) caches.set(h.facts, new Map());
    const cache = caches.get(h.facts);
    if (cache.has(key)) return cache.get(key);
    const genes = rowGenes(ctx);
    const row = {
        sex: a.gender, maturity: a.maturity, age: marketAge(ageRaw), genes,
        grades: a.genes,
    };
    const r = scoreListing(row, h.facts);
    let out = null;
    if (r && typeof r.score === 'number') {
        const pick = isPick(r);
        const mate = h.facts.mates[r.mate];
        out = { r, pick, key, text: pickText(r), why: `${pickWhy(r)} · ${r.sure ? 'sure' : 'rough'}`, words: pickWords(r, mate, h.zoo), zoo: h.zoo, identity: Object.keys(genes).length };
        if (pick && logged.size < LOGGED_MAX && !logged.has(key)) {
            logged.add(key);
            dlog('ui', 'pick', { species: speciesId(a.species), sex: a.gender, age: row.age == null ? '' : Math.round(row.age * 10) / 10, price: a.price, score: Math.round(r.score * 1000) / 10, young: Math.round(r.young * 1000) / 10, bench: Math.round(r.bench * 1000) / 10, sure: r.sure, why: pickWhy(r) });
        }
    }
    else if (r && r.skip) out = { r, pick: false, key, text: '', why: r.skip, words: '', zoo: h.zoo, identity: Object.keys(genes).length };
    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(key, out);
    return out;
}

// The debug log's view of a page of rows (once per new page content):
// how many were scored, whether the rows showed strands, the picks.
// rows: [{ a (readAnimal), p (rowPick) }]
export function logPage(rows) {
    if (!picksOn() || !rows.length) return;
    const scored = rows.filter(x => x.p && x.p.r && typeof x.p.r.score === 'number');
    const picks = scored.filter(x => x.p.pick);
    const best = picks.reduce((m, x) => Math.max(m, x.p.r.score), -Infinity);
    const kept = herdFactsKept();
    summary = {
        rows: rows.length, scored: scored.length, identity: `${rows.filter(x => x.p && x.p.identity === 4).length}/${rows.filter(x => x.p).length}`,
        picks: picks.length, best: picks.length ? `+${(Math.round(best * 1000) / 10).toFixed(1)}` : '', herd: kept.any ? kept.zoo || 'your zoo' : '',
    };
    const sig = rows.map(x => (x.p ? x.p.key : `${x.a.id}|${x.a.name}|${x.a.price}`)).join(',');
    if (sig === lastPage) return;
    lastPage = sig;
    const species = Array.from(new Set(rows.map(x => speciesId(x.a.species)))).sort().join(' ');
    dlog('ui', 'picks', Object.assign({ species }, summary, { herd: summary.herd || 'none', mode }));
}

// The page on screen as logPage last saw it: { rows, scored, identity
// ('4/9': rows that showed all four genes' strands / rows of a kept herd),
// picks, best ('+2.1'), herd (the zoo that kept the herds, '' if none) }.
export function pageSummary() {
    if (!summary.herd) {
        const kept = herdFactsKept();
        if (kept.any) summary = Object.assign({}, summary, { herd: kept.zoo || 'your zoo' });
    }
    return summary;
}

// Picks first, or only picks, on the page on screen.
function arrange(source) {
    const rows = source.map((ctx, i) => {
        const a = readAnimal(ctx);
        return { ctx, i, p: rowPick(ctx, a) };
    });
    const isP = x => !!(x.p && x.p.pick);
    if (mode === 'only') return rows.filter(isP).sort((x, y) => y.p.r.score - x.p.r.score || x.i - y.i).map(x => x.ctx);
    return rows.slice().sort((x, y) => (isP(y) ? 1 : 0) - (isP(x) ? 1 : 0) || (isP(x) && isP(y) ? y.p.r.score - x.p.r.score : 0) || x.i - y.i).map(x => x.ctx);
}

export function installMarketPicks() {
    registerListFilter(MARKET_LIST_KEY, {
        active: () => mode !== 'mark' && picksOn(),
        filter: arrange,
    });
    onKinSettings(() => {
        caches = new WeakMap();
        lastPage = '';
        refreshList(MARKET_LIST_KEY);
        listeners.forEach(fn => fn());
    });
    return true;
}
