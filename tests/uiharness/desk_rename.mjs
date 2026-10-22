// Browser-harness scenario: the storage bar's Gene names (renamer.js),
// through a fake Lua engine in the page that answers a 'rename' job like
// pz2qol.lister.lua: each animal's row gets the new name, one at a time.
// Checks: the button in the bar (the bar stays two rows high), the card
// with what would change (an animal already named that way and one without
// Vitality left alone), the job (rename mode, one line per animal, the name
// percent-encoded), the rows renamed, the card's summary, no listing or
// quick-trade event, layout.

export const name = 'gene names';

async function click(locator) {
    try {
        await locator.first().click({ timeout: 2500 });
    }
    catch (e) {
        await locator.first().dispatchEvent('click');
    }
}

const LIT = s => `[STRING_LITERAL:Value=|${s}|]`;

async function installFakeEngine(page) {
    await page.evaluate(async () => {
        const DS = await import('/js/common/core/DataStore.js');
        const LIST = ['hubAnimalsData', 'animalStorageData', 'list'];
        const { DataStoreCollection } = await import('/js/common/data/DataStoreCollection.js');
        const col = new DataStoreCollection(LIST);
        for (let i = 0; i < 50 && col._source.length == 0; i++) await new Promise(r => setTimeout(r, 100));
        const keysNow = () => col._source.map(c => c[c.length - 1]);
        for (const k of ['__md', '__mdf', '__mq']) if (window[k]) window[k].active = false;
        const f = window.__rn = { active: true, jobs: [], events: [], stepMs: 60, runSeq: 300 };
        const guidOf = key => {
            const id = DS.getValue(LIST.concat(key), 'id');
            return id == undefined ? null : String(800000000000000000n + BigInt(String(id).replace(/\D/g, '') || 0));
        };
        if (!window.__rnHooks) {
            window.__rnHooks = true;
            for (const ev of ['AnimalStorage_AddToMarket', 'AnimalStorage_QuickTrade_Cash', 'AnimalStorage_QuickTrade_Credits', 'AnimalStorage_Rehome']) {
                engine.on(ev, () => { if (window.__rn) window.__rn.events.push(ev); });
            }
        }
        engine.on('PZ2QoL_ListerHello', req => {
            if (!f.active) return;
            setTimeout(() => engine.trigger('PZ2QoL_ListerCaps', req, JSON.stringify({ ok: true, missing: [], storage: true, online: true, rows: Math.max(1, keysNow().length), running: !!f.running, version: 1, check: true, unlist: true, rename: true })), 20);
        });
        engine.on('PZ2QoL_ListerResolve', (req, csv) => {
            if (!f.active) return;
            const ids = {}, rows = {}, failed = [];
            for (const k of String(csv).split(',')) {
                const g = guidOf(k);
                if (!g) {
                    failed.push(k);
                    continue;
                }
                ids[k] = g;
                const at = p => DS.getValue(LIST.concat(k), p);
                rows[k] = { name: at('name'), species: at('species'), gender: at('gender') };
            }
            setTimeout(() => engine.trigger('PZ2QoL_ListerIds', req, JSON.stringify({ ids, rows, failed })), 20);
        });
        engine.on('PZ2QoL_ListerStart', (req, text) => {
            if (!f.active) return;
            const lines = String(text).split('\n');
            const head = lines[0];
            const items = lines.slice(1).map(l => {
                const [guid, key, enc] = l.split(' ');
                return { guid, key, name: decodeURIComponent(enc || '') };
            });
            f.jobs.push({ req, head, items, lines: lines.slice(1) });
            if (!/ rename$/.test(head)) {
                setTimeout(() => engine.trigger('PZ2QoL_ListerState', JSON.stringify({ run: 0, req, phase: 'done', refused: true, total: 0, index: 0, step: '', waited: 0, message: 'only renames here', results: [] })), 20);
                return;
            }
            f.running = true;
            f.runSeq++;
            const st = { run: f.runSeq, req, mode: 'rename', phase: 'running', total: items.length, index: 0, step: 'server', waited: 0, paceMs: +head.split(' ')[1], message: '',
                results: items.map(i => ({ guid: i.guid, status: 'pending', kind: '', price: null, hours: null, capped: null, usedDefault: false, detail: '', verdict: null })) };
            const send = () => engine.trigger('PZ2QoL_ListerState', JSON.stringify(st));
            let i = 0;
            const tick = () => {
                if (i >= items.length) {
                    st.phase = 'done';
                    st.step = '';
                    st.message = `Renamed ${i} of ${items.length}.`;
                    f.running = false;
                    return send();
                }
                st.index = i;
                st.results[i].status = 'working';
                st.step = 'renamed';
                st.message = 'Waiting for the new name to show.';
                send();
                const it = items[i];
                const key = keysNow().find(k => guidOf(k) === it.guid);
                setTimeout(() => {
                    if (key) DS.setValue(LIST.concat(key), 'name', `[STRING_LITERAL:Value=|${it.name}|]`);
                    st.results[i].status = key ? 'renamed' : 'skipped';
                    st.results[i].kind = key ? '' : 'gone';
                    i++;
                    st.step = 'pause';
                    send();
                    setTimeout(tick, f.stepMs);
                }, f.stepMs);
            };
            setTimeout(tick, 30);
        });
    });
}

