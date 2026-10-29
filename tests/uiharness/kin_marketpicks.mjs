// Market picks (experimental, off by default; marketpicks.js, badges.js,
// bars.js): the park's herd facts (the setting herdStrands, field mk)
// against four market rows rewritten as lions. The herd: a male mate (V/L 8
// of 12, F/I strands A and B) and a female (V/L 12, F all A, I all B); its
// pairs' young 60 in every gene.
//   strands: a male, V/L 6, F/I strands all C and D        -> "Pick +27.5", sure
//   grades:  a female, no strands, V 100% L 92%            -> "Pick +10.6", rough
//   poor:    a male, V/L 2, F/I strands like the female's  -> no pick
//   old:     an infertile elderly female                    -> no pick
// Off: no pick marks, the page's order as the game's, only the switch on the
// toolbar. On: the marks, inside their rows; First puts the two first; Only
// shows only them; off again restores the page.
// Park (HUD page): the herd's facts go into herdStrands (field mk) only
// while the setting is on.
export const name = 'marketpicks';

import { seedZooKin } from './kin_fixture.mjs';

export async function hud(page, ctx) {
    const facts = ctx.facts || {};
    const problems = [];
    const onAnimals = await page.evaluate(() => {
        const r = document.querySelector('.ManagementAnimals_root');
        return !!r && r.getBoundingClientRect().width > 0;
    });
    if (!onAnimals) {
        await page.evaluate(() => engine.trigger('World_ShowHUD'));
        await page.waitForTimeout(800);
        await page.evaluate(() => engine.trigger('Management_SetManagementIndex', 7 /* ManagementSectionID.Animals */));
        await page.waitForSelector('.ManagementAnimals_root', { state: 'visible', timeout: 15000 });
        await page.waitForTimeout(1200);
    }
    await seedZooKin(page);
    facts.park = await page.evaluate(async () => {
        const kin = await import('/js/mods/pz2qol/kin.js');
        const prefs = await import('/js/mods/pz2qol/prefs.js');
        const core = await import('/js/mods/pz2qol/marketpickcore.js');
        const wait = ms => new Promise(r => setTimeout(r, ms));
        kin.setKinSettings({ marketPicks: false });
        const snap = JSON.parse(JSON.stringify(window.__kinFixture.snapshot));
        snap.seq = 821;
        snap.park = 'Harness Park';
        // the game's letters are A-D
        for (const a of snap.animals) for (const k of Object.keys(a.genes || {})) a.genes[k] = a.genes[k].replace(/[E-H]/g, c => 'ABCD'['EFGH'.indexOf(c)]);
        for (const a of snap.animals) if (!a.lt) a.lt = a.hab ? 'habitat' : 'other';
        kin.applyKinSnapshot(snap);
        await wait(300);
        const off = prefs.getPref('herdStrands') || null;
        kin.setKinSettings({ marketPicks: true });
        await wait(300);
        const on = prefs.getPref('herdStrands') || null;
        const lion = on && on.mk ? core.decodeMarketFacts(on.mk).get('Lion') : null;
        kin.setKinSettings({ marketPicks: false });
        await wait(300);
        const offAgain = prefs.getPref('herdStrands') || null;
        const log = (await import('/js/mods/pz2qol/debuglog.js')).getLogLines(2000, 'kin').filter(l => / kin picks_herd /.test(l));
        return {
            log: log.slice(-1)[0] || null,
            off: off ? Object.keys(off).sort().join(',') : null, on: on ? Object.keys(on).sort().join(',') : null, mkChars: on && on.mk ? on.mk.length : 0,
            lion: lion ? { n: lion.n, K: lion.K, mates: lion.mates.length, bench: !!lion.bench } : null, offAgain: offAgain ? Object.keys(offAgain).sort().join(',') : null,
        };
    });
    const p = facts.park;
    if (p.off !== 'sp,z') problems.push('off: herdStrands holds ' + p.off);
    if (p.on !== 'mk,sp,z' || !p.lion || !p.lion.mates || !p.lion.bench) problems.push('on: ' + JSON.stringify(p));
    if (p.offAgain !== 'sp,z') problems.push('off again: herdStrands holds ' + p.offAgain);
    if (!/ kin picks_herd zoo=.*Harness Park.* species=\d+ chars=\d+/.test(p.log || '')) problems.push('debug log: ' + p.log);
    facts.problems = problems;
    if (problems.length) throw new Error('market picks (park): ' + problems.join('; '));
    return facts;
}

