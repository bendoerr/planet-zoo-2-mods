// Gene names (the storage bar's button): renames the animals the storage
// list shows to "<gene score><breeder score> <name> <V><L>" (renamecore.js),
// so the list shows and sorts by them. One at a time through the Lua
// engine's "rename" job (pz2qol.lister.lua: the game's own call for the
// name field, each confirmed by its row), with the listing pace between
// them. Only ever started by the Rename click in its card; Stop ends it.
import { translate } from '/js/common/core/Localisation.js';
import { literalName, planRenames, encodeRenameJob, renameSummary } from '/js/mods/pz2qol/renamecore.js';
import { applyStorageFilters, storageFiltersActive } from '/js/mods/pz2qol/scores.js';
import { readAnimal } from '/js/mods/pz2qol/game.js';
import { getStorageFilters, getStoragePredicates, getStorageSource } from '/js/mods/pz2qol/listfilter.js';
import { engineCaps, engineRunning, getEngineState, onEngineState, resolveGuids, startEngineRun, stopEngineRun } from '/js/mods/pz2qol/listerlua.js';
import { identityOf, isListingBusy } from '/js/mods/pz2qol/lister.js';
import { getPaceMs } from '/js/mods/pz2qol/pace.js';
import { breadcrumb, reportError } from '/js/mods/pz2qol/errors.js';
import { dlog } from '/js/mods/pz2qol/debuglog.js';
import { gameOnTop } from '/js/mods/pz2qol/cover.js';
import { clear, h, icon } from '/js/mods/pz2qol/ui.js';

const R = {
    card: null,
    body: null,
    open: false,
    req: '',            // the engine run this card started
    labels: new Map(),  // guid -> { from, to }
    message: '',
    starting: false,
    timer: null,
    sig: '',            // the plan the card shows (redrawn when it changes)
    installed: false,
};

// The name as the game shows it: a name the player gave comes as
// "[STRING_LITERAL:Value=|...|]", the game's own as a name key to translate.
// '' when it can't be read (a key with no text: "!key!").
function nameOf(a) {
    const raw = a.name == undefined ? '' : String(a.name);
    const lit = literalName(raw);
    if (lit != null) return lit;
    let s = raw;
    try {
        s = translate(raw);
    }
    catch (e) {
        s = raw;
    }
    s = String(s == undefined ? '' : s);
    return /^!.*!$/.test(s) || /^\[.*\]$/.test(s) ? '' : s;
}

// The animals the storage list shows now (the game's filters and the mod's).
function shownAnimals() {
    const animals = getStorageSource().map(readAnimal).filter(a => a.id != undefined);
    const f = getStorageFilters();
    return storageFiltersActive(f) ? applyStorageFilters(animals, f, getStoragePredicates()) : animals;
}

function ownState() {
    const s = getEngineState();
    return s && R.req && String(s.req) === R.req ? s : null;
}

function btn(text, onClick, cls = '') {
    return h(`div.PZ2QoL_btn${cls ? `.${cls}` : ''}`, { onClick: guard(text, onClick) }, h('span', { text }));
}

function guard(what, fn) {
    return () => {
        try {
            const r = fn();
            if (r && typeof r.catch === 'function') r.catch(e => reportError('ui', `Gene names: ${what} failed`, e));
        }
        catch (e) {
            reportError('ui', `Gene names: ${what} failed`, e);
        }
    };
}

