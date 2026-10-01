import { WebMcpBrowser } from './webmcp-browser.js'
const page=await WebMcpBrowser.launch('https://orbit.securedme.ca/app/');
try {
  await page.discover();
  const states=[];
  for (const delay of [0,1000,5000,15000]) {
    if(delay)await new Promise(r=>setTimeout(r,delay));
    states.push(await page.evaluate(`({origin:location.origin,path:location.pathname,view:new URL(location.href).searchParams.get('view'),timeOrigin:performance.timeOrigin,searchKeys:Array.from(new URL(location.href).searchParams.keys())})`));
  }
  let result;
  try { result=await page.execute('orbit_get_capabilities',{},AbortSignal.timeout(70000)); }
  catch(error){ result={error:(error as Error).message}; }
  console.log(JSON.stringify({states,result}));
} finally {await page.close();}
