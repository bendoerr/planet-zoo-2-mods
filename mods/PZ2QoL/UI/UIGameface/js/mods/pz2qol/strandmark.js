// Better strands elsewhere: marks the market, Animal Storage and trade
// centre animals that carry a better Vitality or Longevity strand than any
// in the herd (kinstrands.js herdBest, strandEdge; the developer, 2026-10-28:
// the market shows only the grades).
//
// Park (HUD page): the herd's best strands per species go into a
// player-wide setting (HERD_PREF: { z: the zoo, sp: 'Dog_AfricanWild:65,...' },
// at most 1500 characters) whenever they change, so the hub page can read
// them: the park is not loaded there.
// Hub (Frontend page): badges.js asks rowEdge for each market and storage
// row. The row's genetic identity (geneticIdentities.<gene>.genes.gene0-5,
// the strands letter by letter, as the game's Genealogy popup shows them)
// gives the strands; without it the grade gives a lower bound. The game
// fills the identity on market rows (all 24 rows of Helix's market copy, in
// game, 2026-10-20); the debug log says once per session (strand identity
// present / absent).
//
// Market picks (experimental, Kin setting marketPicks; marketpickcore.js):
// while it is on, the park page also keeps each herd's best mates and its
// pairs' young in the same setting (field mk, at most PICK_MAX_CHARS), and
// reads the settings again every 2 minutes, so turning picks on in the hub
// reaches it. Off, the setting holds what it always did.
import { getPref, rereadPrefs, setPref } from '/js/mods/pz2qol/prefs.js';
import { getKinModel, getKinSettings, onKin, onKinSettings } from '/js/mods/pz2qol/kin.js';
import { get } from '/js/mods/pz2qol/game.js';
import { dlog } from '/js/mods/pz2qol/debuglog.js';
import { decodeHerdBest, encodeHerdBest, herdBest, strandEdge, strandsFromLoci } from '/js/mods/pz2qol/kinstrands.js';
import { decodeMarketFacts, encodeMarketFacts, herdMarketFacts } from '/js/mods/pz2qol/marketpickcore.js';
import { speciesId } from '/js/mods/pz2qol/speciesnamecore.js';
import { reportError } from '/js/mods/pz2qol/errors.js';

export const HERD_PREF = 'herdStrands';
const REREAD_MS = 30000;
// the park page: how often it reads the settings again (market picks)
const PARK_REREAD_MS = 120000;

let lastPublished = null;
let decoded = { raw: null, zoo: '', best: new Map(), mk: null, facts: new Map() };
let lastReread = 0;
let lastParkReread = 0;
let identitySeen = null;

// Park: the herd's best strands into the player-wide setting, when they
// changed.
function publish(model) {
    if (!model || !model.animals || !model.animals.size) return;
    const sp = encodeHerdBest(herdBest(model));
    if (!sp) return;
    const z = String((model.snapshot && model.snapshot.park) || '').slice(0, 60);
    const mk = getKinSettings().marketPicks === true ? encodeMarketFacts(herdMarketFacts(model)) : '';
    const key = `${z}|${sp}|${mk}`;
    if (key === lastPublished) return;
    const now = getPref(HERD_PREF);
    lastPublished = key;
    if (now && now.z === z && now.sp === sp && (now.mk || '') === mk) return;
    setPref(HERD_PREF, mk ? { z, sp, mk } : { z, sp });
    if (mk) dlog('kin', 'picks_herd', { zoo: z, species: mk.split(',').length, chars: mk.length });
}

// The park page reads the settings again now and then: a Kin setting turned
// on in the hub (market picks) reaches it.
function parkReread() {
    const now = Date.now();
    if (now - lastParkReread < PARK_REREAD_MS) return;
    lastParkReread = now;
    rereadPrefs();
}

export function installStrandMarks() {
    // the park page only (kinhooks.js isHudPage; not imported: the badges
    // load this module early, on both pages)
    if (!/HUD/i.test(String(location.pathname || ''))) return true;
    onKin((model, scope) => {
        if (scope && scope !== 'park') return;
        try {
            parkReread();
            publish(model);
        }
        catch (e) {
            reportError('mod', 'Better strands: the herd could not be kept for the hub', e, { silent: true });
        }
    });
    onKinSettings(() => {
        try {
            publish(getKinModel());
        }
        catch (e) {
            reportError('mod', 'Market picks: the herd could not be kept for the hub', e, { silent: true });
        }
    });
    publish(getKinModel());
    return true;
}

// The setting as the park last kept it, decoded once per change. Read again
// from the store now and then (the park page may have changed it since this
// page read it).
function herdPref() {
    const now = Date.now();
    if (now - lastReread > REREAD_MS) {
        lastReread = now;
        rereadPrefs();
    }
    const v = getPref(HERD_PREF);
    const raw = v && typeof v === 'object' ? `${v.z}|${v.sp}` : '';
    if (raw !== decoded.raw) decoded = Object.assign(decoded, { raw, zoo: v && v.z ? String(v.z) : '', best: decodeHerdBest(v && v.sp) });
    const mk = v && typeof v === 'object' && typeof v.mk === 'string' ? v.mk : '';
    if (mk !== decoded.mk) Object.assign(decoded, { mk, facts: decodeMarketFacts(mk) });
    return decoded;
}

// The herd's best for a species: { best: { S, L }, zoo } or null.
export function herdBestFor(species) {
    const d = herdPref();
    const best = d.best.get(speciesId(species));
    return best ? { best, zoo: d.zoo } : null;
}

// Market picks: the herd's facts for a species (marketpickcore.js
// decodeMarketFacts), as the park last kept them: { facts, zoo } or null
// (picks off there, or no herd of it).
export function herdFactsFor(species) {
    const d = herdPref();
    const facts = d.facts.get(speciesId(species));
    return facts ? { facts, zoo: d.zoo } : null;
}

// Whether the park kept any herd facts (market picks on there).
export function herdFactsKept() {
    const d = herdPref();
    return { any: d.facts.size > 0, zoo: d.zoo };
}

// A market or storage row's strands from its genetic identity:
// { S, L } ([a, b] or null each).
export function rowStrands(ctx) {
    const loci = id => {
        const g = ctx.concat(['geneticIdentities', id, 'genes']);
        return [0, 1, 2, 3, 4, 5].map(i => get(g, 'gene' + i));
    };
    const out = { S: strandsFromLoci(loci('size')), L: strandsFromLoci(loci('longevity')) };
    const present = !!(out.S || out.L);
    if (identitySeen !== present) {
        identitySeen = present;
        dlog('ui', 'strands', { identity: present ? 'present' : 'absent' });
    }
    return out;
}

// A row's edge over the herd (kinstrands.js strandEdge), or null when the
// herd's best for its species is not known. a: readAnimal(ctx).
export function rowEdge(ctx, a) {
    const h = a && a.species ? herdBestFor(a.species) : null;
    if (!h) return null;
    const grades = a.genes ? { S: a.genes.size, L: a.genes.longevity } : null;
    return { edge: strandEdge(rowStrands(ctx), grades, h.best), zoo: h.zoo };
}
