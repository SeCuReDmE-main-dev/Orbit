import {filePath, parseColabResult, parseArtifactBundle} from './serialization.js'
import type {ColabResult} from './contracts.js'

/** Read only the bounded UTF-8 ZIP_STORED contract emitted by the actual notebooks. */
export async function readNotebookZip(file:File):Promise<{result:ColabResult;fileCount:number;manifestVerified:true}>{
  if(file.size>8_000_000)throw Error('ARCHIVE_TOO_LARGE')
  const bytes=new Uint8Array(await file.arrayBuffer()),v=new DataView(bytes.buffer)
  const decode=new TextDecoder('utf-8',{fatal:true})
  const files=new Map<string,string>(),records=new Map<string,{offset:number;size:number;crc:number;flags:number}>()
  let p=0,total=0
  while(p+4<=bytes.length&&v.getUint32(p,true)===0x04034b50){
    if(files.size>=40||p+30>bytes.length)throw Error('ARCHIVE_TOO_MANY_FILES_OR_TRUNCATED')
    const flags=v.getUint16(p+6,true),method=v.getUint16(p+8,true),crc=v.getUint32(p+14,true)
    const size=v.getUint32(p+18,true),expanded=v.getUint32(p+22,true),n=v.getUint16(p+26,true),extra=v.getUint16(p+28,true)
    const start=p+30+n+extra
    if(flags&~0x0800||method!==0||size!==expanded||size>512_000||!n||n>260||start+size>bytes.length)throw Error('UNSUPPORTED_ARCHIVE')
    const name=filePath(decode.decode(bytes.subarray(p+30,p+30+n)))
    if(files.has(name))throw Error('DUPLICATE_ARCHIVE_PATH')
    total+=size;if(total>4_000_000)throw Error('ARCHIVE_CONTENT_TOO_LARGE')
    records.set(name,{offset:p,size,crc,flags});files.set(name,decode.decode(bytes.subarray(start,start+size)))
    p=start+size
  }
  if(!files.size)throw Error('EMPTY_OR_UNSUPPORTED_ARCHIVE')
  // A reader must not accept local entries that disagree with the ZIP directory.
  const directoryStart=p,seen=new Set<string>()
  while(p+4<=bytes.length&&v.getUint32(p,true)===0x02014b50){
    if(p+46>bytes.length)throw Error('TRUNCATED_ARCHIVE_DIRECTORY')
    const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),crc=v.getUint32(p+16,true)
    const size=v.getUint32(p+20,true),expanded=v.getUint32(p+24,true),n=v.getUint16(p+28,true)
    const extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true),disk=v.getUint16(p+34,true),offset=v.getUint32(p+42,true)
    if(!n||n>260||p+46+n+extra+comment>bytes.length)throw Error('TRUNCATED_ARCHIVE_DIRECTORY')
    const name=filePath(decode.decode(bytes.subarray(p+46,p+46+n))),record=records.get(name)
    if(!record||seen.has(name)||flags!==record.flags||method!==0||size!==expanded||size!==record.size||crc!==record.crc||offset!==record.offset||disk!==0)throw Error('ARCHIVE_DIRECTORY_MISMATCH')
    seen.add(name);p+=46+n+extra+comment
  }
  if(seen.size!==files.size||p+22>bytes.length||v.getUint32(p,true)!==0x06054b50||v.getUint16(p+4,true)!==0||v.getUint16(p+6,true)!==0||v.getUint16(p+8,true)!==files.size||v.getUint16(p+10,true)!==files.size||v.getUint32(p+12,true)!==p-directoryStart||v.getUint32(p+16,true)!==directoryStart||p+22+v.getUint16(p+20,true)!==bytes.length)throw Error('INVALID_ARCHIVE_END')
  for(const required of ['orbit-learning-result.json','manifest.json','notebook.ipynb','INTEGRATION.md'])if(!files.has(required))throw Error(`MISSING_ARCHIVE_FILE: ${required}`)
  const manifest=JSON.parse(files.get('manifest.json')!)
  if(!manifest||!Array.isArray(manifest.files)||manifest.files.length!==files.size-1)throw Error('INCOMPLETE_ARCHIVE_MANIFEST')
  const paths=manifest.files.map((entry:{path?:unknown})=>filePath(entry?.path))
  if(new Set(paths).size!==paths.length||paths.some((path:string)=>path==='manifest.json'||!files.has(path)))throw Error('INCOMPLETE_ARCHIVE_MANIFEST')
  const declared=parseColabResult(JSON.parse(files.get('orbit-learning-result.json')!))
  const frontend=[...files.keys()].filter(path=>path.startsWith('frontend/'))
  const claims=declared.artifacts??[]
  if(!frontend.length||claims.length!==frontend.length||new Set(claims.map(entry=>entry.path)).size!==claims.length||claims.some(entry=>!frontend.includes(entry.path)||files.get(entry.path)!==entry.content))throw Error('DECLARED_FRONTEND_DIFFERS_FROM_ARCHIVE')
  const selected=[...files].filter(([path])=>path!=='manifest.json').map(([path,content])=>({path,content,mediaType:path.endsWith('.json')||path.endsWith('.ipynb')?'application/json':'text/plain'}))
  const bundle=await parseArtifactBundle(declared,selected,manifest)
  for(const claim of claims)if(claim.sha256&&claim.sha256!==bundle.artifacts.find(entry=>entry.path===claim.path)?.sha256)throw Error('DECLARED_FRONTEND_HASH_MISMATCH')
  // Hash identity is not execution, semantic correctness or learner understanding.
  return {result:bundle.result,fileCount:selected.length,manifestVerified:true}
}
