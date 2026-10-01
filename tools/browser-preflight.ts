import { writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { WebMcpBrowser } from './webmcp-browser.js'
const browser = await WebMcpBrowser.launch(process.argv[2] ?? 'https://orbit.securedme.ca/app/');
try {
  const result = await browser.diagnostic();
  await mkdir('.orbit/benchmark-results',{recursive:true});
  await writeFile('.orbit/benchmark-results/browser-preflight.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({ ...result, tools: result.tools.map(t=>t.name) }));
} finally { await browser.close(); }
