"""Prepare one credential-free Kaggle cell; do not install or test anything locally."""
from __future__ import annotations

import argparse
import base64
import gzip
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import tarfile


NODE_VERSION = '22.20.0'
NODE_SHA256 = '00bbd05e306ea68b6e13e17360d0e2f680b493ef95f2fea1c4296ff7437530bc'
HOST_DEPENDENCIES = ('sanity', 'react', 'react-dom', 'styled-components')

SMOKE = r"""import assert from 'node:assert/strict';
import {orbitLearningStudio} from '@orbit/learning-studio';
const plugin = orbitLearningStudio({courseOrigin:'https://orbit.securedme.ca', webmcp:false});
assert.equal(plugin.name, 'orbit-learning-studio');
for (const field of ['projectId', 'dataset', 'auth', 'theme']) assert.equal(Object.hasOwn(plugin, field), false);
assert.equal(Array.isArray(plugin.tools), true);
assert.deepEqual(plugin.tools.map(tool => tool.name), ['orbit-learning-lab', 'orbit-learning-projects']);
for (const tool of plugin.tools) {assert.equal(typeof tool.component, 'function'); assert.ok(tool.router);}
assert.ok(plugin.schema.types.some(type => type.name === 'orbitLearningPublication' && type.readOnly === true));
assert.throws(() => orbitLearningStudio({courseOrigin:'https://unapproved.example'}));
console.log(JSON.stringify({importValidated:true, twoPortableTools:true, hostAuthorityPreserved:true,
  publicationSchemaRegistered:true, originGuardValidated:true, authenticatedRuntimeValidated:false}));
"""

CONFIG = """import {defineConfig} from 'sanity';
import {orbitLearningStudio} from '@orbit/learning-studio';
export default defineConfig({name:'orbit-empty-install-check', title:'Orbit blank installation check',
  projectId:'abc123xy', dataset:'production',
  plugins:[orbitLearningStudio({courseOrigin:'https://orbit.securedme.ca', webmcp:false})],
  schema:{types:[]}});
"""

CLI_CONFIG = """import {defineCliConfig} from 'sanity/cli';
export default defineCliConfig({api:{projectId:'abc123xy', dataset:'production'}});
"""

