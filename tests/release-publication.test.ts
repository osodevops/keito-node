import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  validatePublicationRequest, validateRelease, validatePackageIdentity,
  verifyUnpublishedVersion, verifyPublication,
} from '../scripts/verify-npm-publication.mjs';

const workflow = readFileSync(new URL('../.github/workflows/release-please.yml', import.meta.url), 'utf8');

describe('npm publication workflow', () => {
  it('supports an explicit released-tag retry without running Release Please on dispatch', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain("if: github.event_name == 'push'");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
  });

  it('uses supported, token-free trusted publishing', () => {
    expect(workflow).toContain("node-version: '24'");
    expect(workflow).toMatch(/npm install --global npm@11\.[\d.]+/);
    expect(workflow).not.toMatch(/NODE_AUTH_TOKEN|NPM_TOKEN/);
    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('npm publish --provenance --access public');
    expect(workflow).not.toContain('cache: npm');
    expect(workflow).toContain('--tag latest --registry=https://registry.npmjs.org');
  });

  it('validates the released commit before checking it out and retaining all artifact gates', () => {
    expect(workflow).toContain('node scripts/verify-npm-publication.mjs');
    expect(workflow).toContain('ref: ${{ steps.release.outputs.sha }}');
    for (const gate of ['npm run generate', 'git diff --exit-code -- src/generated/', 'npm run typecheck', 'npm test', 'npm run test:package']) {
      expect(workflow).toContain(gate);
    }
  });

  it('preserves builder identity while attributing provenance to the verified source', () => {
    expect(workflow).toContain('env GITHUB_SHA="$RELEASE_SHA" GITHUB_REF="refs/tags/$PUBLICATION_TAG"');
    expect(workflow).not.toMatch(/(?:env |^\s+)(?:GITHUB_WORKFLOW_REF|GITHUB_RUN_ID|ACTIONS_ID_TOKEN_REQUEST_TOKEN)=/m);
    expect(workflow).toContain('node "$RUNNER_TEMP/verify-npm-publication.mjs" --checked-out');
    expect(workflow.indexOf('--checked-out')).toBeLessThan(workflow.indexOf('npm publish --provenance'));
  });
});

const validEnv = {
  GITHUB_REPOSITORY: 'osodevops/keito-node', GITHUB_REF: 'refs/heads/main',
  GITHUB_EVENT_NAME: 'workflow_dispatch', PUBLICATION_TAG: 'v0.1.1',
  GITHUB_WORKFLOW_REF: 'osodevops/keito-node/.github/workflows/release-please.yml@refs/heads/main',
};
const manifest = { name: '@keito-ai/sdk', version: '0.1.1', repository: { url: 'git+https://github.com/osodevops/keito-node.git' } };
const lock = { name: manifest.name, version: manifest.version, packages: { '': { name: manifest.name, version: manifest.version } } };
const runtime = "export const VERSION = '0.1.1';";
const release = { tag_name: 'v0.1.1', draft: false, prerelease: false };
const registry = (version = '0.1.0') => vi.fn(async (url: string) =>
  url.endsWith('/latest') ? new Response(JSON.stringify({ name: manifest.name, version })) : new Response('not published', { status: 404 }));

describe('publication admission', () => {
  it('allows explicit dispatch or a newly created automatic release', () => {
    expect(validatePublicationRequest(validEnv)).toEqual({ tag: 'v0.1.1', version: '0.1.1' });
    expect(validatePublicationRequest({ ...validEnv, GITHUB_EVENT_NAME: 'push', RELEASE_CREATED: 'true' })).toEqual({ tag: 'v0.1.1', version: '0.1.1' });
  });

  it.each([
    { GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_EVENT_NAME: 'push' },
    { GITHUB_EVENT_NAME: 'push', RELEASE_CREATED: 'false' },
    { GITHUB_REPOSITORY: 'other/fork' }, { GITHUB_REF: 'refs/heads/feature' },
    { GITHUB_REF: 'refs/tags/v0.1.1' },
    { GITHUB_WORKFLOW_REF: 'osodevops/keito-node/.github/workflows/other.yml@refs/heads/main' },
  ])('rejects other event/ref/repository contexts %j', change => {
    expect(() => validatePublicationRequest({ ...validEnv, ...change })).toThrow();
  });

  it.each(['', 'main', '0.1.1', 'v1', 'v0.1.1-beta.1', 'v0.1.1+build', 'v01.1.1', 'v0.1.1\nsha=bad', 'v0.1.1;echo bad'])('rejects arbitrary checkout or command input %j', tag => {
    expect(() => validatePublicationRequest({ ...validEnv, PUBLICATION_TAG: tag })).toThrow('Expected a stable');
  });

  it('requires an existing stable published GitHub release', () => {
    expect(() => validateRelease(release, 'v0.1.1')).not.toThrow();
    for (const change of [{ tag_name: 'v0.1.2' }, { draft: true }, { prerelease: true }]) {
      expect(() => validateRelease({ ...release, ...change }, 'v0.1.1')).toThrow();
    }
  });

  it('binds tag, package, lockfile, repository and runtime versions', () => {
    expect(() => validatePackageIdentity(manifest, lock, runtime, '0.1.1')).not.toThrow();
    for (const change of [{ name: 'other-package' }, { version: '0.1.2' }, { private: true }, { repository: { url: 'git+https://github.com/other/fork.git' } }]) {
      expect(() => validatePackageIdentity({ ...manifest, ...change }, lock, runtime, '0.1.1')).toThrow();
    }
    for (const change of [{ name: 'other-package' }, { version: '0.1.2' }, { packages: { '': { version: '0.1.2' } } }]) {
      expect(() => validatePackageIdentity(manifest, { ...lock, ...change }, runtime, '0.1.1')).toThrow();
    }
    expect(() => validatePackageIdentity(manifest, lock, "export const VERSION = '0.1.0';", '0.1.1')).toThrow('Runtime version mismatch');
  });
});

