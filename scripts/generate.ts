import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const specPath = resolve(root, 'openapi/openapi-v2.yaml');
const outPath = resolve(root, 'src/generated/openapi.d.ts');

console.log('Generating types from OpenAPI spec...');
execSync(`npx openapi-typescript "${specPath}" -o "${outPath}"`, {
  cwd: root,
  stdio: 'inherit',
});
console.log(`Types written to ${outPath}`);
