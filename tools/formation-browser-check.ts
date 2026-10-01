/** Native browser validation in an isolated E2B worker. Only Kaggle dispatches /run.
 * No model calls, polyfill, injected registry, publication or human approval.
 */
import { createServer } from 'node:http';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { WebMcpBrowser } from './webmcp-browser';

const secret = process.env.ORBIT_FORMATION_CHECK_TOKEN;
if (!secret || secret.length < 40) throw Error('MISSION_TOKEN_REQUIRED');
const output = '/home/user/formation-check-results';
const port = Number(process.env.ORBIT_FORMATION_CHECK_PORT ?? 8001);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('INVALID_PORT');
type Check = { name: string; passed: boolean; observation?: unknown; atMs: number };
type Status = { state: 'idle' | 'running' | 'complete'; runId?: string; success?: boolean; host: 'E2B'; orchestrator: 'Kaggle'; modelCalls: 0; nativeWebMCP: boolean; targetUrl?: string; checks: Check[]; errors: string[]; screenshots: string[]; runtimeErrors?: string[]; durationMs?: number; fixtureAuthority: string; completed?: boolean };
let retired = false, busy = false;
let status: Status = { state: 'idle', host: 'E2B', orchestrator: 'Kaggle', modelCalls: 0, nativeWebMCP: false, checks: [], errors: [], screenshots: [], fixtureAuthority: 'Automated synthetic test setup, never a human learning review or notebook execution proof.' };
const pedagogical = ['orbit_get_learning_mission', 'orbit_get_learning_protocol', 'orbit_plan_learning_activity', 'orbit_prepare_experiment', 'orbit_read_learning_artifact', 'orbit_get_learning_support', 'orbit_check_understanding', 'orbit_prepare_transfer', 'orbit_present_learning_work', 'orbit_get_learning_journal'];
const originals = ['orbit_get_capabilities', 'orbit_get_research_protocol', 'orbit_sanity_initial_context', 'orbit_sanity_read_entries', 'orbit_get_research_request', 'orbit_get_mission_summary', 'orbit_list_research_points', 'orbit_search_sources', 'orbit_read_source_record', 'orbit_present_research', 'orbit_classify_evidence', 'orbit_compare_claims', 'orbit_find_relations', 'orbit_resolve_hold', 'orbit_trace_impact'];

