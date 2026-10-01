"""Prepare Kaggle validation of the downloaded Colab assembly; never run its code locally."""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import shutil
from urllib.parse import urlsplit
import zipfile


NODE_VERSION = '22.20.0'
NODE_SHA256 = '00bbd05e306ea68b6e13e17360d0e2f680b493ef95f2fea1c4296ff7437530bc'
BRICKS = {
    1: ('interaction-state.js', 'createInteraction'),
    2: ('exploration-card.js', 'createCards'),
    3: ('scene-controller.js', 'createSceneController'),
    4: ('inertia.js', 'createInertia'),
    5: ('transitions.js', 'createTransition'),
    6: ('particle-layer.js', 'createParticleLayer'),
    7: ('interaction-flow.js', 'createInteractionFlow'),
    8: ('register-capabilities.js', 'registerLearningCapability'),
}

CELL = r'''import base64, hashlib, io, json, os, re, shutil, subprocess, tarfile, time, urllib.request, zipfile
from pathlib import Path, PurePosixPath
from datetime import datetime, timezone
if not Path('/kaggle').is_dir():
    raise RuntimeError('Execute this validation in Kaggle, not on the workstation.')
SPEC=__SPEC__
PAYLOAD=base64.b64decode(__PAYLOAD__,validate=True)
LOCK_PAYLOAD=base64.b64decode(__LOCK_PAYLOAD__,validate=True)
if hashlib.sha256(PAYLOAD).hexdigest()!=SPEC['assemblySha256']:
    raise RuntimeError('Actual downloaded assembly integrity failure')
if len(LOCK_PAYLOAD)!=SPEC['installationLock']['bytes'] or (LOCK_PAYLOAD and hashlib.sha256(LOCK_PAYLOAD).hexdigest()!=SPEC['installationLock']['sha256']):
    raise RuntimeError('Supplied installation lock integrity failure')
ROOT=Path('/kaggle/temp/orbit-actual-assembly-'+SPEC['assemblySha256'][:12]+'-'+str(time.time_ns()))
ROOT.mkdir(parents=True,exist_ok=False)
OUTPUT=Path('/kaggle/working/actual-colab-assembly-validation'); OUTPUT.mkdir(parents=True,exist_ok=True)
status={'state':'RUNNING','environment':'Kaggle','startedAt':datetime.now(timezone.utc).isoformat(),
        'inputMode':SPEC['inputMode'],'outerDownloadSha256':SPEC['outerSha256'],'assemblySha256':SPEC['assemblySha256'],
        'exportsManifestSha256':SPEC['exportsManifestSha256'],'receiptSha256':SPEC['receiptSha256'],
        'upstreamColabReceipt':SPEC['colabReceipt'],'dependencies':SPEC['dependencies'],
        'dependencyInstallationStrategy':SPEC['installationLock']['strategy'],
        'suppliedInstallationLockSha256':SPEC['installationLock']['sha256'],
        'nodeVersion':SPEC['nodeVersion'],'stage':'archive-integrity','commands':[],
        'actualExportsUsed':True,'replacementBricksUsed':False,'staticBuildValidated':False,
        'browserInteractionValidated':False,'learnerUnderstandingExamined':False,
        'nativeWebMcpValidated':False,'credentialsRequired':False,'modelsCalled':False,
        'independentColabEnvironmentValidatedByThisSuite':False}
def redact(text):
    return re.sub(r'\b(?:e2b_[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})','[REDACTED]',text)
def checkpoint():
    (OUTPUT/'assembly-validation-status.json').write_text(json.dumps(status,indent=2))
def command(arguments,name,timeout):
    status['stage']=name;checkpoint();started=time.monotonic()
    process=subprocess.run(arguments,cwd=ROOT,env=ENV,capture_output=True,text=True,timeout=timeout)
    (OUTPUT/(name+'.log')).write_text(redact(process.stdout+'\n'+process.stderr))
    status['commands'].append({'stage':name,'command':arguments,'exitCode':process.returncode,'seconds':round(time.monotonic()-started,3)})
    checkpoint()
    if process.returncode:raise RuntimeError(name+' failed; inspect its retained log')
    return process
try:
    with zipfile.ZipFile(io.BytesIO(PAYLOAD)) as archive:
        names=archive.namelist()
        if len(names)!=len(set(names)) or len(names)>128:raise RuntimeError('Duplicate or excessive assembly members')
        total=0
        for item in archive.infolist():
            parts=PurePosixPath(item.filename)
            if parts.is_absolute() or '..' in parts.parts or '\\' in item.filename or ':' in item.filename:
                raise RuntimeError('Unsafe assembly member path')
            if item.is_dir() or (item.external_attr>>16)&0o170000==0o120000:raise RuntimeError('Unexpected assembly directory or symbolic link')
            total+=item.file_size
            if item.file_size>4*1024*1024 or total>16*1024*1024:raise RuntimeError('Assembly size bound exceeded')
        archive.extractall(ROOT)
    manifest=json.loads((ROOT/'assembly-manifest.json').read_text())
    expected={item['path']:item['sha256'] for item in manifest['files']}
    if len(expected)!=len(manifest['files']):raise RuntimeError('Duplicate assembly manifest entries')
    if set(names)!=(set(expected)|{'assembly-manifest.json'}):raise RuntimeError('Archive and assembly manifest file sets differ')
    if len(expected)!=SPEC['manifestFiles']:raise RuntimeError('Assembly manifest count changed')
    for name,digest in expected.items():
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise RuntimeError('Manifest mismatch: '+name)
    status['manifestFilesVerified']=len(expected)
    entry=(ROOT/'src/student-frontend.js').read_text()
    page=(ROOT/'src/pages/index.astro').read_text()
    if not re.search(r"import\s*\{\s*mountStudentFrontend\s*\}\s*from\s*['\"]\.\./student-frontend\.js['\"]",page):
        raise RuntimeError('Astro page does not import the actual assembler')
    if not re.search(r'\bmountStudentFrontend\s*\(',page):raise RuntimeError('Astro page does not call the assembler')
    linked=[]
    for item in SPEC['brickProofs']:
        path=item['assemblyPath']; actual=hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
        if actual!=item['exportedSha256']:raise RuntimeError('Assembled brick differs from actual export: '+path)
        if path.endswith('.astro'):
            if "../learning/module-2/ExplorationCard.astro" not in page or '<ExplorationCard' not in page:
                raise RuntimeError('Actual Astro card is not imported and used')
        else:
            relative='./'+path.removeprefix('src/'); symbol=item['symbol']
            pattern=r"import\s*\{\s*"+re.escape(symbol)+r"\s*\}\s*from\s*['\"]"+re.escape(relative)+r"['\"]"
            if not re.search(pattern,entry) or not re.search(r'\b'+re.escape(symbol)+r'\s*\(',entry):
                raise RuntimeError('Actual brick is not imported and called: '+path)
        linked.append({**item,'byteIdentityVerified':True,'entrypointLinked':True})
    modules=sorted({item['module'] for item in linked})
    if modules!=list(range(1,9)):raise RuntimeError('Eight actual module exports are required')
    status.update({'modulesLinked':modules,'sourceBrickFilesLinked':len(linked),'sourceGraphCoverageValidated':True})
    (OUTPUT/'actual-export-source-links.json').write_text(json.dumps(linked,indent=2))
    checkpoint()
    node_data=urllib.request.urlopen(SPEC['nodeUrl'],timeout=90).read(64*1024*1024+1)
    if len(node_data)>64*1024*1024 or hashlib.sha256(node_data).hexdigest()!=SPEC['nodeSha256']:
        raise RuntimeError('Pinned official Node archive integrity failure')
    runtime=ROOT/'runtime';runtime.mkdir()
    with tarfile.open(fileobj=io.BytesIO(node_data),mode='r:xz') as archive:archive.extractall(runtime,filter='data')
    bindir=runtime/('node-v'+SPEC['nodeVersion']+'-linux-x64')/'bin'
    home=ROOT/'isolated-home';home.mkdir();npmrc=ROOT/'empty.npmrc';npmrc.write_text('')
    ENV={'PATH':str(bindir)+':/usr/local/bin:/usr/bin:/bin','HOME':str(home),'CI':'true','NO_COLOR':'1',
         'ASTRO_TELEMETRY_DISABLED':'1','npm_config_userconfig':str(npmrc),
         'npm_config_cache':str(ROOT/'npm-cache'),'npm_config_registry':'https://registry.npmjs.org/'}
    node=str(bindir/'node');npm=str(bindir/'npm')
    if command([node,'--version'],'node-version',30).stdout.strip()!='v'+SPEC['nodeVersion']:
        raise RuntimeError('Unexpected Node runtime version')
    package=json.loads((ROOT/'package.json').read_text())
    if package['dependencies']!=SPEC['dependencies']:raise RuntimeError('Actual dependency manifest changed')
    lock_path=ROOT/'package-lock.json'
    if LOCK_PAYLOAD:
        if lock_path.exists() and lock_path.read_bytes()!=LOCK_PAYLOAD:
            raise RuntimeError('Supplied lock would replace an original assembly lock')
        lock_path.write_bytes(LOCK_PAYLOAD)
        frozen_lock=json.loads(LOCK_PAYLOAD)
        if frozen_lock['packages'][''].get('dependencies',{})!=SPEC['dependencies']:
            raise RuntimeError('Supplied lock top-level dependencies drifted')
        command([npm,'ci','--ignore-scripts','--no-audit','--no-fund','--include=optional'],'dependency-ci',900)
        if hashlib.sha256(lock_path.read_bytes()).hexdigest()!=SPEC['installationLock']['sha256']:
            raise RuntimeError('npm ci changed the supplied lock; no fallback is allowed')
    else:
        command([npm,'install','--ignore-scripts','--no-audit','--no-fund','--include=optional'],'dependency-install',900)
    lock_bytes=lock_path.read_bytes();lock_document=json.loads(lock_bytes);lock=lock_document['packages']
    status['producedInstallationLockSha256']=hashlib.sha256(lock_bytes).hexdigest()
    status['producedInstallationLockBytes']=len(lock_bytes)
    status['installationLockGeneratedByThisRun']=not bool(LOCK_PAYLOAD)
    if lock_document['packages'][''].get('dependencies',{})!=SPEC['dependencies']:
        raise RuntimeError('Installed lock top-level dependency declarations drifted')
    for name,version in SPEC['dependencies'].items():
        if lock['node_modules/'+name]['version']!=version:raise RuntimeError('Dependency version drift: '+name)
    shutil.copy2(lock_path,OUTPUT/'actual-assembly-package-lock.json')
    checkpoint()
    command([str(ROOT/'node_modules/.bin/astro'),'build'],'astro-build',600)
    html_path=ROOT/'dist/index.html'
    if not html_path.is_file():raise RuntimeError('Astro did not produce the index page')
    html=html_path.read_text();script_paths=re.findall(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\']',html)
    local_scripts=[p for p in script_paths if not p.startswith(('http:','https:','//'))]
    if not local_scripts:raise RuntimeError('Compiled page has no linked client script')
    for relative in local_scripts:
        path=(ROOT/'dist'/relative.lstrip('/')).resolve()
        if not path.is_relative_to((ROOT/'dist').resolve()) or not path.is_file():raise RuntimeError('Compiled client script is missing')
    for name,digest in expected.items():
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise RuntimeError('Build changed an original assembly file: '+name)
    built={p.relative_to(ROOT/'dist').as_posix():hashlib.sha256(p.read_bytes()).hexdigest()
           for p in sorted((ROOT/'dist').rglob('*')) if p.is_file()}
    (OUTPUT/'static-build-manifest.json').write_text(json.dumps(built,indent=2))
    if LOCK_PAYLOAD and hashlib.sha256(lock_path.read_bytes()).hexdigest()!=SPEC['installationLock']['sha256']:
        raise RuntimeError('Build changed the supplied dependency lock')
    with zipfile.ZipFile(OUTPUT/'compiled-dist.zip','w',zipfile.ZIP_DEFLATED) as zipped:
        for p in sorted((ROOT/'dist').rglob('*')):
            if p.is_file():zipped.write(p,p.relative_to(ROOT/'dist').as_posix())
    status.update({'state':'PASS_ACTUAL_EXPORT_ASSEMBLY_STATIC_BUILD','staticBuildValidated':True,
                  'originalAssemblyFilesUnchanged':True,'compiledClientScripts':local_scripts,
                  'staticBuildFiles':len(built),'compiledDistSha256':hashlib.sha256((OUTPUT/'compiled-dist.zip').read_bytes()).hexdigest(),
                  'limits':['Source linkage and static compilation only','No browser or trusted pointer interaction',
                            'This Kaggle suite does not validate the Colab account plan, CPU runtime or cold start',
                            'No learner comprehension or human approval','No replacement or corrected bricks',
                            'Upstream Colab state is retained as reported: '+str(SPEC['colabReceipt'].get('state','UNAVAILABLE'))]})
except Exception as error:
    status.update({'state':'FAILED','errorType':type(error).__name__,'message':redact(str(error))[:600]})
    raise
finally:
    status['finishedAt']=datetime.now(timezone.utc).isoformat();checkpoint();print(json.dumps(status,indent=2))
'''


