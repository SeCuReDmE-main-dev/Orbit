/** Isolated browser validation worker, triggered by Kaggle. No model calls. */
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { WebMcpBrowser } from './webmcp-browser';
const secret=process.env.ORBIT_ATOM_CHECK_TOKEN!;
if(!secret||secret.length<40)throw Error('MISSION_TOKEN_REQUIRED');
let busy=false,retired=false;
const server=createServer(async(req,res)=>{
  res.setHeader('content-type','application/json');
  const supplied=Buffer.from(req.headers.authorization||''),expected=Buffer.from(`Bearer ${secret}`);
  if(retired||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){res.statusCode=401;res.end('{}');return;}
  if(req.url==='/retire'){retired=true;res.end('{"retired":true}');setTimeout(()=>server.close(),1000).unref();return;}
  if(req.url!=='/run'||busy){res.statusCode=409;res.end('{}');return;}
  busy=true;let targetUrl='',browser:WebMcpBrowser|undefined;const rows:any[]=[],errors:any[]=[];
  try {
    let raw='';for await(const b of req){raw+=b;if(raw.length>2000)throw Error('BOUND_EXCEEDED');}
    const input=JSON.parse(raw||'{}'),url=input.live===true?'https://orbit.securedme.ca/':'http://127.0.0.1:4321/';
    targetUrl=url;browser=await WebMcpBrowser.launch(url,'/home/user/atom-check');
    const rpc=(browser as any).rpc,session=(browser as any).session;
    // Error events are read from the renderer, not inferred from button labels.
    await browser.evaluate(`(()=>{window.__atomErrors=[];window.addEventListener('error',e=>window.__atomErrors.push(e.message));return true})()`);
    await browser.evaluate(`(async()=>{for(let i=0;i<160;i++){if(document.querySelector('.atom-games'))return true;await new Promise(r=>setTimeout(r,100));}throw Error('PLAYGROUND_NOT_MOUNTED')})()`);
    const check=async(name:string,expression:string)=>{const value=await browser!.evaluate(expression);rows.push({name,passed:!!value,value});if(!value)throw Error(name);};
    await check('webgl',`document.querySelector('[data-landing]').dataset.graphics!=='unavailable'`);
    await check('white-blue-purple-nucleus-and-orange-electrons',`document.querySelector('[data-landing]').dataset.atomElectronsOrange==='true'&&document.querySelector('[data-landing]').dataset.atomNucleusColors==='3'&&document.querySelector('[data-landing]').dataset.atomNucleusWhite==='true'`);
    await browser.evaluate(`new Promise(r=>setTimeout(r,2200))`);
    await check('ambient-without-menu',`document.querySelector('.atom-games').hidden&&document.querySelector('[data-landing]').dataset.ambientInteractions==='vortex'`);
    await rpc.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:600,y:220},session);
    await browser.evaluate(`new Promise(r=>setTimeout(r,100))`);
    await check('ambient-vortex-and-history',`Number(document.querySelector('[data-landing]').dataset.ambientVortex)>0&&Number(document.querySelector('[data-landing]').dataset.ambientHistory)===0`);
    const center=await browser.evaluate(`(()=>{const d=document.querySelector('[data-landing]').dataset;return{x:Number(d.atomScreenX),y:Number(d.atomScreenY)}})()`);
    await rpc.call('Input.dispatchMouseEvent',{type:'mousePressed',x:center.x,y:center.y,button:'left',clickCount:1},session);
    await rpc.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:center.x+60,y:center.y+20,button:'left',buttons:1},session);
    await browser.evaluate(`new Promise(r=>setTimeout(r,50))`);
    await check('ambient-nucleus-grabbable',`Math.abs(Number(document.querySelector('[data-landing]').dataset.atomScreenX)-${center.x})>30`);
    await rpc.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:center.x+60,y:center.y+20,button:'left',clickCount:1},session);
    const releaseX=await browser.evaluate(`Number(document.querySelector('[data-landing]').dataset.atomScreenX)`);
    await browser.evaluate(`new Promise(r=>setTimeout(r,140))`);
    await check('throw-continues-after-release',`Math.abs(Number(document.querySelector('[data-landing]').dataset.atomScreenX)-${releaseX})>4`);
    await check('throw-is-airborne',`document.querySelector('[data-landing]').dataset.atomAirborne==='true'`);
    await rpc.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:center.x+60,y:center.y+20},session);
    await browser.evaluate(`new Promise(r=>setTimeout(r,100))`);
    await check('airborne-ignores-pointer',`Number(document.querySelector('[data-landing]').dataset.atomPointerInfluence)===0`);
    const hoverX=await browser.evaluate(`Number(document.querySelector('[data-landing]').dataset.atomScreenX)`);
    await browser.evaluate(`document.querySelector('.atom-links a').dispatchEvent(new PointerEvent('pointerenter'));true`);
    await browser.evaluate(`new Promise(r=>setTimeout(r,100))`);
    await check('navigation-hover-does-not-stop-flight',`Math.abs(Number(document.querySelector('[data-landing]').dataset.atomScreenX)-${hoverX})>1`);
    await browser.evaluate(`document.querySelector('.atom-links a').dispatchEvent(new PointerEvent('pointerleave'));true`);
    await rpc.call('Input.dispatchMouseEvent',{type:'mousePressed',x:30,y:350,button:'left',clickCount:1},session);
    await rpc.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:30,y:350,button:'left',clickCount:1},session);
    await browser.evaluate(`new Promise(r=>setTimeout(r,50))`);
    await check('background-click-does-not-catch-flight',`document.querySelector('[data-landing]').dataset.atomAirborne==='true'`);
    const catchPoint=await browser.evaluate(`(()=>{const d=document.querySelector('[data-landing]').dataset;return{x:Number(d.atomScreenX),y:Number(d.atomScreenY)}})()`);
    await rpc.call('Input.dispatchMouseEvent',{type:'mousePressed',x:catchPoint.x,y:catchPoint.y,button:'left',clickCount:1},session);
    await browser.evaluate(`new Promise(r=>setTimeout(r,1500))`);
    await check('explicit-regrab-catches-flight',`document.querySelector('[data-landing]').dataset.atomAirborne==='false'`);
    await check('short-hold-does-not-aspirate',`Number(document.querySelector('[data-landing]').dataset.vortexSuction)<.01`);
    await browser.evaluate(`new Promise(r=>setTimeout(r,1300))`);
    await check('two-second-hold-aspirates',`Number(document.querySelector('[data-landing]').dataset.vortexSuction)>.5`);
    await check('ascii-not-before-four-seconds',`!document.querySelector('.orbit-wordmark').classList.contains('is-ascii')`);
    await browser.evaluate(`new Promise(r=>setTimeout(r,1700))`);
    await check('four-second-hold-aspirates-ascii-logo',`document.querySelector('.orbit-wordmark').classList.contains('is-ascii')&&Array.from(document.querySelectorAll('[data-logo-letter]')).every(l=>l.dataset.ascii.includes('#'))`);
    await mkdir('/home/user/atom-check-results',{recursive:true});
    const asciiShot=await rpc.call('Page.captureScreenshot',{format:'png'},session);await writeFile('/home/user/atom-check-results/hold-ascii.png',Buffer.from(asciiShot.data,'base64'));
    await check('explosion-not-before-six-seconds',`Number(document.querySelector('[data-landing]').dataset.vortexBurst)===0`);
    await browser.evaluate(`(async()=>{const start=performance.now();while(performance.now()-start<2200){if(document.querySelector('[data-landing]').dataset.vortexStarCollapse==='true')return true;await new Promise(r=>setTimeout(r,20));}return false})()`);
    await check('six-second-collapse-before-explosion',`document.querySelector('[data-landing]').dataset.vortexStarCollapse==='true'&&Number(document.querySelector('[data-landing]').dataset.vortexBurst)===0`);
    await browser.evaluate(`new Promise(r=>setTimeout(r,800))`);
    await check('six-second-hold-explodes',`Number(document.querySelector('[data-landing]').dataset.vortexBurst)>.8`);
    await check('explosion-becomes-particles-only',`document.querySelector('[data-landing]').dataset.atomParticleOnly==='true'`);
    const burstShot=await rpc.call('Page.captureScreenshot',{format:'png'},session);await writeFile('/home/user/atom-check-results/hold-explosion.png',Buffer.from(burstShot.data,'base64'));
    await rpc.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:catchPoint.x,y:catchPoint.y,button:'left',clickCount:1},session);
    await browser.evaluate(`new Promise(r=>setTimeout(r,100))`);
    await check('release-cannot-cancel-triggered-explosion',`Number(document.querySelector('[data-landing]').dataset.vortexBurst)>.5&&document.querySelector('.orbit-wordmark').classList.contains('is-ascii')`);
    await browser.evaluate(`new Promise(r=>setTimeout(r,3600))`);
    await check('release-ends-explosion',`Number(document.querySelector('[data-landing]').dataset.vortexBurst)===0`);
    await check('reconstruction-restores-solid-atom',`document.querySelector('[data-landing]').dataset.atomParticleOnly==='false'`);
    await check('release-restores-logo',`!document.querySelector('.orbit-wordmark').classList.contains('is-ascii')&&document.querySelector('.orbit-wordmark').textContent==='Orbit.'`);
    await check('release-ends-aspiration',`Number(document.querySelector('[data-landing]').dataset.vortexSuction)<.01`);
    const landingShot=await rpc.call('Page.captureScreenshot',{format:'png'},session);await writeFile('/home/user/atom-check-results/landing-final.png',Buffer.from(landingShot.data,'base64'));
    await browser.evaluate(`document.querySelector('[data-atom-canvas]').focus();true`);
    await browser.evaluate(`document.querySelector('[data-play-toggle]').click();document.querySelector('[data-atom-games]').click();true`);
    await check('fifteen-real-games',`document.querySelector('#atom-game').options.length===15`);
    await check('vortex-default',`document.querySelector('#atom-game').value==='vortex'`);
    for(const lang of ['es','en','fr']){
      await browser.evaluate(`(()=>{const s=document.querySelector('[data-landing-language]');s.value='${lang}';s.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
      await check(`language-${lang}`,`document.documentElement.lang==='${lang}'&&document.querySelector('[data-atom-games]').textContent==='${lang==='fr'?'15 jeux':lang==='en'?'15 games':'15 juegos'}'&&document.querySelector('#atom-game option[value=rewind]').textContent.includes('${lang==='fr'?'Remonter':lang==='en'?'Rewind':'Retroceder'}')`);
    }
    const ids=await browser.evaluate(`Array.from(document.querySelector('#atom-game').options,o=>o.value)`);
    await mkdir('/home/user/atom-check-results',{recursive:true});
    for(const id of ids){
      await browser.evaluate(`(()=>{const s=document.querySelector('#atom-game');s.value=${JSON.stringify(id)};s.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-game-action]').click();return true})()`);
      await browser.evaluate(`new Promise(r=>setTimeout(r,350))`);
      if(id==='capture')await browser.evaluate(`(async()=>{for(let i=0;i<100;i++){const d=document.querySelector('[data-landing]').dataset;if(Number(d.gameCaptures)>0||d.gameCaptureError)return;await new Promise(r=>setTimeout(r,100));}})()`);
      await check(`effect-${id}`,`Number(document.querySelector('[data-landing]').dataset.gameSignal)>0 ${id==='capture'?"|| Number(document.querySelector('[data-landing]').dataset.gameCaptures)>0":""}`);
      const screenshot=await rpc.call('Page.captureScreenshot',{format:'png'},session);
      await writeFile(`/home/user/atom-check-results/${id}.png`,Buffer.from(screenshot.data,'base64'));
      // Real input dispatch covers the gesture path, independently of the action button.
      const rect=await browser.evaluate(`(()=>{const r=document.querySelector('[data-atom-canvas]').getBoundingClientRect();return{x:r.left+r.width*.5,y:r.top+r.height*.5}})()`);
      await rpc.call('Input.dispatchMouseEvent',{type:'mousePressed',x:rect.x,y:rect.y,button:'left',clickCount:1},session);
      await rpc.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+65,y:rect.y+40,button:'left',buttons:1},session);
      await rpc.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x+65,y:rect.y+40,button:'left',clickCount:1},session);
      await check(`finite-${id}`,`(()=>{const v=Number(document.querySelector('[data-landing]').dataset.gameSignal);return Number.isFinite(v)})()`);
    }
    await rpc.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},session);
    await check('mobile-controls',`(()=>{const r=document.querySelector('#atom-game').getBoundingClientRect();return r.left>=0&&r.right<=390&&r.height>=44})()`);
    await rpc.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},session);
    await browser.evaluate(`(()=>{const s=document.querySelector('#atom-game');s.value='elastic';s.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-game-action]').click();return true})()`);
    await check('reduced-motion-effect',`Number(document.querySelector('[data-landing]').dataset.gameSignal)>0`);
    await rpc.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},session);
    await rpc.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},session);
    await check('escape-returns',`document.querySelector('.atom-games').hidden`);
    await check('ambient-reduced-motion',`Number(document.querySelector('[data-landing]').dataset.ambientVortex)===0`);
    await browser.evaluate(`document.querySelector('[data-play-close]').click();true`);
    await check('navigation-preserved',`Array.from(document.querySelectorAll('.atom-links a'),a=>a.getAttribute('href')).join(',')==='/guide/,/app/,/studio/,/formation/lab/'&&Array.from(document.querySelectorAll('[data-atom-link]'),element=>element.dataset.atomLink).join(',')==='0,1,2,3,4'`);
    await rpc.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]},session);
    await browser.evaluate(`document.querySelector('[data-landing-access]').click();document.querySelector('[data-landing-motion]').click();document.querySelector('[data-access-close]').click();true`);
    await check('static-mode',`document.querySelector('[data-landing]').dataset.motion==='static'&&!document.querySelector('[data-atom-canvas]').hidden&&document.querySelector('[data-atom-fallback]').hidden&&!document.querySelector('.atom-links').hidden`);
    const frozen=await browser.evaluate(`document.querySelector('[data-atom-canvas]').toDataURL()`);
    await rpc.call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39},session);
    await browser.evaluate(`new Promise(r=>setTimeout(r,200))`);
    await check('static-preserves-frame',`document.querySelector('[data-atom-canvas]').toDataURL()===${JSON.stringify(frozen)}`);
    await browser.evaluate(`document.querySelector('[data-landing-access]').click();document.querySelector('[data-access-contrast]').click();document.querySelector('[data-access-text]').click();true`);
    await check('access-shared-controls',`document.documentElement.dataset.orbitContrast==='high'&&document.documentElement.dataset.orbitText==='large'`);
    await rpc.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},session);
    await check('access-escape',`!document.querySelector('.orbit-access').open`);
    await check('orange-brand-points',`getComputedStyle(document.querySelector('.brand-period')).color==='rgb(255, 148, 31)'&&getComputedStyle(document.querySelector('.orbit-brand circle')).fill==='rgb(255, 148, 31)'&&getComputedStyle(document.querySelector('[data-logo-letter]:last-child')).color.startsWith('rgba(255, 148, 31,')`);
    await check('orange-capital-and-i-dot',`document.querySelector('.orbit-wordmark').textContent==='Orbit.'&&getComputedStyle(document.querySelector('[data-logo-letter]')).color.startsWith('rgba(255, 148, 31,')&&getComputedStyle(document.querySelector('.orbit-wordmark .brand-i')).backgroundImage.includes('255, 148, 31')&&getComputedStyle(document.querySelector('.orbit-brand .brand-i')).backgroundImage.includes('255, 148, 31')`);
    await check('brand-not-translated',`document.querySelector('.orbit-wordmark').textContent==='Orbit.'&&document.querySelector('.orbit-wordmark').getAttribute('translate')==='no'&&document.querySelector('.orbit-brand').getAttribute('translate')==='no'`);
    errors.push(...await browser.evaluate('window.__atomErrors'));
    await rpc.call('Page.reload',{},session);
    await browser.evaluate(`(async()=>{for(let i=0;i<100;i++){if(document.querySelector('[data-landing]')?.dataset.motion==='static')return true;await new Promise(r=>setTimeout(r,100));}throw Error('STATIC_NOT_RESTORED')})()`);
    await check('static-restored-after-reload',`!document.querySelector('[data-atom-canvas]').hidden&&document.querySelector('[data-landing-motion]').checked`);
    await browser.evaluate(`(()=>{window.__atomErrors=[];window.addEventListener('error',e=>window.__atomErrors.push(e.message));document.querySelector('[data-landing-access]').click();document.querySelector('[data-landing-motion]').click();document.querySelector('[data-access-close]').click();return true})()`);
    await browser.evaluate(`(async()=>{for(let i=0;i<100;i++){if(document.querySelector('.atom-games'))return true;await new Promise(r=>setTimeout(r,100));}throw Error('ANIMATED_NOT_RESTORED')})()`);
    await check('animated-resumed',`!document.querySelector('[data-atom-canvas]').hidden`);
    // Preserve old campaign stamps through an explicit parameter; new runs target V3.
    const expectedVersion = process.env.ORBIT_ATOM_EXPECTED_VERSION || 'V3';
    await check('publication-lab-and-version-'+expectedVersion,`document.querySelector('.publication-lab-signature').naturalWidth>0&&document.querySelector('.landing-footer').textContent.includes(${JSON.stringify(expectedVersion)})&&document.querySelector('.publication-lab-link').href==='https://securedme.ca/'`);
    await check('logo-below-separator',`(()=>{const f=document.querySelector('.landing-footer').getBoundingClientRect(),l=document.querySelector('.publication-lab-link'),r=l.getBoundingClientRect();return r.top>f.top&&r.bottom<=f.bottom&&getComputedStyle(l).mixBlendMode==='screen'})()`);
    const lost=await browser.evaluate(`(()=>{const c=document.querySelector('[data-atom-canvas]'),gl=c.getContext('webgl2');const ext=gl?.getExtension('WEBGL_lose_context');ext?.loseContext();return !!ext})()`);
    if(lost){await browser.evaluate(`new Promise(r=>setTimeout(r,200))`);await check('context-loss-fallback',`document.querySelector('[data-landing]').dataset.graphics==='unavailable'`);}
    errors.push(...await browser.evaluate('window.__atomErrors'));
    rows.push({name:'no-runtime-errors',passed:errors.length===0,errors});
  }catch(error){errors.push(error instanceof Error?error.message:'CHECK_FAILED');if(browser)try{errors.push(await browser.evaluate(`({captureError:document.querySelector('[data-landing]')?.dataset.gameCaptureError,status:document.querySelector('[data-game-result]')?.textContent})`));}catch{}}
  finally{await browser?.close();busy=false;}
  const value={targetUrl,host:'E2B',orchestrator:'Kaggle',modelCalls:0,rows,errors,success:errors.length===0&&rows.every(r=>r.passed)};
  await writeFile('/home/user/atom-check-results/status.json',JSON.stringify(value,null,2));res.end(JSON.stringify(value));
});server.listen(8000,'0.0.0.0');
