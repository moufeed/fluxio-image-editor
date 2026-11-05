#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

process.env.E2E_CSP = '1';
process.env.E2E_BASE_URL = 'http://127.0.0.1:4201';

// Only the CSP-dedicated suite — avoid Playwright evaluate helpers under strict CSP.
const result = spawnSync(
  'npx',
  ['playwright', 'test', 'e2e/h-g04-csp.spec.ts'],
  {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  },
);

process.exit(result.status ?? 1);
