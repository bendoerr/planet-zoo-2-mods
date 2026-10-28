// node tests/helpers/record_engines_golden.mjs  (re-recorded 2026-10-19: juveniles no longer take adults' room; 2026-10-28: the young keep their places again, every change a room change)
import { writeFileSync } from 'node:fs';
import { digestAll } from './enginedigest.mjs';
writeFileSync(new URL('../fixtures/engines_golden.json', import.meta.url), JSON.stringify(digestAll()));
console.log('recorded');
