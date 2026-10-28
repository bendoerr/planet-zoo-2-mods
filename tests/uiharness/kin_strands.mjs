// Better strands on the market (hub page, strandmark.js and badges.js): the
// park page's herd best (the player-wide setting herdStrands) against each
// row's genetic identity, else its grade. Three market rows rewritten as
// lions; the herd's best is Vitality 6, Longevity 5.
//   exact:  Longevity strands 6 and 2 from the identity       -> "▲Long6"
//   grade:  no identity, Longevity 92% (11 twelfths)          -> "▲Long6+"
//   none:   Longevity strands 5 and 5                         -> no mark
export const name = 'strands';

// Park (HUD page): a lion waiting at the trade centre with a 6/6 Longevity
// strand gets a "▲L6" tag on the Species board; the herd's best goes into
// the player-wide setting for the hub.
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
    facts.herd = await page.evaluate(async () => {
        const board = await import('/js/mods/pz2qol/kinboard.js');
        board.closeSpeciesBoard();
        const kin = await import('/js/mods/pz2qol/kin.js');
        const snap = JSON.parse(JSON.stringify(window.__kinFixture.snapshot));
        snap.seq = 811;
        snap.park = 'Harness Park';
        snap.tradeCentre = { id: '501', name: 'Trade Centre' };
        snap.animals.push({
            id: '8131', key: 'animal_8131', guid: 'gx8131', name: 'Imara', species: 'Lion', sex: 1, juv: false, contra: false,
            infertile: false, preg: false, hab: '', loc: 'Trade Centre', lt: 'trade', par: [], mates: [], age: 4,
            genes: { F: 'ABCDEFBCDEFA', I: 'ABCDEFCDEFAB', S: 'CCCCCCDDDDDD', L: 'AAAAAACCCCCC' },
        });
        for (const a of snap.animals) if (!a.lt) a.lt = a.hab ? 'habitat' : 'other';
        kin.applyKinSnapshot(snap);
        const st = await import('/js/mods/pz2qol/kinstrands.js');
        const best = st.herdBest(kin.getKinModel()).get('Lion');
        await new Promise(r => setTimeout(r, 300));
        const prefs = await import('/js/mods/pz2qol/prefs.js');
        return { best, pref: prefs.getPref('herdStrands') || null };
    });
    if (!facts.herd.best || facts.herd.best.L >= 6) problems.push('fixture lions: herd best ' + JSON.stringify(facts.herd.best));
    const pref = facts.herd.pref;
    if (!pref || pref.z !== 'Harness Park' || !new RegExp(`(^|,)Lion:${facts.herd.best && facts.herd.best.S}${facts.herd.best && facts.herd.best.L}(,|$)`).test(pref.sp || '')) {
        problems.push('herd strands not kept for the hub: ' + JSON.stringify(pref));
    }
    try {
        await page.evaluate(async () => (await import('/js/mods/pz2qol/kinboard.js')).openSpeciesBoard({ species: 'Lion' }));
        await page.waitForSelector('.PZ2QoL_kb:not(.hidden) .PZ2QoL_kbCard[data-id="8131"]', { timeout: 4000 });
        await page.waitForTimeout(300);
        facts.tradeCard = await page.evaluate(() => {
            const c = document.querySelector('.PZ2QoL_kb .PZ2QoL_kbCard[data-id="8131"]');
            const t = c && c.querySelector('.PZ2QoL_kbTag.strand');
            const others = [...document.querySelectorAll('.PZ2QoL_kb .PZ2QoL_kbCard:not([data-id="8131"]) .PZ2QoL_kbTag.strand')].length;
            return { tag: t ? t.textContent : null, title: t ? t.getAttribute('title') : null, others };
        });
        if (facts.tradeCard.tag !== '▲L6') problems.push('trade lion tag ' + JSON.stringify(facts.tradeCard));
        if (!/a Longevity strand of 6\/6/.test(facts.tradeCard.title || '')) problems.push('trade lion title ' + JSON.stringify(facts.tradeCard.title));
        if (facts.tradeCard.others) problems.push(`${facts.tradeCard.others} animals in habitats tagged`);
        await ctx.shot(page, 'strands_board');
    }
    finally {
        await page.evaluate(async () => (await import('/js/mods/pz2qol/kinboard.js')).closeSpeciesBoard());
    }
    facts.problems = problems;
    if (problems.length) throw new Error('kin strands (park): ' + problems.join('; '));
    return facts;
}