CELL = r'''import base64, gzip, hashlib, io, json, os, re, shutil, subprocess, tarfile, time, urllib.request
from pathlib import Path
from datetime import datetime, timezone
if not Path('/kaggle').is_dir():
    raise RuntimeError('Run this validation in Kaggle. No workstation installation is authorized.')
SPEC = __SPEC__
PAYLOAD = base64.b64decode(__PAYLOAD__, validate=True)
LOCK_PAYLOAD = gzip.decompress(base64.b64decode(__LOCK_PAYLOAD__, validate=True))
if hashlib.sha256(LOCK_PAYLOAD).hexdigest() != SPEC['lockSha256']:
    raise RuntimeError('Installation lock integrity failure')
if hashlib.sha256(PAYLOAD).hexdigest() != SPEC['archiveSha256']:
    raise RuntimeError('Plugin archive integrity failure')
with tarfile.open(fileobj=io.BytesIO(PAYLOAD), mode='r:gz') as archive:
    members = archive.getmembers()
    expected = {'package/package.json','package/README.md','package/dist/index.js','package/dist/index.d.ts','package/dist/build-inputs.json'}
    if {item.name for item in members} != expected or any(not item.isfile() for item in members):
        raise RuntimeError('Unexpected files or links in plugin archive')
ROOT = Path('/kaggle/temp/orbit-second-studio-' + SPEC['archiveSha256'][:12] + '-' + str(time.time_ns()))
ROOT.mkdir(parents=True, exist_ok=False)
OUTPUT = Path('/kaggle/working/learning-studio-validation')
OUTPUT.mkdir(parents=True, exist_ok=True)
HOME_DIR = ROOT/'isolated-home'; HOME_DIR.mkdir()
NPM_CONFIG = ROOT/'empty.npmrc'; NPM_CONFIG.write_text('')
status = {'state':'RUNNING', 'environment':'Kaggle', 'startedAt':datetime.now(timezone.utc).isoformat(),
          'archiveSha256':SPEC['archiveSha256'], 'fixedHostDependencies':SPEC['hostDependencies'],
          'nodeVersion':SPEC['nodeVersion'], 'archiveVerified':True,
          'installationLockSha256':SPEC['lockSha256'], 'lockedDependencies':True,
          'installedInBlankStudio':False, 'importValidated':False, 'staticBuildValidated':False,
          'authenticatedRuntimeValidated':False, 'crossOriginContextValidated':False,
          'nativeWebMcpValidated':False, 'sanityWritesPerformed':False, 'publishedToNpm':False,
          'stage':'runtime', 'commands':[]}
def redact(text):
    return re.sub(r'\b(?:e2b_[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})', '[REDACTED]', text)
def checkpoint():
    (OUTPUT/'installation-status.json').write_text(json.dumps(status,indent=2))
def command(arguments, name, timeout):
    status['stage']=name; checkpoint(); started=time.monotonic()
    process=subprocess.run(arguments,cwd=ROOT,env=ENV,capture_output=True,text=True,timeout=timeout)
    (OUTPUT/(name+'.log')).write_text(redact(process.stdout+'\n'+process.stderr))
    status['commands'].append({'stage':name,'command':arguments,'exitCode':process.returncode,'seconds':round(time.monotonic()-started,3)})
    checkpoint()
    if process.returncode: raise RuntimeError(name+' failed; review its retained log')
    return process
try:
    runtime_data=urllib.request.urlopen(SPEC['nodeUrl'],timeout=90).read(64*1024*1024+1)
    if len(runtime_data)>64*1024*1024 or hashlib.sha256(runtime_data).hexdigest()!=SPEC['nodeSha256']:
        raise RuntimeError('Pinned Node archive integrity failure')
    runtime=ROOT/'runtime'; runtime.mkdir()
    with tarfile.open(fileobj=io.BytesIO(runtime_data),mode='r:xz') as archive:
        archive.extractall(runtime, filter='data')
    bindir=runtime/('node-v'+SPEC['nodeVersion']+'-linux-x64')/'bin'
    ENV={'PATH':str(bindir)+':/usr/local/bin:/usr/bin:/bin', 'HOME':str(HOME_DIR), 'CI':'true',
         'NO_COLOR':'1', 'SANITY_CLI_TELEMETRY_ENABLED':'false',
         'npm_config_userconfig':str(NPM_CONFIG), 'npm_config_cache':str(ROOT/'npm-cache'),
         'npm_config_registry':'https://registry.npmjs.org/'}
    node=str(bindir/'node'); npm=str(bindir/'npm')
    version=command([node,'--version'],'node-version',30).stdout.strip()
    if version!='v'+SPEC['nodeVersion']: raise RuntimeError('Unexpected Node version')
    (ROOT/SPEC['archiveName']).write_bytes(PAYLOAD)
    dependencies={**SPEC['hostDependencies'], '@orbit/learning-studio':'file:./'+SPEC['archiveName']}
    (ROOT/'package.json').write_text(json.dumps({'name':'orbit-empty-studio-validation','private':True,
      'type':'module','dependencies':dependencies},indent=2))
    (ROOT/'package-lock.json').write_bytes(LOCK_PAYLOAD)
    (ROOT/'sanity.config.ts').write_text(SPEC['studioConfig'])
    (ROOT/'sanity.cli.ts').write_text(SPEC['cliConfig'])
    (ROOT/'smoke.mjs').write_text(SPEC['smoke'])
    command([npm,'ci','--ignore-scripts','--no-audit','--no-fund','--include=optional'],'dependency-install',900)
    status['installedInBlankStudio']=True; checkpoint()
    resolved=json.loads((ROOT/'package-lock.json').read_text())['packages']
    for name, expected in SPEC['hostDependencies'].items():
        if resolved['node_modules/'+name]['version']!=expected:
            raise RuntimeError('Host dependency version drift: '+name)
    installed=(ROOT/'node_modules/@orbit/learning-studio/dist/index.js').read_bytes()
    status['installedEntrySha256']=hashlib.sha256(installed).hexdigest()
    command([node,'smoke.mjs'],'plugin-import',120)
    status['importValidated']=True; checkpoint()
    command([str(ROOT/'node_modules/.bin/sanity'),'build','dist','--yes','--no-auto-updates'],'studio-build',900)
    if not (ROOT/'dist/index.html').is_file(): raise RuntimeError('Studio build did not produce index.html')
    built={p.relative_to(ROOT/'dist').as_posix():hashlib.sha256(p.read_bytes()).hexdigest()
           for p in sorted((ROOT/'dist').rglob('*')) if p.is_file()}
    (OUTPUT/'static-build-manifest.json').write_text(json.dumps(built,indent=2))
    shutil.copy2(ROOT/'package-lock.json',OUTPUT/'second-studio-package-lock.json')
    status.update({'state':'PASS_STATIC_INSTALL_BUILD','staticBuildValidated':True,'staticBuildFiles':len(built),
      'limits':['No Sanity login or real account/dataset used','No browser session or native WebMCP execution',
                'No cross-origin Context call','No learner data or publication write','No npm publication']})
except Exception as error:
    status.update({'state':'FAILED','errorType':type(error).__name__,'message':redact(str(error))[:600]})
    raise
finally:
    status['finishedAt']=datetime.now(timezone.utc).isoformat(); checkpoint()
    print(json.dumps(status,indent=2))
'''


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--out', type=Path)
    arguments = parser.parse_args()
    root = arguments.repo.resolve()
    output = (arguments.out or root/'.orbit/learning-studio-validation').resolve()
    package_report = json.loads((root/'artifacts/learning-studio/package-report.json').read_text(encoding='utf-8-sig'))
    archive_name = package_report['archive']
    if Path(archive_name).name != archive_name:
        raise ValueError('The package report must identify a plain archive filename')
    archive = root/'artifacts/learning-studio'/archive_name
    payload = archive.read_bytes()
    digest = hashlib.sha256(payload).hexdigest()
    if digest != package_report['sha256']:
        raise ValueError('The collected archive differs from its cloud packaging report')
    studio = json.loads((root/'studio/package.json').read_text(encoding='utf-8-sig'))
    lock = json.loads((root/'package-lock.json').read_text(encoding='utf-8-sig'))
    versions = {name:lock['packages']['node_modules/'+name]['version'] for name in HOST_DEPENDENCIES}
    installation_lock_path = root/'artifacts/learning-studio/installation-package-lock.json'
    installation_lock = json.loads(installation_lock_path.read_text(encoding='utf-8-sig'))
    expected_dependencies = {**versions, '@orbit/learning-studio':'file:./'+archive_name}
    if installation_lock['packages']['']['dependencies'] != expected_dependencies:
        raise ValueError('Tested installation lock and host dependencies disagree')
    plugin_lock = installation_lock['packages']['node_modules/@orbit/learning-studio']
    if plugin_lock['resolved'] != 'file:'+archive_name:
        raise ValueError('The installation lock references a different plugin')
    plugin_lock['integrity'] = 'sha512-'+base64.b64encode(hashlib.sha512(payload).digest()).decode()
    lock_payload = (json.dumps(installation_lock,indent=2)+'\n').encode()
    installation_lock_path.write_bytes(lock_payload)
    if studio['dependencies']['sanity'] != versions['sanity']:
        raise ValueError('Sanity host manifest and root lockfile disagree')
    spec = {'archiveName':archive_name, 'archiveSha256':digest, 'hostDependencies':versions,
            'lockSha256':hashlib.sha256(lock_payload).hexdigest(),
            'nodeVersion':NODE_VERSION, 'nodeSha256':NODE_SHA256,
            'nodeUrl':f'https://nodejs.org/dist/v{NODE_VERSION}/node-v{NODE_VERSION}-linux-x64.tar.xz',
            'studioConfig':CONFIG, 'cliConfig':CLI_CONFIG, 'smoke':SMOKE}
    cell = CELL.replace('__SPEC__', repr(spec)).replace('__PAYLOAD__', repr(base64.b64encode(payload).decode())).replace('__LOCK_PAYLOAD__',repr(base64.b64encode(gzip.compress(lock_payload, mtime=0)).decode()))
    notebook = {'nbformat':4, 'nbformat_minor':5,
                'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},
                'cells':[{'cell_type':'markdown','metadata':{},'source':[
                  '# Orbit portable plugin — blank Studio installation\n',
                  'Run the single code cell in Kaggle with Internet enabled. It embeds the verified plugin archive, pins host versions, installs into a fresh directory, imports the plugin, and builds the Studio. No credentials, account creation, model calls, deployment or npm publication.\n',
                  '**A passing result validates static installation/build only. Authentication, permissions, cross-origin Context and native WebMCP need separate browser QA.**\n']},
                  {'cell_type':'code','metadata':{},'source':cell.splitlines(True),'outputs':[],'execution_count':None}]}
    output.mkdir(parents=True,exist_ok=True)
    (output/'orbit-learning-studio-installation.ipynb').write_text(json.dumps(notebook),encoding='utf-8')
    (output/'kaggle-cell.py').write_text(cell,encoding='utf-8')
    preparation = {'state':'PREPARED_NOT_RUN', 'preparedAt':datetime.now(timezone.utc).isoformat(),
                   'archiveSha256':digest, 'hostDependencies':versions, 'installationLockSha256':spec['lockSha256'], 'nodeVersion':NODE_VERSION,
                   'notebook':'orbit-learning-studio-installation.ipynb','codeCells':1,
                   'credentialInputs':[], 'testsExecutedLocally':False}
    (output/'preparation.json').write_text(json.dumps(preparation,indent=2),encoding='utf-8')
    print(json.dumps({**preparation,'output':str(output)},indent=2))


if __name__ == '__main__':
    main()