async function start(plan) {
    if (R.starting) return;
    if (isListingBusy() || engineRunning()) {
        R.message = 'A listing, check or market check is running; rename when it is done.';
        return render();
    }
    R.starting = true;
    R.message = 'Asking the game for these animals…';
    render();
    try {
        // asked again once: a hello still in flight from before may come back empty
        let caps = await engineCaps({ force: true });
        if (!caps || !caps.ok) caps = await engineCaps({ force: true });
        if (!caps || !caps.ok) throw new Error('The game-side engine is not available (open Animal Storage).');
        if (!caps.rename) throw new Error("This game's engine can't rename (an older Main.ovl, or the game's rename call is missing).");
        if (caps.online === false) throw new Error('Renaming in Animal Storage needs an online Franchise.');
        const guids = await resolveGuids(plan.items.map(i => identityOf(i.a)), { retry: true });
        const rows = plan.items.filter(i => guids.has(i.a.key)).map(i => ({ guid: guids.get(i.a.key), key: i.a.key, from: i.from, to: i.to }));
        const job = encodeRenameJob(rows, { paceMs: getPaceMs('lister') });
        const noid = plan.items.length - job.items.length;
        dlog('rename', 'start', { asked: plan.items.length, inJob: job.items.length, noid: noid || undefined, named: plan.named || undefined, nogenes: plan.nogenes || undefined });
        if (!job.items.length) throw new Error(`None of them could be identified in Animal Storage${noid ? ` (${noid} without an id from the game)` : ''}.`);
        R.labels = new Map(job.items.map(r => [String(r.guid), { from: r.from, to: r.to }]));
        breadcrumb('rename_start');
        const r = await startEngineRun(job.text);
        if (!(r.ok || r.pending)) throw new Error(r.message || 'The engine refused the run.');
        R.req = String(r.req);
        R.message = [r.pending ? r.message : '', noid ? `${noid} couldn't be identified by the game and are left as they are.` : ''].filter(Boolean).join(' ');
    }
    catch (e) {
        R.req = '';
        R.message = String(e && e.message || e);
        dlog('rename', 'not_started', { msg: R.message });
    }
    finally {
        R.starting = false;
        render();
    }
}

function currentPlan() {
    return planRenames(shownAnimals(), nameOf);
}

function planSig(plan) {
    return JSON.stringify([plan.items.map(i => `${i.a.key}:${i.to}`), plan.named, plan.nogenes]);
}

function planBlock(plan) {
    const n = plan.items.length;
    const bits = [];
    if (plan.named) bits.push(`${plan.named} already ${plan.named === 1 ? 'has' : 'have'} a gene name`);
    if (plan.nogenes) bits.push(`${plan.nogenes} without Vitality (exhibit animals, fish)`);
    if (plan.noname) bits.push(`${plan.noname} without a name the mod can read`);
    const out = [
        h('div.PZ2QoL_renameText', { text: n ? `${n} of the animals shown get a gene name.` : 'Nothing to rename among the animals shown.' }),
    ];
    if (bits.length) out.push(h('div.PZ2QoL_renameSoft', { text: `Left as they are: ${bits.join('; ')}.` }));
    for (const i of plan.items.slice(0, 3)) out.push(h('div.PZ2QoL_renameRow', { text: `${i.from} → ${i.to}`, title: `${i.from} → ${i.to}` }));
    if (n > 3) out.push(h('div.PZ2QoL_renameSoft', { text: `…and ${n - 3} more.` }));
    out.push(h('div.PZ2QoL_renameSoft', { text: `One at a time, ${Math.round(getPaceMs('lister') / 1000)} s apart (the listing pace). Narrow it with the storage filters first if you like.` }));
    out.push(h('div.PZ2QoL_renameBtns', null,
        n && !R.starting ? btn(`Rename ${n}`, () => start(plan), 'positive') : null,
        btn('Close', () => close())));
    return out;
}