const ROWS = [
    { tag: 'exact', grade: 0.67, loci: ['AC', 'AC', 'BD', 'AB', 'BC', 'AD'] },
    { tag: 'grade', grade: 0.92, loci: null },
    { tag: 'none', grade: 0.83, loci: ['AA', 'AB', 'BA', 'BB', 'AA', 'CD'] },
];

export async function frontend(page, ctx) {
    const facts = ctx.facts || {};
    const problems = [];
    await ctx.gotoMarketTab(page, 0);
    facts.seeded = await page.evaluate(async rows => {
        const DS = await import('/js/common/core/DataStore.js');
        const { DataStoreCollection } = await import('/js/common/data/DataStoreCollection.js');
        const col = new DataStoreCollection(['hubAnimalsData', 'animalMarketData', 'list']);
        for (let i = 0; i < 50 && col._source.length == 0; i++) await new Promise(r => setTimeout(r, 100));
        const lit = s => '[STRING_LITERAL:Value=|' + s + '|]';
        const out = [];
        col._source.slice(0, rows.length).forEach((c, i) => {
            const r = rows[i];
            DS.setValue(c, 'species', '[Animal_Lion]');
            DS.setValue(c, 'isShoal', false);
            DS.setValue(c, 'isExhibit', false);
            DS.setValue(c.concat(['genetics', 'longevity']), 'value', r.grade);
            DS.setValue(c.concat(['genetics', 'size']), 'value', 0.5);
            for (let k = 0; k < 6; k++) {
                DS.setValue(c.concat(['geneticIdentities', 'longevity', 'genes']), 'gene' + k, r.loci ? lit(r.loci[k]) : '');
                // Vitality strands 3 and 3: never better than the herd's 6
                DS.setValue(c.concat(['geneticIdentities', 'size', 'genes']), 'gene' + k, lit(k < 3 ? 'AA' : 'CC'));
            }
            out.push({ tag: r.tag, id: String(DS.getValue(c, 'id')) });
        });
        col.dispose();
        const prefs = await import('/js/mods/pz2qol/prefs.js');
        prefs.setPref('herdStrands', { z: 'Harness Zoo', sp: 'Lion:65' });
        return out;
    }, ROWS);
    await page.waitForTimeout(1500); // badges refresh every 500 ms
    facts.marks = await page.evaluate(async seeded => {
        const DS = await import('/js/common/core/DataStore.js');
        const out = {};
        for (const r of document.querySelectorAll('.MarketAnimalListItem_root')) {
            for (let c = r._component; c; c = c._component) {
                if (!c.props || !Array.isArray(c.props.context)) continue;
                const s = seeded.find(x => x.id === String(DS.getValue(c.props.context, 'id')));
                if (!s) break;
                const chip = r.querySelector('.PZ2QoL_badge .PZ2QoL_badgeStrand');
                const badge = r.querySelector('.PZ2QoL_badge');
                out[s.tag] = { chip: chip ? chip.textContent : null, title: badge ? badge.getAttribute('title') : null };
                break;
            }
        }
        return out;
    }, facts.seeded);
    const want = { exact: '▲Long6', grade: '▲Long6+', none: null };
    for (const [tag, chip] of Object.entries(want)) {
        const got = facts.marks[tag];
        if (!got) {
            problems.push(`${tag}: row not on screen`);
            continue;
        }
        if (got.chip !== chip) problems.push(`${tag}: mark ${JSON.stringify(got.chip)} (want ${JSON.stringify(chip)})`);
    }
    if (facts.marks.exact && !/Better than any in your herd at Harness Zoo: a Longevity strand of 6\/6 \(your best: 5\/6\)/.test(facts.marks.exact.title || '')) {
        problems.push('exact: badge title ' + JSON.stringify(facts.marks.exact.title));
    }
    if (facts.marks.grade && !/at least 6\/6/.test(facts.marks.grade.title || '')) problems.push('grade: badge title ' + JSON.stringify(facts.marks.grade.title));
    await ctx.shot(page, 'strands_market');
    // no herd for the species: no mark
    await page.evaluate(async () => (await import('/js/mods/pz2qol/prefs.js')).setPref('herdStrands', { z: 'Harness Zoo', sp: 'Tiger:66' }));
    await page.waitForTimeout(1200);
    facts.marksAfter = await page.evaluate(() => document.querySelectorAll('.PZ2QoL_badgeStrand').length);
    if (facts.marksAfter) problems.push(`${facts.marksAfter} marks left with no lion herd`);
    await page.evaluate(async () => (await import('/js/mods/pz2qol/prefs.js')).setPref('herdStrands', undefined));

    facts.problems = problems;
    if (problems.length) throw new Error('kin strands: ' + problems.join('; '));
    return facts;
}