// six loci, each strand A's letter then strand B's
const pairs = (a, b) => [0, 1, 2, 3, 4, 5].map(i => a[i] + b[i]);
const ROWS = [
    { tag: 'strands', gender: 0, maturity: 2, age: 4, grades: [0.5, 0.5, 1, 1], id: { size: pairs('AAACCC', 'AAACCC'), longevity: pairs('AAACCC', 'AAACCC'), fertility: pairs('CCCCCC', 'DDDDDD'), immunity: pairs('CCCCCC', 'DDDDDD') } },
    { tag: 'grades', gender: 1, maturity: 2, age: 4, grades: [1, 0.92, 0.5, 0.5], id: null },
    { tag: 'poor', gender: 0, maturity: 2, age: 4, grades: [1 / 6, 1 / 6, 0, 0], id: { size: pairs('ACCCCC', 'ACCCCC'), longevity: pairs('ACCCCC', 'ACCCCC'), fertility: pairs('AAAAAA', 'AAAAAA'), immunity: pairs('BBBBBB', 'BBBBBB') } },
    { tag: 'old', gender: 1, maturity: 6, age: 13, grades: [0.5, 0.5, 1, 1], id: { size: pairs('AAACCC', 'AAACCC'), longevity: pairs('AAACCC', 'AAACCC'), fertility: pairs('CCCCCC', 'DDDDDD'), immunity: pairs('CCCCCC', 'DDDDDD') } },
];

// What the page shows: per seeded row its pick and why, the badge inside
// its row; the rows on screen top to bottom; the toolbar's pick controls.
async function read(page, seeded) {
    return page.evaluate(async seeded => {
        const DS = await import('/js/common/core/DataStore.js');
        const marks = {};
        const order = [];
        const rows = [...document.querySelectorAll('.MarketAnimalListItem_root')]
            .filter(r => r.getBoundingClientRect().height > 0)
            .sort((x, y) => x.getBoundingClientRect().top - y.getBoundingClientRect().top);
        for (const r of rows) {
            let id = null;
            for (let c = r._component; c; c = c._component) {
                if (c.props && Array.isArray(c.props.context)) {
                    id = String(DS.getValue(c.props.context, 'id'));
                    break;
                }
            }
            const s = seeded.find(x => x.id === id);
            order.push(s ? s.tag : 'other');
            const pick = r.querySelector('.PZ2QoL_badge .PZ2QoL_badgePick');
            const why = r.querySelector('.PZ2QoL_badge .PZ2QoL_badgePickWhy');
            const badge = r.querySelector('.PZ2QoL_badge');
            const host = r.querySelector('.MarketAnimalListItem_listRoot');
            const br = badge && badge.getBoundingClientRect(), hr = host && host.getBoundingClientRect();
            const m = {
                pick: pick ? pick.textContent : null, why: why ? why.textContent : null,
                inside: !!(br && hr && br.left >= hr.left - 1 && br.right <= hr.right + 1), badgeH: br ? Math.round(br.height) : 0,
                whyClipped: !!(why && why.scrollWidth > why.clientWidth + 1),
            };
            if (s) marks[s.tag] = m;
            else if (pick) marks.other = (marks.other || 0) + 1;
        }
        const sw = document.querySelector('.PZ2QoL_pickSwitch');
        const group = document.querySelector('.PZ2QoL_pickGroup');
        const count = document.querySelector('.PZ2QoL_pickGroup .PZ2QoL_pill.picks');
        const bar = document.querySelector('.PZ2QoL_bar.market');
        return {
            marks, order, switchOn: !!(sw && sw.classList.contains('on')), switchShown: !!(sw && sw.getBoundingClientRect().width > 0),
            groupShown: !!(group && group.getBoundingClientRect().width > 0), count: count ? count.textContent : null,
            barH: bar ? Math.round(bar.getBoundingClientRect().height) : 0, picks: document.querySelectorAll('.PZ2QoL_badgePick').length,
        };
    }, seeded);
}