def safe_relative_path(value: str) -> PurePosixPath:
    if not isinstance(value, str) or not value or len(value) > 1000:
        raise ValueError('Expected a bounded relative path')
    path = PurePosixPath(value)
    if (path.is_absolute() or any(part in ('', '.', '..') for part in value.split('/'))
            or chr(92) in value or ':' in value or any(ord(char) < 32 for char in value)):
        raise ValueError('Unsafe relative artifact path')
    return path


def bounded_read(path: Path, maximum: int) -> bytes:
    if not path.is_file() or path.stat().st_size > maximum:
        raise ValueError('Input is missing or exceeds its size bound: '+str(path))
    with path.open('rb') as handle:
        payload = handle.read(maximum+1)
    if len(payload) > maximum:
        raise ValueError('Input changed beyond its size bound while being read')
    return payload


def unique_object(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON object key: '+key)
        result[key] = value
    return result


def read_json(payload: bytes) -> dict:
    value = json.loads(payload, object_pairs_hook=unique_object)
    if not isinstance(value, dict):
        raise ValueError('Expected a JSON object')
    return value


def checked_members(archive: zipfile.ZipFile) -> dict[str, bytes]:
    entries = archive.infolist()
    names = [item.filename for item in entries]
    if len(names) != len(set(names)) or len(entries) > 128:
        raise ValueError('Duplicate or excessive archive members')
    if sum(item.file_size for item in entries) > 16 * 1024 * 1024:
        raise ValueError('Archive exceeds preparation bounds')
    for item in entries:
        safe_relative_path(item.filename)
        if item.file_size > 4 * 1024 * 1024:
            raise ValueError('Archive member exceeds preparation bounds')
        if item.is_dir() or (item.external_attr >> 16) & 0o170000 == 0o120000:
            raise ValueError('Directory or symlink outside the expected artifact contract')
    return {item.filename: archive.read(item) for item in entries}


def manifest_hashes(manifest: dict, members: dict[str, bytes], manifest_name: str) -> dict[str, str]:
    items = manifest.get('files')
    if not isinstance(items, list) or not 1 <= len(items) <= 127:
        raise ValueError('Expected a bounded artifact manifest')
    expected = {}
    for item in items:
        if not isinstance(item, dict):
            raise ValueError('Invalid artifact manifest entry')
        path = item.get('path'); safe_relative_path(path)
        digest = item.get('sha256')
        if path in expected or not isinstance(digest, str) or not re.fullmatch(r'[0-9a-f]{64}', digest):
            raise ValueError('Duplicate path or invalid SHA256 in manifest')
        expected[path] = digest
    if set(members) != set(expected) | {manifest_name}:
        raise ValueError('Manifest and archive contents disagree')
    for path, digest in expected.items():
        if hashlib.sha256(members[path]).hexdigest() != digest:
            raise ValueError('Artifact manifest mismatch: '+path)
    return expected


def read_exports(manifest_path: Path, repo: Path) -> tuple[dict, bytes, dict[int, bytes]]:
    raw = bounded_read(manifest_path, 256 * 1024)
    manifest = read_json(raw)
    files = manifest.get('files')
    if not isinstance(files, list) or len(files) != 8:
        raise ValueError('Exactly eight exports are required in the exports manifest')
    exports = {}; paths = set()
    for item in files:
        if not isinstance(item, dict) or type(item.get('moduleId')) is not int or item['moduleId'] not in BRICKS:
            raise ValueError('Each export must name a module from 1 through 8')
        module = item['moduleId']; path = item.get('path'); relative = safe_relative_path(path)
        digest = item.get('sha256'); count = item.get('bytes')
        if (module in exports or path in paths or not isinstance(digest, str)
                or not re.fullmatch(r'[0-9a-f]{64}', digest)
                or type(count) is not int or not 1 <= count <= 12 * 1024 * 1024):
            raise ValueError('Duplicate export or invalid export length/SHA256')
        source = (repo/relative).resolve()
        if not source.is_relative_to(repo.resolve()):
            raise ValueError('Export path escapes the repository')
        exported = bounded_read(source, 12 * 1024 * 1024)
        if len(exported) != count or hashlib.sha256(exported).hexdigest() != digest:
            raise ValueError('Export bytes or SHA256 differ from the public manifest: '+path)
        exports[module] = exported; paths.add(path)
    if set(exports) != set(BRICKS):
        raise ValueError('All eight distinct modules must be present')
    return manifest, raw, exports


def validate_installation_lock(raw: bytes, package: dict) -> dict:
    lock = read_json(raw)
    packages = lock.get('packages')
    if lock.get('lockfileVersion') not in (2, 3) or not isinstance(packages, dict) or not 1 <= len(packages) <= 10000:
        raise ValueError('Expected a bounded npm lockfileVersion 2 or 3')
    if lock.get('name') != package.get('name') or lock.get('version') != package.get('version'):
        raise ValueError('Installation lock package identity differs from the actual assembly')
    root = packages.get('')
    if not isinstance(root, dict) or root.get('name') != package.get('name') or root.get('version') != package.get('version'):
        raise ValueError('Installation lock root package identity differs')
    for field in ('dependencies', 'devDependencies', 'optionalDependencies'):
        if root.get(field, {}) != package.get(field, {}):
            raise ValueError('Installation lock declarations drifted: '+field)
    for name, version in package['dependencies'].items():
        entry = packages.get('node_modules/'+name)
        if not isinstance(entry, dict) or entry.get('version') != version:
            raise ValueError('Installation lock top-level version drifted: '+name)
    for path, entry in packages.items():
        if path:
            safe_relative_path(path)
        if not isinstance(entry, dict) or entry.get('link'):
            raise ValueError('Unexpected linked or invalid dependency lock entry')
        resolved = entry.get('resolved')
        if resolved is not None:
            if not isinstance(resolved, str):
                raise ValueError('Invalid resolved dependency URL')
            url = urlsplit(resolved)
            if (url.scheme != 'https' or url.hostname != 'registry.npmjs.org'
                    or url.username or url.password or url.query or url.fragment or url.port):
                raise ValueError('Dependency lock must use credential-free npm registry HTTPS URLs')
    return lock


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, default=Path(__file__).resolve().parents[2]/'orbit-colab-qa-evidence.zip')
    parser.add_argument('--exports-manifest', type=Path,
                        help='Direct assembly mode: repository-relative paths, exact lengths and SHA256 for eight exports')
    parser.add_argument('--receipt', type=Path, help='Qualified upstream Colab receipt; required in direct assembly mode')
    parser.add_argument('--installation-lock', type=Path, help='Exact bounded npm lock to install with npm ci, without fallback')
    parser.add_argument('--installation-lock-sha256', help='Expected SHA256 of the supplied installation lock')
    parser.add_argument('--out', type=Path, default=repo/'.orbit/actual-colab-assembly-validation')
    args = parser.parse_args()
    if args.installation_lock_sha256 and not args.installation_lock:
        parser.error('--installation-lock-sha256 requires --installation-lock')
    if args.exports_manifest:
        if not args.receipt:
            parser.error('--receipt is required with --exports-manifest')
        input_mode = 'direct-independent-colab-assembly'
        outer_bytes = None
        payload = bounded_read(args.archive, 16 * 1024 * 1024)
        receipt_bytes = bounded_read(args.receipt, 256 * 1024)
        receipt = read_json(receipt_bytes)
        export_manifest, export_manifest_bytes, exports = read_exports(args.exports_manifest, repo)
        if not isinstance(receipt.get('state'), str) or not receipt['state'] or receipt.get('host') != 'Google Colab':
            raise ValueError('Expected a qualified Google Colab receipt with its actual state')
        if receipt.get('inputFiles') != export_manifest['files']:
            raise ValueError('Receipt and public export manifest describe different exports')
        if receipt.get('archiveBytes') != len(payload) or receipt.get('archiveSha256') != hashlib.sha256(payload).hexdigest():
            raise ValueError('Direct assembly differs from the downloaded independent Colab receipt')
    else:
        input_mode = 'outer-grouped-colab-qa-archive'
        outer_bytes = bounded_read(args.archive, 16 * 1024 * 1024)
        with zipfile.ZipFile(io.BytesIO(outer_bytes)) as archive:
            outer = checked_members(archive)
        required = {'qa-report.json', 'assembly.zip', *[f'exports/module-{i}.zip' for i in range(1,9)]}
        if set(outer) != required:
            raise ValueError('Expected the actual QA receipt, eight exports and assembly.zip')
        receipt_bytes = bounded_read(args.receipt, 256 * 1024) if args.receipt else outer['qa-report.json']
        receipt = read_json(receipt_bytes)
        if receipt.get('schemaVersion') != 'orbit-colab-qa-report-v1':
            raise ValueError('Unexpected grouped Colab QA receipt format')
        payload = outer['assembly.zip']
        exports = {module:outer[f'exports/module-{module}.zip'] for module in BRICKS}
        export_manifest = None; export_manifest_bytes = None
        if receipt.get('assembly', {}).get('sha256') != hashlib.sha256(payload).hexdigest():
            raise ValueError('Assembly differs from the downloaded grouped QA receipt')
    digest = hashlib.sha256(payload).hexdigest()
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        assembled = checked_members(archive)
    manifest = read_json(assembled['assembly-manifest.json'])
    expected = manifest_hashes(manifest, assembled, 'assembly-manifest.json')
    if args.exports_manifest and (len(expected) != 46 or receipt.get('assemblyManifestFileCountObserved') != 46
                                  or receipt.get('frontendFileCountObserved') != 9):
        raise ValueError('The independent assembly contract requires nine frontend files and 46 manifest hashes')
    proofs = []
    for module, (filename, symbol) in BRICKS.items():
        with zipfile.ZipFile(io.BytesIO(exports[module])) as archive:
            exported = checked_members(archive)
        member_manifest = read_json(exported['manifest.json'])
        if member_manifest.get('schemaVersion') != 'orbit-learning-artifact-bundle-v1' or member_manifest.get('missionId') != f'module-{module}':
            raise ValueError('Export mission mismatch')
        manifest_hashes(member_manifest, exported, 'manifest.json')
        result = read_json(exported['orbit-learning-result.json'])
        if (result.get('schemaVersion') != 'orbit-learning-colab-v1' or result.get('moduleId') != module
                or result.get('missionId') != f'module-{module}' or result.get('attemptId') != member_manifest.get('attemptId')):
            raise ValueError('Original export result and manifest identities disagree')
        for artifact in result.get('artifacts', []):
            path = artifact.get('path'); safe_relative_path(path)
            if artifact.get('content', '').encode('utf-8') != exported.get(path):
                raise ValueError('Result content differs from the exported frontend file')
        filenames = [filename] + (['ExplorationCard.astro'] if module == 2 else [])
        for name in filenames:
            export_path = 'frontend/'+name
            assembled_path = f'src/learning/module-{module}/'+name
            if exported[export_path] != assembled[assembled_path]:
                raise ValueError('Assembly substituted an actual exported brick')
            proofs.append({'module':module,'exportArchiveSha256':hashlib.sha256(exports[module]).hexdigest(),
                           'exportPath':export_path,'assemblyPath':assembled_path,
                           'exportedSha256':hashlib.sha256(exported[export_path]).hexdigest(),
                           'symbol':'ExplorationCard' if name.endswith('.astro') else symbol})
    secret = re.compile(rb'\b(?:e2b_[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})')
    if any(secret.search(value) for value in assembled.values()):
        raise ValueError('Credential pattern detected; refusing to embed the archive')
    if len(proofs) != 9:
        raise ValueError('Exactly nine real exported frontend files must be linked')
    package = read_json(assembled['package.json'])
    if not isinstance(package.get('dependencies'), dict) or not package['dependencies'] or not all(
            isinstance(version, str) and re.fullmatch(r'\d+\.\d+\.\d+', version) for version in package['dependencies'].values()):
        raise ValueError('Actual assembly dependencies must be exact versions, not silently substituted')
    lock_bytes = bounded_read(args.installation_lock, 8 * 1024 * 1024) if args.installation_lock else b''
    lock_sha = hashlib.sha256(lock_bytes).hexdigest() if lock_bytes else None
    if args.installation_lock_sha256 and args.installation_lock_sha256 != lock_sha:
        raise ValueError('Supplied installation lock differs from its expected SHA256')
    if lock_bytes:
        validate_installation_lock(lock_bytes, package)
        if 'package-lock.json' in assembled and assembled['package-lock.json'] != lock_bytes:
            raise ValueError('Supplied installation lock would replace an original assembly lock')
    receipt_fields = ['schemaVersion','sourceSha256','scope','host','state','accountPlanObserved','humanUnderstanding',
                      'trustedPointerInteractions','coldStartAfterActualRuntimeRestart','summary','assembly',
                      'operator','origin','notStudentObservation','accountPlan','sourceNotebookCommit','fixtureCommit',
                      'transport','manualUploadVerified','manualUploadIncident','tlsVerifiedByDefault','bounds',
                      'frontendFileCountObserved','assemblyManifestFileCountObserved','archiveSha256','archiveBytes',
                      'compiled','nativeWebMcpCallVerified','understandingExamined','humanApproval',
                      'runtimeStoppedAfterDownload','runtimeStopObserved','oldGroupedQaRuntimeTouched']
    spec = {'inputMode':input_mode,'outerSha256':hashlib.sha256(outer_bytes).hexdigest() if outer_bytes else None,
            'assemblySha256':digest,'manifestFiles':len(expected),
            'exportsManifestSha256':hashlib.sha256(export_manifest_bytes).hexdigest() if export_manifest_bytes else None,
            'receiptSha256':hashlib.sha256(receipt_bytes).hexdigest(),
            'dependencies':package['dependencies'], 'brickProofs':proofs,
            'colabReceipt':{key:receipt[key] for key in receipt_fields if key in receipt},
            'installationLock':{'strategy':'frozen-lock-npm-ci' if lock_bytes else 'resolve-and-record-generated-lock',
                                'bytes':len(lock_bytes),'sha256':lock_sha,'topLevelDependencies':package['dependencies']},
            'nodeVersion':NODE_VERSION,'nodeSha256':NODE_SHA256,
            'nodeUrl':f'https://nodejs.org/dist/v{NODE_VERSION}/node-v{NODE_VERSION}-linux-x64.tar.xz'}
    cell = (CELL.replace('__SPEC__',repr(spec)).replace('__PAYLOAD__',repr(base64.b64encode(payload).decode()))
            .replace('__LOCK_PAYLOAD__',repr(base64.b64encode(lock_bytes).decode())))
    notebook = {'nbformat':4,'nbformat_minor':5,
                'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},
                'cells':[{'cell_type':'markdown','metadata':{},'source':[
                  '# Actual Colab exports — Astro assembly validation\n',
                  'Run this single cell in Kaggle with Internet enabled. The embedded assembly is the actual downloaded Colab artifact, byte-matched to eight exports. Its nine source bricks are never replaced.\n',
                  'Input mode: '+input_mode+'. Upstream receipt state is retained literally: '+str(receipt.get('state','UNAVAILABLE'))+'.\n',
                  'Installation strategy: '+spec['installationLock']['strategy']+'. A supplied lock is checked against the original package and installed with npm ci; failures never fall back to npm install.\n',
                  'This checks original-file hashes, source linkage, exact dependencies and static compilation. This Kaggle run does not establish browser behavior, a learner’s comprehension, a Colab account plan, CPU runtime or cold start. Those observations keep their separate upstream receipt.\n']},
                  {'cell_type':'code','metadata':{},'source':cell.splitlines(True),'outputs':[],'execution_count':None}]}
    args.out.mkdir(parents=True,exist_ok=True)
    (args.out/'orbit-actual-colab-assembly-validation.ipynb').write_text(json.dumps(notebook),encoding='utf-8')
    (args.out/'kaggle-cell.py').write_text(cell,encoding='utf-8')
    inputs = args.out/'inputs'; inputs.mkdir(parents=True,exist_ok=True)
    (inputs/'assembly.zip').write_bytes(payload)
    (inputs/'upstream-colab-receipt.json').write_bytes(receipt_bytes)
    if export_manifest_bytes:
        (inputs/'public-exports-manifest.json').write_bytes(export_manifest_bytes)
    exports_dir = inputs/'exports'; exports_dir.mkdir(parents=True,exist_ok=True)
    for module, raw in exports.items():
        (exports_dir/f'module-{module}.zip').write_bytes(raw)
    if lock_bytes:
        (inputs/'installation-package-lock.json').write_bytes(lock_bytes)
    (args.out/'input-specification.json').write_text(json.dumps(spec,indent=2),encoding='utf-8')
    preparation = {'state':'PREPARED_NOT_RUN','preparedAt':datetime.now(timezone.utc).isoformat(),
                   'inputMode':input_mode,
                   'outerDownloadSha256':spec['outerSha256'],'assemblySha256':digest,
                   'exportsManifestSha256':spec['exportsManifestSha256'],'receiptSha256':spec['receiptSha256'],
                   'modules':8,'sourceBrickFiles':len(proofs),'manifestFiles':len(expected),
                   'dependencies':spec['dependencies'],'nodeVersion':NODE_VERSION,
                   'installationLock':spec['installationLock'],
                   'upstreamReceiptState':receipt['state'],'localSoftwareTestsExecuted':False,
                   'independentColabEnvironmentValidatedByThisSuite':False,
                   'notebook':'orbit-actual-colab-assembly-validation.ipynb','codeCells':1}
    (args.out/'preparation.json').write_text(json.dumps(preparation,indent=2),encoding='utf-8')
    print(json.dumps({**preparation,'output':str(args.out.resolve())},indent=2))


if __name__ == '__main__':
    main()
