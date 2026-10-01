/** Real assembled frontend QA. Kaggle dispatches this authenticated E2B worker.
 * The source is the 14146660… free-CPU Colab assembly; no learner review, model call,
 * browser polyfill, manufactured registry or substitute student brick is used.
 */
import { createServer } from 'node:http';
import { timingSafeEqual, randomUUID, createHash } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { BrowserRpc } from './webmcp-browser';

const secret = process.env.ORBIT_ASSEMBLY_CHECK_TOKEN;
if (!secret || secret.length < 40) throw Error('MISSION_TOKEN_REQUIRED');
const targetUrl = 'http://127.0.0.1:4322/';
const assemblySha256 = '141466603afaca979af3e8ee011391c9516de2a723c52809bdca86f0dbb0b1ba';
const output = '/home/user/assembly-check-results';
const compileReceipt = process.env.ORBIT_ASSEMBLY_COMPILE_RECEIPT ?? '/home/user/assembly-compile-status.json';
const buildManifest = process.env.ORBIT_ASSEMBLY_STATIC_MANIFEST ?? '/home/user/assembly-static-build-manifest.json';
const port = Number(process.env.ORBIT_ASSEMBLY_CHECK_PORT ?? 8002);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('INVALID_PORT');
type Check = { name: string; passed: boolean; observation?: unknown; atMs: number };
type Status = { state: 'idle' | 'running' | 'complete'; runId?: string; success?: boolean;
  host: 'E2B'; orchestrator: 'Kaggle'; targetUrl: string; assemblySha256: string;
  modelCalls: 0; learnerUnderstandingExamined: false; humanApproval: false;
  nativeWebMCP: boolean; checks: Check[]; errors: string[]; screenshots: string[];
  runtimeErrors: string[]; durationMs?: number; completed?: boolean; fixtureAuthority: string };
let retired = false, busy = false;
let status: Status = { state: 'idle', host: 'E2B', orchestrator: 'Kaggle', targetUrl,
  assemblySha256, modelCalls: 0, learnerUnderstandingExamined: false, humanApproval: false,
  nativeWebMCP: false, checks: [], errors: [], screenshots: [], runtimeErrors: [],
  fixtureAuthority: 'Synthetic Codex software QA of actual Colab exports; never learner work or human consent.' };
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const cleanError = (value: unknown) => String(value instanceof Error ? value.message : value)
  .split(secret!).join('[REDACTED]').slice(0, 500);