// selector, or [selector, text]: the element of that text
async function click(page, target) {
    await page.evaluate(([sel, text]) => {
        const el = [...document.querySelectorAll(sel)].find(e => text == null || e.textContent === text);
        if (!el) throw new Error('missing ' + sel + ' ' + (text || ''));
        el.click();
    }, Array.isArray(target) ? target : [target, null]);
    await page.waitForTimeout(1200); // badges refresh every 500 ms
}

export async function frontend(page, ctx) {
    const facts = ctx.facts || {};
    const problems = [];
    await ctx.gotoMarketTab(page, 0);
    facts.seeded = await page.evaluate(async ({ rows, litText }) => {
        const lit = new Function('s', litText);
        const DS = await import('/js/common/core/DataStore.js');
        const { DataStoreCollection } = await import('/js/common/data/DataStoreCollection.js');
        const col = new DataStoreCollection(['hubAnimalsData', 'animalMarketData', 'list']);
        for (let i = 0; i < 50 && col._source.length == 0; i++) await new Promise(r => setTimeout(r, 100));
        const out = [];
        col._source.slice(0, rows.length).forEach((c, i) => {
            const r = rows[i];
            DS.setValue(c, 'species', '[Animal_Lion]');
            DS.setValue(c, 'isShoal', false);
            DS.setValue(c, 'isExhibit', false);
            DS.setValue(c, 'gender', r.gender);
            DS.setValue(c, 'maturity', r.maturity);
            DS.setValue(c, 'age', `[AnimalExchange_Animal_Age:Years=(${r.age.toFixed(1)})]`);
            ['size', 'longevity', 'fertility', 'immunity'].forEach((g, k) => {
                DS.setValue(c.concat(['genetics', g]), 'value', r.grades[k]);
                for (let l = 0; l < 6; l++) DS.setValue(c.concat(['geneticIdentities', g, 'genes']), 'gene' + l, r.id ? lit(r.id[g][l]) : '');
            });
            out.push({ tag: r.tag, id: String(DS.getValue(c, 'id')) });
        });
        col.dispose();
        const core = await import('/js/mods/pz2qol/marketpickcore.js');
        const M = 0, F = 1;
        const mk = core.encodeMarketFacts(new Map([['Lion', {
            n: 10, K: 2, inf: 15, best: { S: 5, L: 5 }, copies: { S: 8, L: 8 },
            bench: { size: 0.6, longevity: 0.6, fertility: 0.6, immunity: 0.6, pairs: 2 },
            mates: [{ sex: M, S: 8, L: 8, F: 'AAAAAABBBBBB', I: 'AAAAAABBBBBB' }, { sex: F, S: 12, L: 12, F: 'AAAAAAAAAAAA', I: 'BBBBBBBBBBBB' }],
        }]]));
        (await import('/js/mods/pz2qol/prefs.js')).setPref('herdStrands', { z: 'Harness Zoo', sp: 'Lion:55', mk });
        (await import('/js/mods/pz2qol/kin.js')).setKinSettings({ marketPicks: false });
        return out;
    }, { rows: ROWS, litText: "return '[STRING_LITERAL:Value=|' + s + '|]';" });
    await page.waitForTimeout(1500);

    // off: nothing new on the rows, only the switch on the toolbar
    facts.off = await read(page, facts.seeded);
    if (facts.off.picks) problems.push(`off: ${facts.off.picks} pick marks`);
    const noBadge = Object.entries(facts.off.marks).filter(([, m]) => !m.badgeH).map(([t]) => t);
    if (noBadge.length) problems.push(`off: no score badge on ${noBadge.join(', ')}`);
    if (facts.off.switchOn || !facts.off.switchShown) problems.push('off: the switch ' + JSON.stringify({ on: facts.off.switchOn, shown: facts.off.switchShown }));
    if (facts.off.groupShown) problems.push('off: the picks controls are shown');
    await ctx.shot(page, 'marketpicks_off');

    // on, from the toolbar's switch
    await click(page, '.PZ2QoL_pickSwitch');
    facts.on = await read(page, facts.seeded);
    facts.setting = await page.evaluate(async () => (await import('/js/mods/pz2qol/kin.js')).getKinSettings().marketPicks);
    if (facts.setting !== true) problems.push('the switch did not turn the setting on');
    const want = {
        strands: { pick: 'Pick +27.5', why: 'young: Fertility +40, Immunity +40 · sure' },
        grades: { pick: 'Pick +10.6', why: 'Vitality and Longevity 6/6 strands; your best is 5/6 · rough' },
        poor: { pick: null, why: null },
        old: { pick: null, why: null },
    };
    for (const [tag, w] of Object.entries(want)) {
        const got = facts.on.marks[tag];
        if (!got) {
            problems.push(`${tag}: row not on screen`);
            continue;
        }
        if (got.pick !== w.pick || got.why !== w.why) problems.push(`${tag}: ${JSON.stringify({ pick: got.pick, why: got.why })}`);
        if (w.pick && !got.inside) problems.push(`${tag}: the badge leaves its row`);
        if (w.pick && got.badgeH > 24) problems.push(`${tag}: the badge wraps (${got.badgeH} px)`);
    }
    if (facts.on.marks.other) problems.push(`${facts.on.marks.other} picks on rows of species with no herd`);
    if (!facts.on.groupShown || facts.on.count !== '2 on this page, best +27.5') problems.push('on: the toolbar ' + JSON.stringify({ shown: facts.on.groupShown, count: facts.on.count }));
    if (facts.on.barH > facts.off.barH + 2) problems.push(`the toolbar grew from ${facts.off.barH} to ${facts.on.barH} px`);
    // the debug log: the setting, the page, each pick once
    facts.log = await page.evaluate(async () => (await import('/js/mods/pz2qol/debuglog.js')).getLogLines(2000, 'ui').filter(l => / ui picks?(_setting)? /.test(l)));
    const has = re => facts.log.some(l => re.test(l));
    if (!has(/ ui picks_setting on=true mode=mark/)) problems.push('log: no picks_setting');
    if (!has(/ ui picks species=.*Lion.* rows=\d+ scored=3 identity=3\/4 picks=2 best=\+27\.5 herd=.*Harness Zoo.* mode=mark/)) problems.push('log: no page line ' + JSON.stringify(facts.log.filter(l => / ui picks /.test(l))));
    if (facts.log.filter(l => / ui pick species=Lion /.test(l)).length !== 2) problems.push('log: pick lines ' + JSON.stringify(facts.log.filter(l => / ui pick /.test(l))));
    await ctx.shot(page, 'marketpicks_on');

    // this page's picks first, the best first
    await click(page, ['.PZ2QoL_pickGroup .PZ2QoL_segItem', 'First']);
    facts.first = await read(page, facts.seeded);
    if (facts.first.order.slice(0, 2).join(',') !== 'strands,grades') problems.push('first: ' + facts.first.order.join(','));
    if (facts.first.order.length !== facts.on.order.length) problems.push(`first: ${facts.first.order.length} rows (was ${facts.on.order.length})`);
    await ctx.shot(page, 'marketpicks_first');

    // only them
    await click(page, ['.PZ2QoL_pickGroup .PZ2QoL_segItem', 'Only']);
    facts.only = await read(page, facts.seeded);
    if (facts.only.order.join(',') !== 'strands,grades') problems.push('only: ' + facts.only.order.join(','));
    await ctx.shot(page, 'marketpicks_only');

    // back to marks, then off: the game's page as it was
    await click(page, ['.PZ2QoL_pickGroup .PZ2QoL_segItem', 'Mark']);
    await click(page, '.PZ2QoL_pickSwitch');
    facts.offAgain = await read(page, facts.seeded);
    if (facts.offAgain.picks) problems.push(`off again: ${facts.offAgain.picks} pick marks`);
    if (facts.offAgain.order.join(',') !== facts.off.order.join(',')) problems.push(`off again: the order ${facts.offAgain.order.join(',')} (was ${facts.off.order.join(',')})`);
    await page.evaluate(async () => {
        (await import('/js/mods/pz2qol/prefs.js')).setPref('herdStrands', undefined);
        (await import('/js/mods/pz2qol/kin.js')).setKinSettings({ marketPicks: false });
    });

    facts.problems = problems;
    if (problems.length) throw new Error('market picks: ' + problems.join('; '));
    return facts;
}
