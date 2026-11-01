import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const temporary = mkdtempSync(join(tmpdir(), 'keito-node-package-'));
const npm = (args, cwd) => execFileSync('npm', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

try {
  assert.equal(manifest.name, '@keito-ai/sdk');
  const [pack] = JSON.parse(npm(['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], root));
  writeFileSync(join(temporary, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', join(temporary, pack.filename)], temporary);

  for (const format of ['esm', 'cjs']) {
    const imports = format === 'esm'
      ? `import * as sdk from '@keito-ai/sdk'; import assert from 'node:assert/strict';`
      : `const sdk = require('@keito-ai/sdk'); const assert = require('node:assert/strict');`;
    const program = `${imports}
      async function smoke() {
        assert.equal(sdk.VERSION, ${JSON.stringify(manifest.version)});
        const client = new sdk.Keito();
        const calls = [];
        globalThis.fetch = async (url, init) => {
          calls.push({url, init});
          if (String(url).endsWith('/receipt') && init.method === 'GET') return new Response('%PDF', {headers:{'Content-Type':'application/pdf'}});
          if (String(url).endsWith('/receipt') && init.method === 'POST') {
            assert.ok(init.body instanceof FormData);
            assert.equal(init.body.get('file').name, 'receipt.pdf');
            assert.equal(init.headers['Content-Type'], undefined);
            return new Response(JSON.stringify({receipt_file_name:'receipt.pdf', receipt_file_size:4, receipt_content_type:'application/pdf', receipt_url:'/api/v2/expenses/expense/receipt'}), {status:201});
          }
          if (init.method === 'GET' && String(url).includes('/projects')) {
            const second = new URL(url).searchParams.get('page') === '2';
            return new Response(JSON.stringify({projects:[{id:second?'second':'first'}],page:second?2:1,per_page:1,total_entries:2,total_pages:2}));
          }
          return new Response(JSON.stringify({id:'expense',is_running:false}));
        };
        const ids=[]; for await (const item of await client.projects.list()) ids.push(item.id);
        assert.deepEqual(ids,['first','second']);
        await client.expenses.get('expense');
        await client.expenses.update('expense',{notes:'Synthetic'}, {idempotencyKey:'package-update-001'});
        await client.expenses.uploadReceipt('expense',new Blob(['%PDF'],{type:'application/pdf'}),'receipt.pdf');
        assert.equal(await (await client.expenses.downloadReceipt('expense')).text(),'%PDF');
        await client.expenses.deleteReceipt('expense');
        await client.expenses.delete('expense');
        for (const helper of ['startTimer','stopTimer','restartTimer']) assert.equal(typeof client.timeEntries[helper],'function');
        assert.equal(typeof sdk.KeitoAuthError,'function'); assert.equal(typeof sdk.KeitoApiError,'function'); assert.equal(typeof sdk.KeitoRateLimitError,'function');
        assert.equal(calls[0].url,'https://app.keito.ai/api/v2/projects');
        assert.equal(calls[0].init.headers.Authorization,'Bearer synthetic-package-key');
        assert.equal(calls[0].init.headers['Keito-Account-Id'],'synthetic-package-account');
      }
      smoke().catch(error=>{console.error(error);process.exitCode=1;});`;
    execFileSync(process.execPath, [...(format === 'esm' ? ['--input-type=module'] : []), '-e', program], {
      cwd: temporary,
      stdio: 'inherit',
      env: { ...process.env, KEITO_API_KEY: 'synthetic-package-key', KEITO_ACCOUNT_ID: 'synthetic-package-account' },
    });
  }

  const consumer = `
    import { Keito, KeitoApiError, KeitoAuthError, KeitoRateLimitError } from '@keito-ai/sdk';
    import type { ExpenseCreate, ExpenseUpdate, ExpenseReceipt, TimeEntryStart, RequestOptions } from '@keito-ai/sdk';
    async function example() {
    const client = new Keito();
    const options: RequestOptions = {idempotencyKey:'consumer-create-001'};
    const body: ExpenseCreate = {project_id:'project',expense_category_id:'category',spent_date:'2026-10-30',total_cost:1};
    const update: ExpenseUpdate = {notes:null, total_cost:null, units:1.5};
    await client.expenses.create(body,options);
    await client.expenses.update('expense',update,options);
    const uploaded: ExpenseReceipt = await client.expenses.uploadReceipt('expense',new Blob(['%PDF'],{type:'application/pdf'}),'receipt.pdf');
    const timer: TimeEntryStart = {project_id:'project',task_id:'task',spent_date:'2026-10-30'};
    await client.timeEntries.startTimer(timer,options);
    await client.timeEntries.list({source:'integration',exclude_calendar:true,task:'task'});
    await client.expenses.list({expense_category_id:'category',approval_status:'submitted'});
    await client.reports.teamTime({from:'20261001',to:'20261031',source:'clickup',exclude_calendar:true});
    await client.outcomes.log({project_id:'project',task_id:'task',spent_date:'2026-10-30',source:'api',outcome:{type:'custom',description:'Synthetic',unit_price:1,quantity:1,success:true}});
    const errors = [KeitoApiError,KeitoAuthError,KeitoRateLimitError];
    }
  `;
  for (const extension of ['mts', 'cts']) {
    const file = join(temporary, `consumer.${extension}`);
    writeFileSync(file, consumer);
    execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', file], { cwd: temporary, stdio: 'inherit' });
  }
  console.log(`Packed ${manifest.name} ${manifest.version}: clean install, ESM, CommonJS, declarations and mocked API smoke passed.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
