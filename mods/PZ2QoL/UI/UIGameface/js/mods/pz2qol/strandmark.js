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
// gives the strands; without it the grade gives a lower bound. Whether the
// game fills the identity on market rows is not known yet: the debug log
// says once per session (strand identity present / absent).
import { getPref, rereadPrefs, setPref } from '/js/mods/pz2qol/prefs.js';
import { getKinModel, onKin } from '/js/mods/pz2qol/kin.js';
import { get } from '/js/mods/pz2qol/game.js';
import { dlog } from '/js/mods/pz2qol/debuglog.js';
import { decodeHerdBest, encodeHerdBest, herdBest, strandEdge, strandsFromLoci } from '/js/mods/pz2qol/kinstrands.js';
import { speciesId } from '/js/mods/pz2qol/speciesnamecore.js';
import { reportError } from '/js/mods/pz2qol/errors.js';

export const HERD_PREF = 'herdStrands';
const REREAD_MS = 30000;

let lastPublished = null;
let decoded = { raw: null, zoo: '', best: new Map() };
let lastReread = 0;
let identitySeen = null;

// Park: the herd's best strands into the player-wide setting, when they
// changed.
function publish(model) {
    if (!model || !model.animals || !model.animals.size) return;
    const sp = encodeHerdBest(herdBest(model));
    if (!sp) return;
    const z = String((model.snapshot && model.snapshot.park) || '').slice(0, 60);
    const key = `${z}|${sp}`;
    if (key === lastPublished) return;
    const now = getPref(HERD_PREF);
    lastPublished = key;
    if (now && now.z === z && now.sp === sp) return;
    setPref(HERD_PREF, { z, sp });
}

export function installStrandMarks() {
    // the park page only (kinhooks.js isHudPage; not imported: the badges
    // load this module early, on both pages)
    if (!/HUD/i.test(String(location.pathname || ''))) return true;
    onKin((model, scope) => {
        if (scope && scope !== 'park') return;
        try {
            publish(model);
        }
        catch (e) {
            reportError('mod', 'Better strands: the herd could not be kept for the hub', e, { silent: true });
        }
    });
    publish(getKinModel());
    return true;
}

// The herd's best for a species, as the park last kept it: { best: { S, L },
// zoo } or null. Read again from the store now and then (the park page may
// have changed it since this page read it).
export function herdBestFor(species) {
    const now = Date.now();
    if (now - lastReread > REREAD_MS) {
        lastReread = now;
        rereadPrefs();
    }
    const v = getPref(HERD_PREF);
    const raw = v && typeof v === 'object' ? `${v.z}|${v.sp}` : '';
    if (raw !== decoded.raw) decoded = { raw, zoo: v && v.z ? String(v.z) : '', best: decodeHerdBest(v && v.sp) };
    const best = decoded.best.get(speciesId(species));
    return best ? { best, zoo: decoded.zoo } : null;
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