async function campaign(live: boolean, runId: string) {
  // Reserve the final seconds for closing Chrome and preserving the result.
  const started = Date.now(), deadline = started + 85_000;
  const targetUrl = `${live ? 'https://orbit.securedme.ca' : 'http://127.0.0.1:4321'}/formation/lab/`;
  const runFolder = join(output, runId); await mkdir(runFolder, { recursive: true });
  status = { ...status, state: 'running', runId, targetUrl, success: undefined, checks: [], errors: [], screenshots: [], nativeWebMCP: false, completed: false };
  let browser: WebMcpBrowser | undefined;
  const signal = AbortSignal.timeout(85_000);
  const bound = () => { if (Date.now() >= deadline || signal.aborted) throw Error('CAMPAIGN_TIME_BOUND'); if (status.checks.length >= 60) throw Error('CHECK_COUNT_BOUND'); };
  const timed = async <T>(promise: Promise<T>, maximum = 60_000): Promise<T> => {
    bound(); let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('CAMPAIGN_TIME_BOUND')), Math.min(maximum, Math.max(1, deadline - Date.now()))); })]);
    } finally { if (timer) clearTimeout(timer); }
  };
  const append = (name: string, passed: boolean, observation?: unknown) => {
    bound(); status.checks.push({ name, passed, ...(observation === undefined ? {} : { observation }), atMs: Date.now() - started });
    if (!passed) throw Error(`CHECK_FAILED:${name}`);
  };
  const evaluate = async (expression: string) => { bound(); return timed(browser!.evaluate(expression, Math.min(6000, Math.max(1, deadline - Date.now())))); };
  const command = async (method: string, params: unknown, maximum = 3000): Promise<any> => {
    bound(); return timed((browser as any).rpc.call(method, params, (browser as any).session, maximum));
  };
  const check = async (name: string, expression: string) => { const observed = await evaluate(expression); append(name, Boolean(observed), observed); };
  const waitFor = async (expression: string, milliseconds = 3000) => evaluate(`(async()=>{const end=performance.now()+${milliseconds};while(performance.now()<end){if(${expression})return true;await new Promise(r=>setTimeout(r,25));}throw Error('UI_NOT_READY')})()`);
  const pause = async (milliseconds: number) => evaluate(`new Promise(r=>setTimeout(r,${milliseconds}))`);
  const discover = async () => { bound(); return timed(browser!.discover()); };
  const execute = async (name: string, input: unknown = {}) => { bound(); return await timed(browser!.execute(name, input, signal)) as Record<string, any>; };
  const click = async (selector: string) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('CONTROL_NOT_FOUND');e.click();return true})()`);
  const route = async (view: string) => { await click(`[data-view="${view}"]`); await waitFor(`new URL(location.href).searchParams.get('view')===${JSON.stringify(view)}`); await discover(); };
  const screenshot = async (name: string) => {
    const image = await command('Page.captureScreenshot', { format: 'png' }, 5000) as { data: string };
    const file = `${name}.png`; await writeFile(join(runFolder, file), Buffer.from(image.data, 'base64')); status.screenshots.push(file);
  };
  const permission = async (name: string, allowed: boolean) => {
    await evaluate(`(()=>{const e=document.querySelector('[data-permission="${name}"]');if(!e)throw Error('PERMISSION_CONTROL_NOT_FOUND');e.checked=${allowed};e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
  };
  const share = async (read: boolean, proposals = false) => {
    await click('[data-permissions]'); await permission('agentRead', read); if (proposals) await permission('agentPropose', true); await click('[data-dialog-close]');
  };
  const selectModule = async (moduleId: number) => {
    await evaluate(`(()=>{const e=document.querySelector('[data-module]');e.value='${moduleId}';e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
    await waitFor(`document.querySelector('[data-learning-surface] h1')&&new URL(location.href).searchParams.get('module')==='${moduleId}'`); await discover();
  };
  const startExperiment = async (parameter?: number) => {
    await route('experiment');
    await evaluate(`(()=>{const p=document.querySelector('[name="prediction"]');p.value='Synthetic validation fixture: predict a change, then inspect the actual UI.';p.dispatchEvent(new Event('input',{bubbles:true}));${parameter === undefined ? '' : `const v=document.querySelector('[name="parameter"]');v.value='${parameter}';v.dispatchEvent(new Event('input',{bubbles:true}));`}document.querySelector('[data-experiment-stage] button').click();return true})()`);
    await pause(70);
  };
  const gesture = async () => {
    const point = await evaluate(`(()=>{const e=document.querySelector('[data-experiment-stage] [role="group"]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.left+r.width*.4,y:r.top+r.height*.5,dx:Math.min(90,r.width*.2)}})()`);
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await pause(25);
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x + point.dx, y: point.y, button: 'left', buttons: 1 });
    await pause(25);
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x + point.dx, y: point.y, button: 'left', clickCount: 1 });
  };
  try {
    const launch = WebMcpBrowser.launch(targetUrl, runFolder);
    // If startup outlives the mission, retire the late browser instead of leaking it.
    let startupAccepted = true;
    void launch.then(value => { if (!startupAccepted) void value.close(); }, () => {});
    try { browser = await timed(launch, 50_000); } catch (error) { startupAccepted = false; throw error; }
    await evaluate(`(()=>{window.__formationCheckErrors=[];window.addEventListener('error',e=>window.__formationCheckErrors.push(String(e.message).slice(0,300)));window.addEventListener('unhandledrejection',e=>window.__formationCheckErrors.push(String(e.reason?.message??e.reason).slice(0,300)));return true})()`);
    await waitFor(`document.querySelector('[data-formation]')?.dataset.mounted==='true'&&document.querySelector('[data-learning-surface] h1')`);
    const initial = await discover(); status.nativeWebMCP = true;
    append('native-twenty-five-unique-tools', initial.length === 25 && new Set(initial.map(tool => tool.name)).size === 25 && [...originals, ...pedagogical].every(name => initial.some(tool => tool.name === name)), { count: initial.length, names: initial.map(tool => tool.name) });
    const capability = await execute('orbit_get_capabilities');
    append('discovery-starts-no-model-or-research', capability.state === 'READY' && capability.tools.length === 25 && capability.automaticActions.length === 0);
    append('fresh-session-has-no-implicit-engine', capability.classification.selection.length === 0);
    const privateDenied = await execute('orbit_get_research_request'); append('private-read-requires-consent', privateDenied.state === 'CONSENT_REQUIRED');
    await check('unpromoted-pages-have-noindex', `document.querySelector('meta[name="robots"]').content.includes('noindex')`);
    for (const language of ['en', 'es', 'fr']) {
      await evaluate(`(()=>{const e=document.querySelector('[data-landing-language]');e.value='${language}';e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
      await check(`canonical-language-${language}`, `document.documentElement.lang==='${language}'&&document.querySelector('[data-module]').options.length===8&&document.querySelector('[data-learning-surface] h1').textContent===${JSON.stringify(language === 'en' ? 'Gesture, state and rendering' : language === 'es' ? 'Gesto, estado y representación' : 'Geste, état et rendu')}`);
    }
    await screenshot('mission-fr');
    const changed = [0.08, 1, 7, 1.3, 5, 128, 4, 6000], initialValues = [0.04, 0, 5, 0.65, 12, 64, 32, 12000];
    for (let moduleId = 1; moduleId <= 8; moduleId++) {
      await selectModule(moduleId); await startExperiment(changed[moduleId - 1]);
      if (moduleId === 1) {
        await evaluate(`document.querySelector('[data-experiment-stage] [role="group"]').focus();true`);
        await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
        await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
        await check('module-1-keyboard-state-actual', `document.querySelector('[data-experiment-observation]').textContent.includes('ArrowRight')&&document.querySelector('[data-experiment-live]').textContent.includes('keyboard')`);
      } else if (moduleId === 2 || moduleId === 3) {
        await click('[data-experiment-stage] [data-learning-cards] button');
        await check(`module-${moduleId}-actual-selection`, `document.querySelector('[data-experiment-observation]').textContent.includes('element-1')&&!!document.querySelector('[data-learning-description]').textContent`);
      } else if (moduleId === 4) {
        await gesture(); const released = await evaluate(`document.querySelector('[data-experiment-stage] [aria-hidden="true"]').style.left`); await pause(130);
        await check('module-4-inertia-after-release', `document.querySelector('[data-experiment-observation]').textContent.includes('pointerup')&&document.querySelector('[data-experiment-stage] [aria-hidden="true"]').style.left!==${JSON.stringify(released)}`);
      } else if (moduleId === 5) {
        await evaluate(`Array.from(document.querySelectorAll('[data-experiment-stage] button')).find(e=>e.textContent.includes('Changer la cible')).click();true`); await pause(150);
        await check('module-5-elastic-transition', `parseFloat(document.querySelector('[data-experiment-stage] [aria-hidden="true"]').style.width)>22&&document.querySelector('[data-experiment-observation]').textContent.includes('Cible')`);
      } else if (moduleId === 6) {
        await check('module-6-bounded-particles-actual', `!!document.querySelector('[data-experiment-stage] canvas')&&document.querySelector('[data-experiment-live]').textContent.includes('128')&&document.querySelector('[data-experiment-observation]').textContent.includes('seed=17')`);
      } else if (moduleId === 7) {
        await evaluate(`Array.from(document.querySelectorAll('[data-experiment-stage] button')).find(e=>e.textContent==='proofs').click();true`);
        await check('module-7-history-actual', `JSON.parse(document.querySelector('[data-experiment-observation]').textContent).view==='proofs'&&document.querySelector('[data-experiment-live]').textContent.includes('/4')`);
      } else {
        await evaluate(`Array.from(document.querySelectorAll('[data-experiment-stage] button')).find(e=>e.textContent.includes('Examiner les contrôles')).click();true`);
        await check('module-8-prepared-trace-is-not-real-call', `document.querySelector('[data-experiment-observation]').textContent.includes('Trace préparée')&&document.querySelector('[data-experiment-observation]').textContent.includes('Aucun vrai appel')`);
      }
      await evaluate(`document.querySelectorAll('[data-experiment-stage]>div:first-child button')[1].click();true`);
      await check(`module-${moduleId}-restoration-and-cleanup`, `Number(document.querySelector('[name="parameter"]').value)===${initialValues[moduleId - 1]}&&document.querySelectorAll('[data-experiment-stage] canvas').length<=1&&document.querySelectorAll('[data-experiment-stage] [data-learning-cards]').length<=1`);
    }
    await selectModule(4); await startExperiment(); await gesture(); await pause(80);
    await click('[data-landing-access]');
    await evaluate(`(()=>{const e=document.querySelector('[data-landing-motion]');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-access-close]').click();return true})()`);
    const frozen = await evaluate(`({left:document.querySelector('[data-experiment-stage] [aria-hidden="true"]').style.left,live:document.querySelector('[data-experiment-live]').textContent})`); await pause(160);
    await check('static-freezes-current-experiment-frame', `document.documentElement.dataset.orbitMotion==='static'&&document.querySelector('[data-experiment-stage] [aria-hidden="true"]').style.left===${JSON.stringify(frozen.left)}&&document.querySelector('[data-experiment-live]').textContent===${JSON.stringify(frozen.live)}`);
    await screenshot('experiment-static');
    await click('[data-landing-access]');
    await evaluate(`(()=>{for(const selector of ['[data-access-contrast]','[data-access-text]']){const e=document.querySelector(selector);e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));}const motion=document.querySelector('[data-landing-motion]');motion.checked=false;motion.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-access-close]').click();return true})()`);
    await check('canonical-access-contrast-text-motion', `document.documentElement.dataset.orbitContrast==='high'&&document.documentElement.dataset.orbitText==='large'&&document.documentElement.dataset.orbitMotion==='animated'`);
    await route('evidence'); await click('[data-demo]');
    await evaluate(`(()=>{for(const id of ['baseline','n']){const e=document.querySelector('[data-engine="'+id+'"]');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('[data-evaluate]').click();return true})()`);
    await check('same-evidence-baseline-and-n-comparison', `(()=>{const e=JSON.parse(document.querySelector('[data-evaluations] pre').textContent);return e.engines.join(',')==='baseline,n'&&e.results.length===4&&e.results.some(r=>r.representation.kind==='three-state')&&e.results.some(r=>r.representation.kind==='independent-sets')})()`);
    await share(true, true); await discover();
    const before = await execute('orbit_get_mission_summary'); append('shared-session-is-real-and-revisioned', before.state === 'READY' && Number.isInteger(before.revision) && Boolean(before.requestId));
    const nativeComparison = await execute('orbit_classify_evidence', { requestId: before.requestId, expectedRevision: before.revision, claimIds: ['animated', 'static'] });
    append('native-classification-keeps-two-results', nativeComparison.state === 'READY' && nativeComparison.results.length === 2 && nativeComparison.results[0].engine === 'baseline' && nativeComparison.results[1].engine === 'n');
    const stale = await execute('orbit_classify_evidence', { requestId: before.requestId, expectedRevision: before.revision - 1, claimIds: ['animated'] }); append('native-analysis-rejects-stale-revision', stale.state === 'STALE_REVISION');
    const proposal = { sessionId: before.requestId, expectedRevision: before.revision, id: 'synthetic-browser-proposal', kind: 'reflection', payload: { text: 'Automated fixture proposal, not a learner response or human approval.' } };
    const deposited = await execute('orbit_present_learning_work', proposal); append('native-proposal-pending-without-human-review', deposited.state === 'PRESENTED' && deposited.data.proposal.status === 'pending' && deposited.data.humanApproved === false);
    const repeated = await execute('orbit_present_learning_work', proposal); append('native-proposal-idempotence', repeated.state === 'PRESENTED' && repeated.data.idempotent === true);
    const oldProposal = await execute('orbit_present_learning_work', { ...proposal, id: 'synthetic-outdated-proposal' }); append('native-proposal-rejects-old-revision', oldProposal.state === 'STALE_REVISION');
    await click('[data-permissions]'); await click('[data-revoke]');
    const revoked = await execute('orbit_get_research_request'); append('native-revocation-blocks-private-read', revoked.state === 'CONSENT_REQUIRED');
    await route('mission'); await route('evidence'); await evaluate('history.back();true'); await waitFor(`new URL(location.href).searchParams.get('view')==='mission'`); await discover();
    await check('browser-back-restores-module-and-view', `document.querySelector('[data-module]').value==='4'&&document.querySelector('[data-learning-tabs] [aria-current="page"]').dataset.view==='mission'`);
    await click('.formation-header a[href="/formation/projets/"]'); await waitFor(`location.pathname==='/formation/projets/'&&document.querySelector('[data-formation]').dataset.area==='projects'`); await discover();
    await share(true); const projectSession = await execute('orbit_get_mission_summary'); append('lab-and-projects-share-one-session', projectSession.requestId === before.requestId && projectSession.moduleId === 4);
    await check('preferences-shared-across-formation-pages', `document.documentElement.lang==='fr'&&document.documentElement.dataset.orbitContrast==='high'&&document.documentElement.dataset.orbitText==='large'`);
    const artifactFixture = { schemaVersion: 'orbit-learning-colab-v1', missionId: 'module-4', moduleId: 4, attemptId: 'synthetic-browser-fixture', parameters: { damping: 0.65 }, prediction: 'Synthetic fixture, not a Colab execution.', observations: ['Fixture supplied to the real import control.'], explanation: 'Tests the import boundary only.', assistance: ['Automated validation harness.'], limitations: ['Does not certify execution or understanding.'], openQuestion: '', status: 'external-declared', artifacts: [{ path: 'src/learning/module-4/fixture.js', content: 'export const fixture = true;\n', mediaType: 'text/javascript' }] };
    const fixtureFile = join(runFolder, 'synthetic-colab-fixture.json'); await writeFile(fixtureFile, JSON.stringify(artifactFixture));
    await click('[data-import-artifact]');
    const doc = await command('DOM.getDocument', {}); const input = await command('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '[data-learning-import]' });
    // CDP dispatches the input/change events itself; do not submit the same import twice.
    await command('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [fixtureFile] });
    await waitFor(`document.querySelectorAll('[data-share-artifact]').length===2`);
    await check('real-import-keeps-external-declared-status', `document.querySelector('[data-learning-surface]').textContent.includes('external-declared')&&!document.querySelector('[data-learning-surface]').textContent.includes('human-reviewed')`);
    await evaluate(`(()=>{const e=document.querySelector('[data-share-artifact]');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
    await share(true); await discover(); const summary = await execute('orbit_get_mission_summary');
    const mission = await execute('orbit_get_learning_mission', { sessionId: summary.requestId }); const selected = mission.data.selectedArtifactIds[0];
    const artifact = await execute('orbit_read_learning_artifact', { sessionId: summary.requestId, expectedRevision: summary.revision, artifactId: selected });
    append('native-read-only-selected-imported-artifact', artifact.state === 'READY' && artifact.data.status === 'external-declared' && artifact.data.executable === false && artifact.data.humanApproval === false);
    const deniedOther = await execute('orbit_read_learning_artifact', { sessionId: summary.requestId, expectedRevision: summary.revision, artifactId: 'colab-synthetic-browser-fixture:1' }); append('native-unselected-artifact-is-not-readable', deniedOther.state === 'NOT_FOUND');
    await screenshot('projects-import-declared');
    await click('[data-view="versions"]'); await discover(); await check('version-view-preserves-artifact-identity', `document.querySelector('[data-learning-surface]').textContent.includes('synthetic-browser-fixture')`);
    await evaluate('history.back();true'); await waitFor(`new URL(location.href).searchParams.get('view')!=='versions'`); await discover();
    await check('browser-back-restores-files-view', `document.querySelector('[data-learning-tabs] [aria-current="page"]').dataset.view==='files'&&document.querySelectorAll('[data-share-artifact]').length===2`);
    await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await check('small-screen-has-no-horizontal-overflow', `document.documentElement.scrollWidth<=document.documentElement.clientWidth+2&&document.querySelector('[data-module]').getBoundingClientRect().right<=390`);
    status.runtimeErrors = await evaluate('window.__formationCheckErrors'); append('no-runtime-errors', status.runtimeErrors?.length === 0, status.runtimeErrors);
    status.completed = true;
  } catch (error) {
    // Only fixed test labels and bounded browser messages; never request headers or environment secrets.
    status.errors.push(error instanceof Error ? error.message.slice(0, 500) : 'BROWSER_CHECK_FAILED');
    if (browser) try { await screenshot('failure'); } catch {}
  } finally {
    try { await browser?.close(); } catch {}
    status.state = 'complete'; status.durationMs = Date.now() - started; status.success = status.completed === true && status.errors.length === 0 && status.checks.every(check => check.passed);
    await writeFile(join(runFolder, 'status.json'), JSON.stringify(status, null, 2)); await writeFile(join(output, 'status.json'), JSON.stringify(status, null, 2)); busy = false;
  }
}

const server = createServer(async (request, response) => {
  response.setHeader('content-type', 'application/json'); response.setHeader('cache-control', 'no-store');
  const supplied = Buffer.from(request.headers.authorization ?? ''), expected = Buffer.from(`Bearer ${secret}`);
  if (retired || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { response.statusCode = 401; response.end('{"state":"UNAUTHORIZED"}'); return; }
  if (request.url === '/status' && request.method === 'GET') { response.end(JSON.stringify(status)); return; }
  if (request.url?.startsWith('/artifact/') && request.method === 'GET') {
    const name = request.url.slice('/artifact/'.length);
    if (!status.runId || !['status.json', ...status.screenshots].includes(name) || name.includes('/')) { response.statusCode = 404; response.end('{}'); return; }
    try { const data = await readFile(join(output, status.runId, name)); response.setHeader('content-type', name.endsWith('.png') ? 'image/png' : 'application/json'); response.end(data); } catch { response.statusCode = 404; response.end('{}'); } return;
  }
  if (request.url === '/retire' && request.method === 'POST') {
    if (busy) { response.statusCode = 409; response.end('{"state":"RUNNING"}'); return; }
    retired = true; response.end('{"state":"RETIRED"}'); setTimeout(() => server.close(), 1000).unref(); return;
  }
  if (request.url !== '/run' || request.method !== 'POST') { response.statusCode = 404; response.end('{}'); return; }
  if (busy) { response.statusCode = 409; response.end('{"state":"RUNNING"}'); return; }
  try {
    let raw = ''; for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw) > 1500) throw Error('INPUT_BOUND'); }
    const input = JSON.parse(raw || '{}');
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'live') || input.live !== undefined && typeof input.live !== 'boolean') throw Error('INVALID_INPUT');
    busy = true; const runId = `formation-${randomUUID()}`;
    response.statusCode = 202; response.end(JSON.stringify({ state: 'ACCEPTED', runId, poll: '/status' }));
    void campaign(input.live === true, runId).catch(() => { busy = false; status.state = 'complete'; status.success = false; status.errors.push('WORKER_STORAGE_FAILURE'); });
  } catch { response.statusCode = 400; response.end('{"state":"INVALID_INPUT"}'); }
});
server.listen(port, '0.0.0.0');