function runBlock(s) {
    const running = s.phase === 'running';
    const done = s.results.filter(r => r.status !== 'pending' && r.status !== 'working').length;
    const pct = s.total ? Math.round(done / s.total * 100) : 0;
    const cur = s.results[s.index];
    const label = cur && R.labels.get(String(cur.guid));
    const status = running
        ? `${Math.min(s.total, done + 1)}/${s.total}: ${label ? `${label.from} → ${label.to}` : ''}${s.message ? ` · ${s.message}` : ''}`
        : `${renameSummary(s)}.${s.phase !== 'done' && s.message ? ` ${s.message}` : ''}`;
    const bad = s.results.filter(r => r.status !== 'renamed' && r.status !== 'pending' && r.status !== 'working' && r.kind !== 'named');
    return [
        h(`div.PZ2QoL_run.${running ? 'running' : s.phase === 'done' ? 'done' : 'stopped'}`, null,
            h('div.PZ2QoL_progress', null, h('div.PZ2QoL_progressFill', { style: { width: `${pct}%` } })),
            h('div.PZ2QoL_listerStatus.clamp', { text: status, title: status }),
            bad.slice(-2).map(r => {
                const l = R.labels.get(String(r.guid));
                const text = `${l ? l.from : 'animal'}: ${r.detail || r.kind || r.status}`;
                return h('div.PZ2QoL_runSkip', { text: `Not renamed · ${text}`, title: text });
            })),
        h('div.PZ2QoL_renameBtns', null,
            running ? btn('Stop', () => stopEngineRun(), 'negative') : btn('Close', () => close())),
    ];
}

function render() {
    if (!R.card || !R.open) return;
    clear(R.body);
    const s = ownState();
    let parts;
    if (s) parts = runBlock(s);
    else {
        const plan = currentPlan();
        R.sig = planSig(plan);
        parts = planBlock(plan);
    }
    if (R.message) R.body.appendChild(h('div.PZ2QoL_renameNote', { text: R.message }));
    for (const p of parts) if (p) R.body.appendChild(p);
}

function place() {
    if (!R.card) return;
    const bar = document.querySelector('.PZ2QoL_bar.storage');
    const anchor = bar && bar.style.display !== 'none' ? bar : null;
    if (!R.open || !anchor || gameOnTop()) {
        R.card.style.display = 'none';
        return;
    }
    const r = anchor.getBoundingClientRect();
    const w = Math.min(520, Math.round(r.width));
    R.card.style.display = 'flex';
    R.card.style.left = `${Math.round(r.right - w)}px`;
    R.card.style.top = `${Math.round(r.bottom + 8)}px`;
    R.card.style.width = `${w}px`;
}

function install() {
    if (R.installed) return;
    R.installed = true;
    R.body = h('div.PZ2QoL_renameBody');
    R.card = h('div.PZ2QoL_card.PZ2QoL_rename', null,
        h('div.PZ2QoL_cardHeader', null,
            icon('IconGenetics', 'brown', 'md'),
            h('div.PZ2QoL_cardTitles', null,
                h('div.PZ2QoL_cardTitle', { text: 'Gene names' }),
                h('div.PZ2QoL_cardSubtitle', { text: 'Gene score, breeder score, name, Vitality, Longevity: "7987 Monifa 5858"' }))),
        R.body);
    R.card.style.display = 'none';
    document.body.appendChild(R.card);
    onEngineState(s => {
        if (R.open && s && R.req && String(s.req) === R.req) render();
    });
}

function close() {
    if (ownState() && ownState().phase === 'running') return;
    R.open = false;
    R.req = '';
    R.message = '';
    clearInterval(R.timer);
    R.timer = null;
    place();
}

// The storage bar's Gene names button: opens the card (what would change,
// and the Rename button); a click while it is open closes it, unless a run
// is going.
export function toggleGeneNames() {
    install();
    if (R.open) return close();
    R.open = true;
    R.message = '';
    // a finished run of ours: start from the plan again
    if (ownState() && ownState().phase !== 'running') R.req = '';
    breadcrumb('rename_open');
    render();
    place();
    clearInterval(R.timer);
    R.timer = setInterval(() => {
        try {
            place();
            // the storage list or its filters changed under the plan: shown
            // afresh (reading every stored animal is not free: once a second)
            R.ticks = (R.ticks || 0) + 1;
            if (R.ticks % 4 === 0 && R.open && !R.starting && !ownState() && planSig(currentPlan()) !== R.sig) render();
        }
        catch (e) {
            reportError('ui', 'Gene names card failed', e, { silent: true });
        }
    }, 300);
}

export function geneNamesRunning() {
    const s = ownState();
    return !!s && s.phase === 'running';
}