export async function frontend(page, ctx) {
    const facts = ctx.facts || {};
    const problems = [];
    facts.problems = problems;
    await ctx.gotoMarketTab(page, 1);
    // storage: known names and genes; row 0 already has a gene name, row 1 is an
    // exhibit animal (no Vitality), row 2 is Monifa (79/87, V 58, L 58)
    facts.setup = await page.evaluate(async () => {
        const lit = s => `[STRING_LITERAL:Value=|${s}|]`;
        window.__PZ2QOL_TEST_FRANCHISE = true;
        const DS = await import('/js/common/core/DataStore.js');
        const LIST = ['hubAnimalsData', 'animalStorageData', 'list'];
        const { DataStoreCollection } = await import('/js/common/data/DataStoreCollection.js');
        const col = new DataStoreCollection(LIST);
        for (let i = 0; i < 50 && col._source.length == 0; i++) await new Promise(r => setTimeout(r, 100));
        const keys = col._source.map(c => c[c.length - 1]);
        col.dispose();
        const setGenes = (k, v, l, fe, im) => {
            for (const [g, x] of [['size', v], ['longevity', l], ['fertility', fe], ['immunity', im]]) DS.setValue(LIST.concat(k, 'genetics', g), 'value', x);
        };
        keys.forEach((k, i) => {
            DS.setValue(LIST.concat(k), 'isShoal', false);
            DS.setValue(LIST.concat(k), 'isExhibit', i === 1);
            DS.setValue(LIST.concat(k), 'auctionTimerSeconds', -1);
            DS.setValue(LIST.concat(k), 'name', lit(i === 0 ? '7987 Named 5858' : i === 2 ? 'Monifa' : `Animal ${i}`));
            setGenes(k, Math.fround(i === 2 ? 7 / 12 : 0.5), Math.fround(i === 2 ? 7 / 12 : 0.5), Math.fround(i === 2 ? 1 : 0.5), Math.fround(i === 2 ? 1 : 0.5));
        });
        DS.setValue(['hubAnimalsData', 'animalStorageData'], 'selectedAnimalIDs', []);
        return { keys, total: keys.length };
    });
    await installFakeEngine(page);
    try {
        // 1. the button sits in the bar; the bar stays two rows high
        const btn = page.locator('.PZ2QoL_bar.storage .PZ2QoL_geneNamesBtn');
        facts.button = { count: await btn.count(), text: (await btn.first().innerText().catch(() => '')).trim() };
        if (facts.button.count !== 1 || facts.button.text !== 'Gene names') problems.push(`button: ${JSON.stringify(facts.button)}`);
        facts.barHeight = await page.evaluate(() => Math.round(document.querySelector('.PZ2QoL_bar.storage').getBoundingClientRect().height));
        if (facts.barHeight > 90) problems.push(`storage toolbar too tall: ${facts.barHeight}px`);

        // 2. the card: what would change, nothing sent yet
        await click(btn);
        await page.waitForTimeout(400);
        facts.card = await page.evaluate(() => {
            const c = document.querySelector('.PZ2QoL_rename');
            if (!c) return null;
            const r = c.getBoundingClientRect();
            return { shown: getComputedStyle(c).display !== 'none' && r.width > 0, text: c.innerText, rect: { l: r.left, t: r.top, r: r.right, b: r.bottom }, vw: innerWidth, vh: innerHeight,
                rows: [...c.querySelectorAll('.PZ2QoL_renameRow')].map(e => e.innerText.trim()), rename: [...c.querySelectorAll('.PZ2QoL_btn')].map(e => e.innerText.trim()) };
        });
        await ctx.shot(page, 'rn_1_plan');
        const want = facts.setup.total - 2;
        if (!facts.card || !facts.card.shown) problems.push('the card did not open');
        else {
            if (!facts.card.text.includes(`${want} of the animals shown get a gene name`)) problems.push(`card count: ${facts.card.text.slice(0, 200)}`);
            if (!/Left as they are: 1 already has a gene name; 1 without Vitality/.test(facts.card.text)) problems.push(`card skips: ${facts.card.text.slice(0, 300)}`);
            if (!facts.card.rows.includes('Monifa → 7987 Monifa 5858')) problems.push(`card examples: ${JSON.stringify(facts.card.rows)}`);
            if (!facts.card.rename.includes(`Rename ${want}`)) problems.push(`card buttons: ${JSON.stringify(facts.card.rename)}`);
            const r = facts.card.rect;
            if (r.l < 0 || r.t < 0 || r.r > facts.card.vw + 0.5 || r.b > facts.card.vh + 0.5) problems.push(`card outside the view: ${JSON.stringify(r)}`);
        }
        if ((await page.evaluate(() => window.__rn.jobs.length)) !== 0) problems.push('a job was sent before Rename');

        // 3. Rename: one job, rename mode, the shown animals but the two left alone
        await click(page.locator('.PZ2QoL_rename .PZ2QoL_btn', { hasText: /^Rename \d+$/ }));
        for (let i = 0; i < 100; i++) {
            const done = await page.evaluate(() => /Renamed \d+ of \d+/.test((document.querySelector('.PZ2QoL_rename') || {}).innerText || ''));
            if (done) break;
            await page.waitForTimeout(150);
        }
        facts.job = await page.evaluate(() => {
            const j = window.__rn.jobs[0];
            return j ? { n: window.__rn.jobs.length, head: j.head, count: j.items.length, names: j.items.map(i => i.name), lines: j.lines.slice(0, 3) } : null;
        });
        if (!facts.job || facts.job.n !== 1 || !/^v1 \d+ rename$/.test(facts.job.head) || facts.job.count !== want) problems.push(`job: ${JSON.stringify(facts.job)}`);
        else {
            if (!facts.job.names.includes('7987 Monifa 5858') || facts.job.names.some(n => !/^\d{4} .+ \d{4}$/.test(n)) || facts.job.names.some(n => /Named/.test(n))) problems.push(`job names: ${JSON.stringify(facts.job.names.slice(0, 6))}`);
            if (facts.job.lines.some(l => l.split(' ').length !== 3)) problems.push(`job lines: ${JSON.stringify(facts.job.lines)}`);
        }
        facts.after = await page.evaluate(async keys => {
            const DS = await import('/js/common/core/DataStore.js');
            const LIST = ['hubAnimalsData', 'animalStorageData', 'list'];
            const c = document.querySelector('.PZ2QoL_rename');
            return { names: keys.slice(0, 4).map(k => DS.getValue(LIST.concat(k), 'name')), text: c ? c.innerText : '', btns: c ? [...c.querySelectorAll('.PZ2QoL_btn')].map(e => e.innerText.trim()) : [] };
        }, facts.setup.keys);
        await ctx.shot(page, 'rn_2_done');
        if (facts.after.names[2] !== LIT('7987 Monifa 5858') || facts.after.names[0] !== LIT('7987 Named 5858') || facts.after.names[1] !== LIT('Animal 1')) problems.push(`rows after: ${JSON.stringify(facts.after.names)}`);
        if (!facts.after.text.includes(`Renamed ${want} of ${want}`) || !facts.after.btns.includes('Close')) problems.push(`card after: ${facts.after.text.slice(0, 200)}`);

        // 4. Close; opened again, nothing left to rename among the shown
        await click(page.locator('.PZ2QoL_rename .PZ2QoL_btn', { hasText: /^Close$/ }));
        await page.waitForTimeout(300);
        facts.closed = await page.evaluate(() => getComputedStyle(document.querySelector('.PZ2QoL_rename')).display === 'none');
        await click(btn);
        await page.waitForTimeout(400);
        facts.again = await page.evaluate(() => (document.querySelector('.PZ2QoL_rename') || {}).innerText || '');
        if (!facts.closed || !/Nothing to rename among the animals shown/.test(facts.again)) problems.push(`closed ${facts.closed}; again: ${facts.again.slice(0, 160)}`);
        await click(page.locator('.PZ2QoL_rename .PZ2QoL_btn', { hasText: /^Close$/ }));

        facts.events = await page.evaluate(() => window.__rn.events.slice());
        if (facts.events.length) problems.push(`fired ${JSON.stringify(facts.events)}`);
    }
    finally {
        await page.evaluate(() => {
            if (window.__rn) window.__rn.active = false;
            window.__PZ2QOL_TEST_FRANCHISE = undefined;
        }).catch(() => {});
    }
    if (problems.length) throw new Error('gene names: ' + problems.join('; '));
    return facts;
}
