// Browser-harness scenario: the Species board's Gene names (kinboard.js
// geneNamesEl, kinmoves.js renameAnimal), on the in-park HUD page with the
// kin fixture and a fake Lua side for PZ2QoL_KinRename ->
// PZ2QoL_KinRenameResult (gated by window.__kgn.active). One lion already
// has a gene name. Checks the header button, the strip with what would
// change (count, "Left as they are", examples, Rename N), nothing sent
// before Rename, one request per animal with a gene name for a lion of
// this species, the done line, Close, and the layout.
import { seedZooKin } from './kin_fixture.mjs';

export const name = 'genenames';

const BOARD = '/js/mods/pz2qol/kinboard.js';

async function click(locator) {
    try {
        await locator.first().click({ timeout: 2500 });
    }
    catch (e) {
        await locator.first().dispatchEvent('click');
    }
}

const stripText = page => page.evaluate(() => {
    const n = document.querySelector('.PZ2QoL_kb .PZ2QoL_kbGeneNames');
    return n ? n.innerText.replace(/\s+/g, ' ').trim() : '';
});

export async function hud(page, ctx) {
    const facts = ctx.facts || {};
    const problems = [];
    facts.problems = problems;

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
    facts.setup = await page.evaluate(async () => {
        const board = await import('/js/mods/pz2qol/kinboard.js');
        board.closeSpeciesBoard();
        const kin = await import('/js/mods/pz2qol/kin.js');
        const snap = JSON.parse(JSON.stringify(window.__kinFixture.snapshot));
        snap.seq = 801;
        const lions = snap.animals.filter(a => a.species === 'Lion' && !a.exhibit);
        // one lion has a gene name already
        lions[0].name = '7987 Leo 5858';
        kin.applyKinSnapshot(snap);
        window.__kgn = { active: true, asks: [] };
        if (engine.events) engine.events.PZ2QoL_KinRename = [];
        engine.on('PZ2QoL_KinRename', (reqId, id, nm) => {
            const k = window.__kgn;
            if (!k || !k.active) return;
            k.asks.push({ id: String(id), name: String(nm) });
            setTimeout(() => engine.trigger('PZ2QoL_KinRenameResult', reqId, true, String(nm)), 15);
        });
        return { lions: lions.map(a => a.id), named: lions[0].id };
    });

    try {
        await page.evaluate(async url => (await import(url)).openSpeciesBoard({ species: 'Lion' }), BOARD);
        await page.waitForSelector('.PZ2QoL_kb .PZ2QoL_kpMainHead', { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(400);
        const btn = page.locator('.PZ2QoL_kb .PZ2QoL_kpMainHead .PZ2QoL_kpBtn', { hasText: 'Gene names' });
        facts.button = await btn.count();
        if (facts.button !== 1) problems.push(`header button: ${facts.button}`);

        // 1. the strip: what would change, nothing sent
        await click(btn);
        await page.waitForTimeout(300);
        facts.plan = await stripText(page);
        await ctx.shot(page, 'kgn_1_plan');
        const want = facts.setup.lions.length - 1;
        if (!facts.plan.includes(`${want} Lion in the park get a gene name`)) problems.push(`strip count: ${facts.plan.slice(0, 200)}`);
        if (!/Left as they are: 1 already has a gene name/.test(facts.plan)) problems.push(`strip left: ${facts.plan.slice(0, 300)}`);
        if (!/→ \d{4} .+ \d{4}/.test(facts.plan)) problems.push(`strip examples: ${facts.plan.slice(0, 300)}`);
        if (!facts.plan.includes(`Rename ${want}`)) problems.push(`strip button: ${facts.plan.slice(-80)}`);
        if ((await page.evaluate(() => window.__kgn.asks.length)) !== 0) problems.push('a rename was sent before Rename');
        facts.layout = await page.evaluate(() => {
            const s = document.querySelector('.PZ2QoL_kb .PZ2QoL_kbGeneNames');
            const b = document.querySelector('.PZ2QoL_kb');
            if (!s || !b) return null;
            const r = s.getBoundingClientRect(), q = b.getBoundingClientRect();
            return { inside: r.left >= q.left - 0.5 && r.right <= q.right + 0.5 && r.top >= q.top - 0.5 && r.bottom <= q.bottom + 0.5, h: Math.round(r.height) };
        });
        if (!facts.layout || !facts.layout.inside) problems.push(`strip layout: ${JSON.stringify(facts.layout)}`);

        // 2. Rename: one request per lion without a gene name, each a gene name
        await click(page.locator('.PZ2QoL_kb .PZ2QoL_kbGeneNames .PZ2QoL_kpBtn', { hasText: /^Rename \d+$/ }));
        for (let i = 0; i < 80; i++) {
            if (/Renamed \d+ of \d+/.test(await stripText(page))) break;
            await page.waitForTimeout(100);
        }
        facts.asks = await page.evaluate(() => window.__kgn.asks.slice());
        facts.done = await stripText(page);
        await ctx.shot(page, 'kgn_2_done');
        const ids = new Set(facts.asks.map(a => a.id));
        if (facts.asks.length !== want || ids.has(facts.setup.named) || facts.asks.some(a => !facts.setup.lions.includes(a.id))) problems.push(`asks: ${JSON.stringify(facts.asks.map(a => a.id))}`);
        if (facts.asks.some(a => !/^\d{4} .+ \d{4}$/.test(a.name))) problems.push(`names: ${JSON.stringify(facts.asks.map(a => a.name))}`);
        if (!facts.done.includes(`Renamed ${want} of ${want}.`)) problems.push(`done: ${facts.done}`);

        // 3. Close: the strip goes
        await click(page.locator('.PZ2QoL_kb .PZ2QoL_kbGeneNames .PZ2QoL_kpBtn', { hasText: /^Close$/ }));
        await page.waitForTimeout(250);
        facts.closed = (await stripText(page)) === '';
        if (!facts.closed) problems.push('the strip stayed after Close');
    }
    finally {
        await page.evaluate(async url => {
            if (window.__kgn) window.__kgn.active = false;
            (await import(url)).closeSpeciesBoard();
        }, BOARD).catch(() => {});
    }
    if (problems.length) throw new Error('gene names (board): ' + problems.join('; '));
    return facts;
}