async function readJson(path: string, maximum = 100_000): Promise<Record<string, any>> {
  if ((await stat(path)).size > maximum) throw Error('RECEIPT_SIZE_BOUND');
  const bytes = await readFile(path); if (bytes.length > maximum) throw Error('RECEIPT_SIZE_BOUND');
  const parsed = JSON.parse(bytes.toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('INVALID_RECEIPT');
  return parsed;
}

/** This project's origin and single student tool are intentionally separate
 * from WebMcpBrowser's 4321 Orbit-only allowlist and its 15/25 Orbit registry.
 * Reuse its native CDP transport, without weakening the shared helper.
 */
class AssemblyBrowser {
  private constructor(readonly profile: string, private child: ChildProcess,
    readonly rpc: BrowserRpc, readonly session: string, readonly chromeMajor: number) {}
  static async launch(folder: string, webgl = true) {
    if (process.platform !== 'linux') throw Error('E2B_LINUX_REQUIRED');
    const profile = resolve(folder, `assembly-browser-${webgl ? 'webgl' : 'html'}-${randomUUID()}`);
    await mkdir(profile, { recursive: true });
    const binary = process.env.ORBIT_CHROME_BINARY ?? '/usr/bin/google-chrome';
    const child = spawn(binary, ['--headless=new', '--disable-dev-shm-usage',
      ...(webgl ? [] : ['--disable-webgl']), `--user-data-dir=${profile}`,
      '--remote-debugging-port=0', '--enable-blink-features=WebMCPTesting',
      '--no-first-run', '--no-default-browser-check', '--disable-sync', 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'], shell: false, windowsHide: true });
    const log = createWriteStream(join(profile, 'chrome-startup.log'));
    child.stderr?.pipe(log); child.once('close', () => log.end()); child.on('error', () => undefined);
    let rpc: BrowserRpc | undefined;
    try {
      let debuggerPort = '';
      for (let attempt = 0; attempt < 450; attempt++) {
        try { debuggerPort = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
        catch { /* Observe actual startup, not a synthetic browser API. */ }
        if (/^\d+$/.test(debuggerPort)) break;
        if (child.exitCode !== null || child.signalCode !== null) throw Error('CHROME_START_FAILED');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!/^\d+$/.test(debuggerPort)) throw Error('CHROME_DEBUGGING_UNAVAILABLE');
      const info = await (await fetch(`http://127.0.0.1:${debuggerPort}/json/version`,
        { signal: AbortSignal.timeout(5000) })).json() as { webSocketDebuggerUrl: string; Browser: string };
      rpc = await BrowserRpc.connect(info.webSocketDebuggerUrl);
      const target = await rpc.call('Target.createTarget', { url: 'about:blank' }, undefined, 5000);
      const attached = await rpc.call('Target.attachToTarget', { targetId: target.targetId, flatten: true }, undefined, 5000);
      const browser = new AssemblyBrowser(profile, child, rpc, attached.sessionId,
        Number(info.Browser.match(/\/(\d+)/)?.[1]));
      await rpc.call('Page.enable', {}, attached.sessionId, 3000);
      await rpc.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000,
        deviceScaleFactor: 1, mobile: false }, attached.sessionId, 3000);
      await rpc.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }, attached.sessionId, 3000);
      await rpc.call('Page.addScriptToEvaluateOnNewDocument', { source: `window.__assemblyCheckErrors=[];
        const retain=value=>{if(window.__assemblyCheckErrors.length<30)window.__assemblyCheckErrors.push(String(value).slice(0,300))};
        window.addEventListener('error',event=>retain(event.message));
        window.addEventListener('unhandledrejection',event=>retain(event.reason?.message??event.reason));
        // Observe actual native input only. These listeners never cancel an
        // event, call an application handler or manufacture a click.
        window.__assemblyCheckInputEvents=[];
        for(const type of ['keydown','keypress','keyup','click'])document.addEventListener(type,event=>{
          const events=window.__assemblyCheckInputEvents;if(events.length>=60)return;
          const target=event.target instanceof Element?event.target.closest('button,[data-stage],input'):null;
          if(!target)return;events.push({type:event.type,key:event.key??null,code:event.code??null,
            charCode:event.charCode??null,isTrusted:event.isTrusted,
            target:target.dataset.learningId??target.dataset.view??target.tagName,
            activeElement:document.activeElement?.getAttribute('data-learning-id')??null});
        },true);` }, attached.sessionId, 3000);
      await rpc.call('Page.navigate', { url: targetUrl }, attached.sessionId, 5000);
      await rpc.call('Page.bringToFront', {}, attached.sessionId, 3000);
      return browser;
    } catch (error) { rpc?.close(); child.kill(); throw error; }
  }
  async evaluate(expression: string, timeout = 6000): Promise<any> {
    const result = await this.rpc.call('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true }, this.session, timeout);
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description?.split('\n')[0] ?? 'PAGE_EVALUATION_FAILED');
    return result.result?.value;
  }
  async close() {
    try { await this.rpc.call('Browser.close', {}, undefined, 3000); } catch { /* Finally kill only this isolated child. */ }
    this.rpc.close(); this.child.kill();
  }
}

