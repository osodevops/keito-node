import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = 'osodevops/keito-node';
const packageName = '@keito-ai/sdk';
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function validatePublicationRequest(env) {
  assert.equal(env.GITHUB_REPOSITORY, repository, 'Unexpected repository');
  assert.equal(env.GITHUB_REF, 'refs/heads/main', 'Publication must run from main');
  assert.equal(env.GITHUB_WORKFLOW_REF, `${repository}/.github/workflows/release-please.yml@refs/heads/main`, 'Unexpected publishing workflow identity');
  assert(/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? ''), 'Missing or invalid genuine workflow commit');
  assert(
    env.GITHUB_EVENT_NAME === 'workflow_dispatch' ||
    (env.GITHUB_EVENT_NAME === 'push' && env.RELEASE_CREATED === 'true'),
    'Only a created release or explicit released-tag retry can publish',
  );
  const tag = env.PUBLICATION_TAG ?? '';
  assert(tag.startsWith('v') && stableVersion.test(tag.slice(1)), 'Expected a stable vX.Y.Z release tag');
  return { tag, version: tag.slice(1) };
}

export function validateInvocationSource(sha, env) {
  assert.equal(sha, env.GITHUB_SHA, 'Release commit differs from workflow invocation; create a fresh patch release');
}

export function validateRelease(release, tag) {
  assert.equal(release.tag_name, tag, 'GitHub release tag mismatch');
  assert.equal(release.draft, false, 'Draft releases cannot publish');
  assert.equal(release.prerelease, false, 'Prereleases cannot publish through this stable workflow');
}

export function validatePackageIdentity(manifest, lock, runtimeSource, version) {
  assert.equal(manifest.name, packageName, 'Unexpected package name');
  assert.equal(manifest.version, version, 'Package version does not match release tag');
  assert.equal(manifest.repository?.url, `git+https://github.com/${repository}.git`, 'Package repository mismatch');
  assert.notEqual(manifest.private, true, 'Private package cannot publish');
  assert.equal(lock.name, packageName, 'Lockfile package name mismatch');
  assert.equal(lock.version, version, 'Lockfile version mismatch');
  assert.equal(lock.packages?.['']?.version, version, 'Lockfile root version mismatch');
  assert.equal(runtimeSource.match(/export const VERSION = ['"]([^'"]+)['"]/)?.[1], version, 'Runtime version mismatch');
}

function compareVersions(left, right) {
  assert(stableVersion.test(left) && stableVersion.test(right), 'Expected stable registry versions');
  for (let i = 0; i < 3; i++) {
    const difference = BigInt(left.split('.')[i]) - BigInt(right.split('.')[i]);
    if (difference) return difference > 0n ? 1 : -1;
  }
  return 0;
}

export async function verifyUnpublishedVersion(version, fetchRegistry = fetch) {
  const request = async (requestedVersion, missingAllowed = false) => {
    const response = await fetchRegistry(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${requestedVersion}`, {
      headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 404 && missingAllowed) return null;
    assert(response.ok, `Registry ${requestedVersion} lookup failed with HTTP ${response.status}`);
    const body = await response.json();
    assert.equal(body.name, packageName, 'Registry package identity mismatch');
    assert.equal(typeof body.version, 'string', 'Registry response has no version');
    return body;
  };
  const [existing, latest] = await Promise.all([request(version, true), request('latest')]);
  assert.equal(existing, null, `Version ${version} is already published; refusing to republish`);
  assert(compareVersions(version, latest.version) > 0, 'Publishing this release would move latest backwards');
}

export async function verifyPublication(env = process.env, options = {}) {
  const selected = validatePublicationRequest(env);
  const cwd = options.cwd ?? process.cwd();
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  // Fetch only the selected stable tag and main, never an input-selected remote/ref.
  git('fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main',
    `refs/tags/${selected.tag}:refs/tags/${selected.tag}`);
  const sha = git('rev-parse', '--verify', `refs/tags/${selected.tag}^{commit}`);
  assert(/^[a-f0-9]{40}$/.test(sha), 'Invalid released commit');
  validateInvocationSource(sha, env);
  git('merge-base', '--is-ancestor', sha, 'refs/remotes/origin/main');
  const release = options.readRelease
    ? await options.readRelease(selected.tag)
    : JSON.parse(execFileSync('gh', ['api', `repos/${repository}/releases/tags/${selected.tag}`], { encoding: 'utf8' }));
  validateRelease(release, selected.tag);
  const read = path => git('show', `${sha}:${path}`);
  validatePackageIdentity(JSON.parse(read('package.json')), JSON.parse(read('package-lock.json')), read('src/version.ts'), selected.version);
  if (options.checkedOut) {
    assert.equal(sha, env.RELEASE_SHA, 'Verified release commit changed');
    assert.equal(git('rev-parse', 'HEAD'), sha, 'Checkout does not match the verified release');
    const current = path => readFileSync(join(cwd, path), 'utf8');
    validatePackageIdentity(JSON.parse(current('package.json')), JSON.parse(current('package-lock.json')), current('src/version.ts'), selected.version);
  }
  await verifyUnpublishedVersion(selected.version, options.fetchRegistry);
  return { ...selected, sha };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    assert(process.argv.slice(2).every(value => value === '--checked-out'), 'Unknown verification argument');
    const result = await verifyPublication(process.env, { checkedOut: process.argv.includes('--checked-out') });
    assert(process.env.GITHUB_OUTPUT, 'Missing GitHub Actions output file');
    appendFileSync(process.env.GITHUB_OUTPUT, `sha=${result.sha}\ntag=${result.tag}\nversion=${result.version}\n`);
    console.log(`Verified unpublished ${packageName}@${result.version} from ${result.tag} (${result.sha}).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