describe('registry version admission', () => {
  it('accepts only an absent exact version while latest remains older', async () => {
    const fetchRegistry = registry();
    await verifyUnpublishedVersion('0.1.1', fetchRegistry);
    expect(fetchRegistry.mock.calls.map(call => call[0])).toEqual([
      'https://registry.npmjs.org/%40keito-ai%2Fsdk/0.1.1', 'https://registry.npmjs.org/%40keito-ai%2Fsdk/latest',
    ]);
    await verifyUnpublishedVersion('0.10.0', registry('0.9.9'));
  });

  it('refuses already-published versions and backwards latest changes', async () => {
    await expect(verifyUnpublishedVersion('0.1.1', async () => new Response(JSON.stringify({ name: manifest.name, version: '0.1.1' })))).rejects.toThrow('already published');
    await expect(verifyUnpublishedVersion('0.1.1', registry('0.1.2'))).rejects.toThrow('latest backwards');
  });

  it.each([401, 403, 429, 500])('does not treat HTTP %s as an absent version', async status => {
    await expect(verifyUnpublishedVersion('0.1.1', async () => new Response('failed', { status }))).rejects.toThrow(`HTTP ${status}`);
  });

  it('requires the known package to exist and propagates transport/schema failures', async () => {
    await expect(verifyUnpublishedVersion('0.1.1', async () => new Response('missing', { status: 404 }))).rejects.toThrow('latest lookup failed with HTTP 404');
    await expect(verifyUnpublishedVersion('0.1.1', async () => { throw new Error('synthetic network failure'); })).rejects.toThrow('synthetic network failure');
    await expect(verifyUnpublishedVersion('0.1.1', async () => new Response('{bad json'))).rejects.toThrow();
    await expect(verifyUnpublishedVersion('0.1.1', async () => new Response(JSON.stringify({ name: 'another-package', version: '0.1.0' })))).rejects.toThrow('Registry package identity');
  });
});

describe('real Git release source verification', () => {
  let directory: string;
  let checkout: string;
  let releasedSha: string;
  const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), 'keito-publication-test-'));
    const origin = join(directory, 'origin');
    git(directory, 'init', '--bare', '--initial-branch=main', origin);
    const source = join(directory, 'source');
    git(directory, 'clone', origin, source);
    git(source, 'config', 'user.name', 'Synthetic publication test');
    git(source, 'config', 'user.email', 'publication-test@example.invalid');
    mkdirSync(join(source, 'src'));
    writeFileSync(join(source, 'package.json'), JSON.stringify(manifest));
    writeFileSync(join(source, 'package-lock.json'), JSON.stringify(lock));
    writeFileSync(join(source, 'src/version.ts'), runtime);
    git(source, 'add', '.');
    git(source, 'commit', '-m', 'Synthetic released package');
    releasedSha = git(source, 'rev-parse', 'HEAD');
    git(source, 'tag', 'v0.1.1');
    git(source, 'commit', '--allow-empty', '-m', 'Later trusted workflow');
    git(source, 'checkout', '--orphan', 'unrelated');
    git(source, 'commit', '-m', 'Unrelated history');
    git(source, 'tag', 'v9.9.9');
    git(source, 'push', 'origin', 'main', '--tags');
    checkout = join(directory, 'checkout');
    git(directory, 'clone', origin, checkout);
  });
  afterAll(() => rmSync(directory, { recursive: true, force: true }));

  it('selects the released tag SHA rather than the later main workflow SHA', async () => {
    const result = await verifyPublication(validEnv, { cwd: checkout, readRelease: async () => release, fetchRegistry: registry() });
    expect(result.sha).toBe(releasedSha);
    expect(result.sha).not.toBe(git(checkout, 'rev-parse', 'HEAD'));
  });

  it('refuses a tag outside main and a missing tag before reading release data', async () => {
    const readRelease = vi.fn();
    for (const tag of ['v9.9.9', 'v8.8.8']) {
      await expect(verifyPublication({ ...validEnv, PUBLICATION_TAG: tag }, { cwd: checkout, readRelease, fetchRegistry: registry() })).rejects.toThrow();
    }
    expect(readRelease).not.toHaveBeenCalled();
  });

  it('checks the actual checkout again immediately before publication', async () => {
    const env = { ...validEnv, RELEASE_SHA: releasedSha };
    const options = { cwd: checkout, readRelease: async () => release, fetchRegistry: registry(), checkedOut: true };
    await expect(verifyPublication(env, options)).rejects.toThrow('Checkout does not match');
    git(checkout, 'checkout', '--detach', releasedSha);
    await expect(verifyPublication(env, options)).resolves.toMatchObject({ sha: releasedSha });
    writeFileSync(join(checkout, 'src/version.ts'), "export const VERSION = '0.1.2';");
    await expect(verifyPublication(env, options)).rejects.toThrow('Runtime version mismatch');
  });
});