async function campaign(runId: string) {
  const started = Date.now(), deadline = started + 470_000;
  const folder = join(output, runId); await mkdir(folder, { recursive: true });
  status = { ...status, state: 'running', runId, success: undefined, completed: false,
    nativeWebMCP: false, checks: [], errors: [], screenshots: [], runtimeErrors: [] };
  let browser: AssemblyBrowser | undefined;
  const bounded = () => { if (Date.now() >= deadline) throw Error('EIGHT_MINUTE_BOUND');
    if (status.checks.length >= 80) throw Error('CHECK_COUNT_BOUND'); };
  const timed = async <T>(promise: Promise<T>, maximum = 6000): Promise<T> => {
    bounded(); let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Error('OPERATION_TIME_BOUND')),
        Math.min(maximum, Math.max(1, deadline - Date.now()))); })]); }
    finally { if (timer) clearTimeout(timer); }
  };
  const append = (name: string, passed: boolean, observation?: unknown) => {
    bounded(); status.checks.push({ name, passed, atMs: Date.now() - started,
      ...(observation === undefined ? {} : { observation }) });
    if (!passed) throw Error(`CHECK_FAILED:${name}`);
  };
  const evaluate = (source: string) => timed(browser!.evaluate(source));
  const command = (method: string, params: unknown, timeout = 4000): Promise<any> =>
    timed(browser!.rpc.call(method, params, browser!.session, timeout), timeout + 250);
  const waitFor = (condition: string, maximum = 5000) => evaluate(`(async()=>{
    const deadline=performance.now()+${maximum};while(performance.now()<deadline){
      if(${condition})return true;await new Promise(resolve=>setTimeout(resolve,25));
    }throw Error('ACTUAL_UI_NOT_READY')})()`);
  const pause = (milliseconds: number) => evaluate(`new Promise(resolve=>setTimeout(resolve,${milliseconds}))`);
  const frames = (count: number) => evaluate(`new Promise((resolve,reject)=>{
    if(document.visibilityState!=='visible')return reject(Error('PAGE_NOT_VISIBLE'));
    let seen=0;const timer=setTimeout(()=>reject(Error('VISIBLE_ANIMATION_FRAMES_UNAVAILABLE')),4000);
    const step=()=>{if(document.visibilityState!=='visible'){clearTimeout(timer);reject(Error('PAGE_BECAME_HIDDEN'));return}
      if(++seen>=${count}){clearTimeout(timer);resolve(seen)}else requestAnimationFrame(step)};requestAnimationFrame(step)})`);
  const point = async (selector: string) => {
    const observed = await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});
      if(!element)throw Error('CONTROL_NOT_FOUND');element.scrollIntoView({block:'center'});
      const rect=element.getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2,
        left:rect.left,top:rect.top,width:rect.width,height:rect.height,scrollX:window.scrollX,scrollY:window.scrollY}})()`);
    if (!(observed.width > 0 && observed.height > 0)) throw Error('CONTROL_NOT_VISIBLE');
    return observed;
  };
  const click = async (selector: string) => {
    const p = await point(selector);
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1 });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', buttons: 0, clickCount: 1 });
  };
  const key = async (key: string, code: string, virtual: number) => {
    // CDP does not derive character text from windowsVirtualKeyCode. Native
    // button Enter activation needs keypress '\r'; an empty text suppresses it.
    // Space also supplies its character; navigation keys have no character.
    const text = key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined;
    await command('Input.dispatchKeyEvent', { type: text === undefined ? 'rawKeyDown' : 'keyDown',
      key, code, windowsVirtualKeyCode: virtual,
      ...(text === undefined ? {} : { text, unmodifiedText: text }) });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtual });
  };
  const tools = () => evaluate(`(async()=>{
    if(typeof document.modelContext?.getTools!=='function'||typeof document.modelContext?.executeTool!=='function')throw Error('NATIVE_WEBMCP_UNAVAILABLE');
    return(await document.modelContext.getTools()).map(tool=>({name:tool.name,origin:tool.origin,inputSchema:tool.inputSchema}))})()`);
  const execute = async (input: Record<string, unknown>) => {
    const serialized = browser!.chromeMajor >= 155 ? JSON.stringify(input) : JSON.stringify(JSON.stringify(input));
    let observed = await evaluate(`(async()=>{const tool=(await document.modelContext.getTools()).find(tool=>tool.name==='student_get_learning_snapshot'&&(!tool.origin||tool.origin===location.origin));
      if(!tool)throw Error('STUDENT_TOOL_NOT_REGISTERED');return await document.modelContext.executeTool(tool,${serialized})})()`);
    if (typeof observed === 'string') observed = JSON.parse(observed);
    return observed;
  };
  const register = async () => {
    await click('[data-register]');
    // Registration is asynchronous. A previous success label can remain visible
    // while its replacement is pending; confirm the revision with the real tool.
    // No application state or response is replaced to make the check succeed.
    for (let attempt = 0; attempt < 40; attempt++) {
      const revision = await evaluate(`(()=>{const text=document.querySelector('[data-capability-status]').textContent;
        const match=text.match(/révision ([0-9]+)[.]/);return match?Number(match[1]):null})()`);
      if (Number.isInteger(revision) && revision >= 0 && (await tools()).length === 1) {
        const result = await execute({ expectedRevision: revision });
        if (result?.state === 'READY' || result?.state === 'CONSENT_REQUIRED') return revision;
      }
      await pause(25);
    }
    throw Error('CURRENT_REGISTRATION_NOT_OBSERVED');
  };
  const capture = async (name: string, stageOnly = false) => {
    const clip = stageOnly ? await point('[data-stage]') : undefined;
    const result = await command('Page.captureScreenshot', { format: 'png',
      ...(clip ? { clip: { x: clip.left + clip.scrollX, y: clip.top + clip.scrollY, width: clip.width, height: clip.height, scale: 1 } } : {}) }, 5000);
    const bytes = Buffer.from(result.data, 'base64'), file = `${name}.png`;
    await writeFile(join(folder, file), bytes); status.screenshots.push(file);
    return hash(bytes);
  };
  const open = async (webgl = true) => {
    const launch = AssemblyBrowser.launch(folder, webgl); let accepted = true;
    void launch.then(value => { if (!accepted) void value.close(); }, () => {});
    try { browser = await timed(launch, 60_000); } catch (error) { accepted = false; throw error; }
    await waitFor(`document.readyState==='complete'&&location.origin==='http://127.0.0.1:4322'&&document.querySelector('[data-stage]')?.dataset.webgl!==undefined&&document.querySelectorAll('[data-learning-id]').length===3`);
    append(webgl ? 'real-compiled-frontend-loaded' : 'native-webgl-disabled-fallback-loaded',
      await evaluate(`document.visibilityState==='visible'&&document.querySelector('h1').textContent==='Mon frontend exploratoire'`));
  };
  const gesture = async () => {
    const r = await point('[data-stage]'); const x = r.left + r.width * .35, y = r.top + r.height * .55;
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    await pause(25);
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + r.width * .12, y, button: 'left', buttons: 1 });
    await pause(25);
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + r.width * .24, y, button: 'left', buttons: 1 });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + r.width * .24, y, button: 'left', buttons: 0, clickCount: 1 });
    return { x: x + r.width * .24, y };
  };
  try {
    const receipt = await readJson(compileReceipt), manifest = await readJson(buildManifest);
    append('kaggle-compile-receipt-identifies-nine-actual-bricks',
      receipt.state === 'PASS_ACTUAL_EXPORT_ASSEMBLY_STATIC_BUILD' && receipt.assemblySha256 === assemblySha256 &&
      receipt.staticBuildValidated === true && receipt.originalAssemblyFilesUnchanged === true &&
      receipt.sourceGraphCoverageValidated === true && receipt.sourceBrickFilesLinked === 9 && receipt.manifestFilesVerified === 46 &&
      JSON.stringify(receipt.modulesLinked) === JSON.stringify([1,2,3,4,5,6,7,8]),
      { state: receipt.state, assemblySha256: receipt.assemblySha256, sourceBrickFiles: receipt.sourceBrickFilesLinked,
        authority: 'Retained Kaggle compilation receipt, not a browser interaction or learner review.' });
    const names = Object.keys(manifest);
    if (!names.length || names.length > 200 || names.some(name => !/^[A-Za-z0-9_./-]+$/.test(name) || name.split('/').some(part => !part || part === '.' || part === '..') || !/^[a-f0-9]{64}$/.test(manifest[name]))) throw Error('STATIC_MANIFEST_BOUND');
    const fetchAsset = async (name: string) => {
      const response = await timed(fetch(new URL(name, targetUrl), { redirect: 'error', credentials: 'omit',
        cache: 'no-store', signal: AbortSignal.timeout(6000) }));
      if (response.status !== 200 || Number(response.headers.get('content-length')) > 8_000_000) throw Error('COMPILED_ASSET_NOT_ACCESSIBLE');
      const chunks: Buffer[] = []; let count = 0;
      if (response.body) for await (const chunk of response.body as any) { bounded(); count += chunk.length;
        if (count > 8_000_000) throw Error('COMPILED_ASSET_SIZE_BOUND'); chunks.push(Buffer.from(chunk)); }
      return hash(Buffer.concat(chunks));
    };
    for (const name of names) append(`served-artifact-matches-kaggle:${name}`, await fetchAsset(name) === manifest[name],
      { path: name, sha256: manifest[name] });
    await open();
    append('actual-three-scene-and-accessible-cards-coexist', await evaluate(`document.querySelector('[data-stage]').dataset.webgl==='true'&&document.querySelectorAll('[data-three] canvas').length===1&&document.querySelectorAll('[data-learning-cards] button').length===3`));
    const initially = await tools(); status.nativeWebMCP = true;
    append('fresh-project-registers-no-implicit-tool', initially.length === 0, { names: initially.map((tool: any) => tool.name) });
    const deniedRevision = await register();
    const denied = await execute({ expectedRevision: deniedRevision });
    append('native-student-tool-requires-explicit-sharing', denied?.state === 'CONSENT_REQUIRED', denied);
    const registered = await tools();
    append('one-real-student-tool-distinct-from-orbit-registry', registered.length === 1 && registered[0].name === 'student_get_learning_snapshot',
      { names: registered.map((tool: any) => tool.name), chromeMajor: browser!.chromeMajor });
    await click('[data-share]');
    append('changing-share-invalidates-old-registration', (await tools()).length === 0);
    let revision = await register(), ready = await execute({ expectedRevision: revision });
    append('bounded-native-snapshot-without-human-approval', ready?.state === 'READY' && ready.revision === revision &&
      ready.snapshot?.authority === 'student-declared' && JSON.stringify(ready.snapshot).length <= 6000 &&
      ready.authority === 'external-declared; not a human approval', ready);

    await evaluate(`document.querySelector('[data-learning-id="element-2"]').focus();true`);
    await key('Enter', 'Enter', 13);
    append('keyboard-card-selects-real-observation', await evaluate(`document.querySelector('[data-learning-id="element-2"]').getAttribute('aria-pressed')==='true'&&document.querySelector('[data-learning-description]').textContent==='Ma décision expliquée : Je compare le comportement à ma prédiction.'&&document.querySelector('[data-view-description]').textContent.includes('element-2')`),
      await evaluate(`({pressed:document.querySelector('[data-learning-id="element-2"]').getAttribute('aria-pressed'),description:document.querySelector('[data-learning-description]').textContent,
        view:document.querySelector('[data-view-description]').textContent,inputEvents:window.__assemblyCheckInputEvents})`));
    const stale = await execute({ expectedRevision: revision });
    append('revision-change-suspends-old-native-snapshot', stale?.state === 'STALE_REVISION', stale);
    await click('[data-view="experience"]'); await click('[data-view="summary"]');
    append('view-navigation-retains-selection-and-url', await evaluate(`new URL(location.href).searchParams.get('learningView')==='summary'&&new URL(location.href).searchParams.get('learningSelection')==='element-2'&&document.querySelector('[data-view-description]').textContent.includes('element-2')`));
    await evaluate('history.back();true'); await waitFor(`new URL(location.href).searchParams.get('learningView')==='experience'`);
    append('browser-back-restores-real-flow-selection', await evaluate(`document.querySelector('[data-view="experience"]').getAttribute('aria-pressed')==='true'&&document.querySelector('[data-view-description]').textContent.includes('element-2')`));
    await evaluate('history.forward();true'); await waitFor(`new URL(location.href).searchParams.get('learningView')==='summary'`);
    append('browser-forward-restores-flow', await evaluate(`document.querySelector('[data-view="summary"]').getAttribute('aria-pressed')==='true'`),
      { internalHistoryLimitFromExport: 4, internalHistoryLengthMeasured: false, browserHistoryWasNotClaimedBounded: true });

    const stage = await point('[data-stage]');
    // Projection of the real, fixed second sphere: world(-1,.6,0), cameraDistance7, fov45.
    const pixelsPerWorld = stage.height / (2 * Math.tan(Math.PI / 8) * 7);
    const sphere = { x: stage.x - pixelsPerWorld, y: stage.y - .6 * pixelsPerWorld };
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', ...sphere, button: 'left', buttons: 1, clickCount: 1 });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', ...sphere, button: 'left', buttons: 0, clickCount: 1 });
    append('actual-raycast-selects-second-sphere', await evaluate(`new URL(location.href).searchParams.get('learningView')==='proofs'&&document.querySelector('[data-learning-id="element-2"]').getAttribute('aria-pressed')==='true'`));
    // Inspect the actual state through the read-only native snapshot. Registration reads no source files.
    revision = await register(); const beforeKey = await execute({ expectedRevision: revision });
    await evaluate(`document.querySelector('[data-stage]').focus();true`);
    await key('ArrowRight', 'ArrowRight', 39); revision = await register(); const afterKey = await execute({ expectedRevision: revision });
    append('keyboard-delta-uses-exported-modification', Math.abs(afterKey.snapshot.position.x - beforeKey.snapshot.position.x - .08) < 1e-6 &&
      await evaluate(`document.querySelector('[data-state]').textContent.includes('ArrowRight → keyboard')`),
      { before: beforeKey.snapshot.position.x, after: afterKey.snapshot.position.x });
    await gesture(); revision = await register(); const released = await execute({ expectedRevision: revision });
    await frames(12); const airborne = await execute({ expectedRevision: revision });
    append('real-pointer-release-preserves-inertia', await evaluate(`document.querySelector('[data-state]').textContent.startsWith('pointerup → released')`) &&
      released.snapshot.position.held === false && Math.abs(released.snapshot.position.vx) > .01 &&
      Math.abs(airborne.snapshot.position.x - released.snapshot.position.x) > .005,
      { released: released.snapshot.position, airborne: airborne.snapshot.position });
    const crossing = await point('[data-stage]');
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: crossing.x, y: crossing.y, button: 'none', buttons: 0 });
    const stillAirborne = await execute({ expectedRevision: revision });
    append('unheld-pointer-does-not-regrab-flight', stillAirborne.state === 'READY' && stillAirborne.snapshot.position.held === false &&
      Math.abs(stillAirborne.snapshot.position.vx) > .005, stillAirborne.snapshot.position);
    await click('[data-static]'); const frozen = await execute({ expectedRevision: revision });
    const frozenImage = await capture('assembled-static-frame', true); await frames(12);
    const unchanged = await execute({ expectedRevision: revision });
    append('static-freezes-current-position-without-removing-scene', frozen.snapshot.position.x === unchanged.snapshot.position.x &&
      frozen.snapshot.position.y === unchanged.snapshot.position.y && await evaluate(`document.querySelector('[data-static]').checked&&document.querySelectorAll('[data-three] canvas').length===1&&document.querySelectorAll('[data-learning-id]').length===3`));
    const secondImage = await capture('assembled-static-frame-recheck', true);
    append('static-retains-the-rendered-frame', frozenImage === secondImage, { firstSha256: frozenImage, secondSha256: secondImage });
    await click('[data-particles]'); const noParticles = await capture('assembled-particles-off', true);
    append('actual-particle-layer-can-be-removed-from-current-frame', noParticles !== secondImage,
      { withParticles: secondImage, withoutParticles: noParticles, sourceDeclaredMaximum: 256, browserParticleCountMeasured: false });
    await click('[data-static]'); await click('[data-learning-id="element-2"]'); await frames(90);
    await click('[data-static]'); const small = await capture('assembled-transition-before', true);
    await click('[data-static]'); await click('[data-learning-id="element-1"]'); await frames(16);
    await click('[data-static]'); const expanded = await capture('assembled-transition-after', true);
    append('actual-elastic-transition-changes-selected-sphere', small !== expanded,
      { beforeSha256: small, afterSha256: expanded, note: 'Visible response of the real assembled scene; not a calibrated spring measurement.' });
    await click('[data-share]'); append('revocation-removes-native-student-capability', (await tools()).length === 0);
    await capture('assembled-webgl-frontend');
    await evaluate(`window.dispatchEvent(new PageTransitionEvent('pagehide'));true`);
    append('webgl-pagehide-disposes-real-scene-and-cards', await evaluate(`document.querySelectorAll('[data-three] canvas').length===0&&document.querySelectorAll('[data-learning-id]').length===0`) && (await tools()).length === 0,
      { fixture: 'Automated lifecycle event on the actual WebGL scene; GPU memory was not measured.' });
    status.runtimeErrors.push(...(await evaluate('window.__assemblyCheckErrors') ?? []));
    append('webgl-run-has-no-runtime-errors', status.runtimeErrors.length === 0, status.runtimeErrors);
    await browser!.close(); browser = undefined;

    await open(false);
    append('actual-html-alternative-survives-no-webgl', await evaluate(`document.querySelector('[data-stage]').dataset.webgl==='false'&&document.querySelectorAll('[data-three] canvas').length===0&&getComputedStyle(document.querySelector('[data-marker]')).display!=='none'&&document.querySelectorAll('[data-learning-id]').length===3`),
      { fixture: 'Native Chrome WebGL disabled in a separate disposable profile; no library or renderer was mocked.' });
    await evaluate(`document.querySelector('[data-learning-id="element-3"]').focus();true`); await key(' ', 'Space', 32);
    append('html-keyboard-selection-preserves-same-information', await evaluate(`document.querySelector('[data-learning-id="element-3"]').getAttribute('aria-pressed')==='true'&&document.querySelector('[data-learning-description]').textContent.includes('Je réutilise une brique')`),
      await evaluate(`({pressed:document.querySelector('[data-learning-id="element-3"]').getAttribute('aria-pressed'),description:document.querySelector('[data-learning-description]').textContent,
        view:document.querySelector('[data-view-description]').textContent,inputEvents:window.__assemblyCheckInputEvents})`));
    await gesture(); const marker = await evaluate(`document.querySelector('[data-marker]').style.left`); await frames(10);
    append('html-alternative-has-real-release-and-inertia', await evaluate(`document.querySelector('[data-state]').textContent.startsWith('pointerup → released')&&document.querySelector('[data-marker]').style.left!==${JSON.stringify(marker)}`));
    await click('[data-static]'); const current = await evaluate(`({left:document.querySelector('[data-marker]').style.left,top:document.querySelector('[data-marker]').style.top})`);
    await frames(12);
    append('html-static-freezes-the-current-marker', await evaluate(`document.querySelector('[data-marker]').style.left===${JSON.stringify(current.left)}&&document.querySelector('[data-marker]').style.top===${JSON.stringify(current.top)}`));
    await click('[data-share]'); revision = await register(); const fallback = await execute({ expectedRevision: revision });
    append('html-alternative-keeps-native-bounded-capability', fallback.state === 'READY' && fallback.snapshot.selected === 'element-3', fallback);
    await capture('assembled-html-alternative');
    // Trigger the real pagehide cleanup listener, labeled automated lifecycle fixture.
    await evaluate(`window.dispatchEvent(new PageTransitionEvent('pagehide'));true`);
    append('actual-pagehide-cleanup-removes-cards-and-tool', await evaluate(`document.querySelectorAll('[data-learning-id]').length===0`) && (await tools()).length === 0,
      { fixture: 'Automated pagehide lifecycle event, not a learner navigation or human review.' });
    const disposed = await evaluate(`({state:document.querySelector('[data-state]').textContent,view:document.querySelector('[data-view-description]').textContent,left:document.querySelector('[data-marker]').style.left})`);
    await evaluate(`document.querySelector('[data-stage]').focus();true`); await key('ArrowRight', 'ArrowRight', 39);
    await click('[data-view="mission"]'); await frames(10);
    append('disposed-input-and-flow-listeners-no-longer-mutate-state', await evaluate(`document.querySelector('[data-state]').textContent===${JSON.stringify(disposed.state)}&&document.querySelector('[data-view-description]').textContent===${JSON.stringify(disposed.view)}&&document.querySelector('[data-marker]').style.left===${JSON.stringify(disposed.left)}`));
    status.runtimeErrors.push(...(await evaluate('window.__assemblyCheckErrors') ?? []));
    append('complete-run-has-no-runtime-errors', status.runtimeErrors.length === 0, status.runtimeErrors);
    status.completed = true;
  } catch (error) {
    status.errors.push(cleanError(error));
    if (browser) try { await capture('failure'); } catch { /* Preserve the primary failure. */ }
  } finally {
    try { await browser?.close(); } catch { /* Isolated resource cleanup stays bounded. */ }
    status.state = 'complete'; status.durationMs = Date.now() - started;
    status.success = status.completed === true && status.errors.length === 0 && status.checks.every(check => check.passed);
    await writeFile(join(folder, 'status.json'), JSON.stringify(status, null, 2));
    await writeFile(join(output, 'status.json'), JSON.stringify(status, null, 2)); busy = false;
  }
}

const server = createServer(async (request, response) => {
  response.setHeader('content-type', 'application/json'); response.setHeader('cache-control', 'no-store');
  const supplied = Buffer.from(request.headers.authorization ?? ''), expected = Buffer.from(`Bearer ${secret}`);
  if (retired || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    response.statusCode = 401; response.end('{"state":"UNAUTHORIZED"}'); return;
  }
  if (request.url === '/status' && request.method === 'GET') { response.end(JSON.stringify(status)); return; }
  if (request.url?.startsWith('/artifact/') && request.method === 'GET') {
    const name = request.url.slice('/artifact/'.length);
    if (!status.runId || !['status.json', ...status.screenshots].includes(name) || name.includes('/')) {
      response.statusCode = 404; response.end('{}'); return;
    }
    try { const bytes = await readFile(join(output, status.runId, name));
      response.setHeader('content-type', name.endsWith('.png') ? 'image/png' : 'application/json'); response.end(bytes); }
    catch { response.statusCode = 404; response.end('{}'); } return;
  }
  if (request.url === '/retire' && request.method === 'POST') {
    if (busy) { response.statusCode = 409; response.end('{"state":"RUNNING"}'); return; }
    retired = true; response.end('{"state":"RETIRED"}'); setTimeout(() => server.close(), 5000).unref(); return;
  }
  if (request.url !== '/run' || request.method !== 'POST') { response.statusCode = 404; response.end('{}'); return; }
  if (busy) { response.statusCode = 409; response.end('{"state":"RUNNING"}'); return; }
  try {
    request.setTimeout(6000, () => request.destroy());
    let raw = ''; for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw) > 512) throw Error('INPUT_BOUND'); }
    const input = JSON.parse(raw || '{}');
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw Error('INVALID_INPUT');
    // Another request may have started a run or retired the token while this
    // bounded request body was being read. Recheck before taking ownership.
    if (retired) { response.statusCode = 401; response.end('{"state":"UNAUTHORIZED"}'); return; }
    if (busy) { response.statusCode = 409; response.end('{"state":"RUNNING"}'); return; }
    busy = true; const runId = `assembly-${randomUUID()}`;
    response.statusCode = 202; response.end(JSON.stringify({ state: 'ACCEPTED', runId, poll: '/status' }));
    void campaign(runId).catch(() => { busy = false; status.state = 'complete'; status.success = false;
      status.errors.push('WORKER_STORAGE_FAILURE'); });
  } catch { response.statusCode = 400; response.end('{"state":"INVALID_INPUT"}'); }
});
server.headersTimeout = 10_000; server.requestTimeout = 10_000;
server.listen(port, '0.0.0.0');
