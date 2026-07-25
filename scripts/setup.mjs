import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const rootPackage = require('../package.json');
const expectedNode = rootPackage.engines.node;

if (process.versions.node !== expectedNode) {
  process.stderr.write(
    `Expected Node.js ${expectedNode}; current version is ${process.versions.node}.\n`,
  );
  process.exitCode = 1;
}

try {
  execFileSync('pnpm', ['--version'], { stdio: 'ignore' });
} catch {
  process.stderr.write(
    'pnpm is not available. Run corepack enable, then try again.\n',
  );
  process.exitCode = 1;
}

await copyExampleEnv('apps/api/.env.example', 'apps/api/.env');

process.stdout.write(`Available commands:
pnpm dev
pnpm check
pnpm test:e2e
pnpm docker:up
pnpm docker:smoke
pnpm docker:down
`);

async function copyExampleEnv(examplePath, targetPath) {
  const absoluteTarget = join(process.cwd(), targetPath);
  try {
    await access(absoluteTarget, constants.F_OK);
    return;
  } catch {
    await copyFile(join(process.cwd(), examplePath), absoluteTarget);
  }
}
