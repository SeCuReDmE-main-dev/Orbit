"""Prepare credential-free PHP regression validation for Kaggle; run no tests locally."""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import re
import zipfile


CELL = r'''import base64, hashlib, io, json, os, platform, shlex, shutil, subprocess, time, urllib.parse, urllib.request, zipfile
from datetime import datetime, timezone
from pathlib import Path
if not Path('/kaggle').is_dir():
    raise RuntimeError('This PHP validation must run in Kaggle, never on the workstation.')
SPEC = __SPEC__
if SPEC.get('sourceUrl'):
    location=urllib.parse.urlparse(SPEC['sourceUrl'])
    if location.scheme!='https' or location.hostname!='raw.githubusercontent.com' or location.query or location.fragment:
        raise RuntimeError('Frozen source must use the pinned official repository URL')
    with urllib.request.urlopen(SPEC['sourceUrl'],timeout=120) as response:
        PAYLOAD=response.read(SPEC['sourceBytes']+1)
    if len(PAYLOAD)!=SPEC['sourceBytes']:
        raise RuntimeError('Frozen source download size differs')
else:
    PAYLOAD = base64.b64decode(__PAYLOAD__, validate=True)
OUTPUT = Path('/kaggle/working/course-context-validation')
OUTPUT.mkdir(parents=True, exist_ok=True)
status = {'state':'PREFLIGHT', 'host':'Kaggle', 'startedAt':datetime.now(timezone.utc).isoformat(),
          'sourceSha256':SPEC['sha256'], 'requiredPhpMinimum':'8.4.1',
          'testsExecuted':False, 'modelsCalled':False, 'realCredentialsUsed':False,
          'publicTransportActivatedInProduction':False, 'commands':[]}
NEEDED=set(SPEC['requiredExtensions'])
PROBE='echo json_encode(["versionId"=>PHP_VERSION_ID,"version"=>PHP_VERSION,"sapi"=>PHP_SAPI,"binaryConstant"=>PHP_BINARY,"extensions"=>get_loaded_extensions()]);'
# Do not pass Kaggle account credentials, user PHP settings, or application secrets to PHP.
RUNTIME_ENV={key:value for key,value in os.environ.items() if key in {'PATH','HOME','LANG','LC_ALL','TZ','TERM','TMPDIR'}}
RUNTIME_ENV.update({'SSL_CERT_FILE':'/etc/ssl/certs/ca-certificates.crt','SSL_CERT_DIR':'/etc/ssl/certs'})
def checkpoint():
    (OUTPUT/'course-context-status.json').write_text(json.dumps(status, indent=2))
def command(arguments, stage, timeout, cwd=None, env=None):
    status['stage']=stage; checkpoint(); start=time.monotonic()
    completed=subprocess.run(arguments, cwd=cwd, env=env, text=True, capture_output=True, timeout=timeout)
    (OUTPUT/(stage+'.log')).write_text(completed.stdout+'\n'+completed.stderr)
    status['commands'].append({'stage':stage,'command':arguments,'exitCode':completed.returncode,
                               'seconds':round(time.monotonic()-start,3)})
    checkpoint()
    return completed

def probe_runtime(php, label, environment):
    result=command([php,'-r',PROBE],label,30,env=environment)
    if result.returncode:
        return None
    try:
        runtime=json.loads(result.stdout)
        loaded={extension.lower() for extension in runtime['extensions']}
        runtime['missingExtensions']=sorted(NEEDED-loaded)
        runtime['qualified']=runtime['versionId']>=80401 and runtime['sapi']=='cli' and not runtime['missingExtensions']
        return runtime
    except (ValueError,TypeError,KeyError):
        return None

class OfficialAssetRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, url):
        location=urllib.parse.urlparse(url)
        if location.scheme!='https' or location.hostname not in {'github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'}:
            raise RuntimeError('Unexpected redirect while fetching the pinned official PHP runtime')
        return super().redirect_request(request,response,code,message,headers,url)

def provision_official_runtime():
    pin=SPEC['runtimePin']
    libc,libc_version=platform.libc_ver()
    status['runtimePlatform']={'system':platform.system(),'machine':platform.machine(),'libc':libc,'libcVersion':libc_version}
    if platform.system()!='Linux' or platform.machine() not in {'x86_64','AMD64'} or libc!='glibc':
        return None,'The pinned GNU x86_64 runtime requires Linux x86_64 with glibc.'
    try:
        compatible=tuple(map(int,libc_version.split('.')[:2]))>=(2,17)
    except ValueError:
        compatible=False
    if not compatible:
        return None,'The pinned official GNU runtime requires observed glibc >=2.17.'
    runtime_dir=Path('/kaggle/temp/orbit-php-'+pin['release']+'-'+str(time.time_ns()))
    runtime_dir.mkdir(parents=True,exist_ok=False)
    partial=runtime_dir/'frankenphp.download'
    binary=runtime_dir/'frankenphp'
    status['stage']='official-runtime-download'; status['runtimePin']=pin; checkpoint()
    request=urllib.request.Request(pin['url'],headers={'User-Agent':'Orbit-Kaggle-PHP-Validation/1','Accept':'application/octet-stream'})
    digest=hashlib.sha256(); count=0; started=time.monotonic()
    with urllib.request.build_opener(OfficialAssetRedirect()).open(request,timeout=60) as response, partial.open('wb') as target:
        if response.status!=200:
            raise RuntimeError('The official pinned runtime download did not return HTTP 200')
        for chunk in iter(lambda:response.read(1024*1024),b''):
            count+=len(chunk)
            if count>pin['bytes'] or time.monotonic()-started>240:
                raise RuntimeError('The official pinned runtime exceeded its byte or duration bound')
            digest.update(chunk); target.write(chunk)
    actual_digest=digest.hexdigest()
    if count!=pin['bytes'] or actual_digest!=pin['sha256']:
        raise RuntimeError('Pinned official runtime size or SHA-256 mismatch; it will not be executed')
    # Only executable after matching the independently pinned release asset digest.
    partial.replace(binary); binary.chmod(0o700)
    wrapper=runtime_dir/'php'
    wrapper.write_text('#!/bin/sh\nset -eu\nexec '+shlex.quote(str(binary))+' php-cli "$@"\n')
    wrapper.chmod(0o700)
    status['runtimeOrigin']='official-frankenphp-release'
    status['runtimeVerified']={'bytes':count,'sha256':actual_digest,'release':pin['release']}
    status['runtimeCompatibilityLimits']={
        'phpFlags':'Script arguments and -r are forwarded unchanged; unsupported PHP CLI flags are never stripped.',
        'composerScripts':'Not executed: this release does not support every Composer-generated PHP flag.',
        'phpunitProcessIsolation':'Not used by the frozen targeted tests; compatibility is not claimed.'}
    checkpoint()
    return str(wrapper),None

checkpoint()
try:
    php=shutil.which('php')
    runtime=probe_runtime(php,'installed-php-runtime',RUNTIME_ENV) if php else None
    if runtime:
        status['installedPhpRuntime']=runtime
    if not runtime or not runtime['qualified']:
        php,unavailable=provision_official_runtime()
        if php:
            RUNTIME_ENV['PHP_BINARY']=php
            RUNTIME_ENV['PATH']=str(Path(php).parent)+os.pathsep+RUNTIME_ENV.get('PATH','')
            runtime=probe_runtime(php,'official-php-runtime',RUNTIME_ENV)
        else:
            status.update({'state':'UNAVAILABLE_PHP_RUNTIME','reason':unavailable})
    else:
        status['runtimeOrigin']='existing-kaggle-php'
    if not php:
        status.setdefault('reason','A compatible PHP CLI could not be provisioned in this Kaggle runtime.')
    else:
        if not runtime:
            status.update({'state':'UNAVAILABLE_PHP_RUNTIME','reason':'PHP runtime preflight failed.'})
        else:
            status['phpRuntime']=runtime; status['missingExtensions']=runtime['missingExtensions']
            if not runtime['qualified']:
                status.update({'state':'UNAVAILABLE_PHP_RUNTIME',
                               'reason':'The frozen Composer dependency platform requires PHP >=8.4.1, CLI SAPI and listed extensions; no platform check is bypassed.'})
            else:
                if hashlib.sha256(PAYLOAD).hexdigest()!=SPEC['sha256']:
                    raise RuntimeError('Source archive fingerprint mismatch')
                ROOT=Path('/kaggle/temp/orbit-course-context-'+SPEC['sha256'][:12]+'-'+str(time.time_ns()))
                ROOT.mkdir(parents=True,exist_ok=False)
                with zipfile.ZipFile(io.BytesIO(PAYLOAD)) as archive:
                    names=archive.namelist()
                    if len(names)!=len(set(names)) or len(names)>15000 or sum(f.file_size for f in archive.infolist())>150*1024*1024:
                        raise RuntimeError('Unexpected archive size or duplicate member')
                    for member in archive.infolist():
                        name=member.filename
                        if name.startswith(('/', '\\')) or '\\' in name or not (ROOT/name).resolve().is_relative_to(ROOT.resolve()):
                            raise RuntimeError('Unsafe source archive member')
                        if member.external_attr>>16 & 0o170000 == 0o120000:
                            raise RuntimeError('Symlinks are not allowed in the input archive')
                    archive.extractall(ROOT)
                manifest=json.loads((ROOT/'source-manifest.json').read_text())
                for name,digest in manifest.items():
                    if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:
                        raise RuntimeError('Extracted source mismatch: '+name)
                status['verifiedFiles']=len(manifest)
                for folder in ['bootstrap/cache','storage/app/private','storage/framework/cache/data','storage/framework/sessions',
                               'storage/framework/views','storage/logs']:
                    (ROOT/folder).mkdir(parents=True,exist_ok=True)
                if not (ROOT/'vendor/autoload.php').is_file() or not (ROOT/'vendor/bin/phpunit').is_file():
                    raise RuntimeError('Frozen vendor dependencies are absent; do not substitute a different dependency set')
                ENV={**RUNTIME_ENV,'PHP_BINARY':php,'APP_ENV':'testing','APP_KEY':'base64:'+base64.b64encode(b'0'*32).decode(),
                     'DB_CONNECTION':'sqlite','DB_DATABASE':':memory:','DB_URL':'','CACHE_STORE':'array',
                     'SESSION_DRIVER':'array','MAIL_MAILER':'array','QUEUE_CONNECTION':'sync',
                     'SANITY_CONTEXT_VIEWER_TOKEN':'','SANITY_CONTEXT_ENDPOINT_NAME':'',
                     'ORBIT_PUBLIC_COURSE_CONTEXT_ENABLED':'false'}
                child_code=r"""require 'vendor/autoload.php';
$binary=(new Symfony\Component\Process\PhpExecutableFinder())->find(false);
if($binary===false){fwrite(STDERR,'Missing PHP executable');exit(1);}
$process=new Symfony\Component\Process\Process([$binary,'-r','echo json_encode(["versionId"=>PHP_VERSION_ID,"sapi"=>PHP_SAPI]);']);
$process->setTimeout(20);$process->mustRun();echo $process->getOutput();"""
                child=command([php,'-r',child_code],'php-subprocess-compatibility',45,cwd=ROOT,env=ENV)
                if child.returncode:
                    raise RuntimeError('The PHP executable finder/subprocess compatibility check failed; do not run Pint workers')
                subprocess_runtime=json.loads(child.stdout)
                if subprocess_runtime['versionId']!=runtime['versionId'] or subprocess_runtime['sapi']!='cli':
                    raise RuntimeError('The PHP subprocess used a different runtime')
                status['subprocessRuntime']=subprocess_runtime
                artisan=command([php,'artisan','route:list','--path=api/v1/course-context','--json','--no-interaction'],
                                'artisan-public-routes',45,cwd=ROOT,env=ENV)
                if artisan.returncode:
                    raise RuntimeError('Artisan failed with the qualified PHP runtime')
                routes=json.loads(artisan.stdout)
                expected={'api/v1/course-context/outline','api/v1/course-context/entries'}
                if {route['uri'] for route in routes}!=expected or any(route['method']!='GET|HEAD' for route in routes):
                    raise RuntimeError('The stateless public read-only routes were not registered as expected')
                status['registeredPublicRoutes']=routes
                changed=SPEC['modifiedPhpFiles']
                formatter=command([php,'vendor/bin/pint','--format','agent',*changed],
                                  'targeted-php-format',120,cwd=ROOT,env=ENV)
                if formatter.returncode: raise RuntimeError('PHP formatter failed')
                formatted={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in changed}
                status['formatterChangedFiles']=[name for name in changed if formatted[name]!=manifest[name]]
                (OUTPUT/'executed-php-manifest.json').write_text(json.dumps(formatted,indent=2))
                status['executedPhpFingerprint']=hashlib.sha256(json.dumps(formatted,sort_keys=True).encode()).hexdigest()
                if status['formatterChangedFiles']:
                    with zipfile.ZipFile(OUTPUT/'cloud-formatted-source.zip','w',zipfile.ZIP_DEFLATED) as formatted_archive:
                        for name in status['formatterChangedFiles']:
                            formatted_archive.writestr(name,(ROOT/name).read_bytes())
                run=command([php,'vendor/bin/phpunit','--testsuite','Feature','--filter',
                             'PublicCourseContextTest|SanityKnowledgeTest|OrbitAccountTest|OrbitWorkspaceTest',
                             '--log-junit',str(OUTPUT/'php-tests.xml')],
                            'php-regressions',180,cwd=ROOT,env=ENV)
                status['testsExecuted']=True
                status['exitCode']=run.returncode
                status['state']='PASS_PHP_REGRESSIONS' if run.returncode==0 else 'FAILED_PHP_REGRESSIONS'
                if run.returncode: raise RuntimeError('PHP regressions failed; inspect retained logs and JUnit')
except Exception as error:
    if status['state'] not in ['FAILED_PHP_REGRESSIONS']:
        status['state']='FAILED'
    status.update({'errorType':type(error).__name__,'message':str(error)[:500]})
    raise
finally:
    status['finishedAt']=datetime.now(timezone.utc).isoformat()
    checkpoint()
    print(json.dumps(status,indent=2))
'''

MODIFIED = [
    'app/Http/Controllers/CourseContextController.php', 'app/Services/PublicCourseContextReader.php',
    'app/Http/Middleware/PublicCourseContext.php', 'bootstrap/app.php',
    'config/cors.php', 'config/orbit.php', 'config/course_context.php', 'routes/api.php', 'tests/Feature/PublicCourseContextTest.php',
]

# These are public format descriptions and encoder strings, not embedded keys.
# Each installed file was compared byte-for-byte to the official source at the
# Composer-locked commit. Any changed file, offset, surrounding bytes, extra PEM
# marker, or account token is rejected. There is no vendor/directory exception.
PHPSECLIB_SOURCE_COMMIT = 'bb7b959c8159957edae6f5084ebbac765d310e16'
PUBLIC_PEM_SYNTAX = {
    'vendor/phpseclib/phpseclib/phpseclib/Crypt/Common/Formats/Keys/OpenSSH.php': {
        'sha256': '07b47a5397719c7f7c6b071a7b8836f021fb84035bafb28282b03db1e94fb87e',
        'sourcePath': 'phpseclib/Crypt/Common/Formats/Keys/OpenSSH.php',
        'occurrences': [(7828, b'-----BEGIN OPENSSH PRIVATE KEY-----', b'    return "', b'\\n" .\n      ')],
    },
    'vendor/phpseclib/phpseclib/phpseclib/Crypt/Common/Formats/Keys/PKCS8.php': {
        'sha256': 'e1c5b29446db9f9c004e8e9be28e8b9e6359f1201341ef3de6b2c22aa8bf0120',
        'sourcePath': 'phpseclib/Crypt/Common/Formats/Keys/PKCS8.php',
        'occurrences': [(249, b'-----BEGIN PRIVATE KEY-----', b'KEY-----\n * ', b'\n * -----BEG'),
                        (9661, b'-----BEGIN PRIVATE KEY-----', b'    return "', b'\\r\\n" .\n    ')],
    },
    'vendor/phpseclib/phpseclib/phpseclib/Crypt/DH/Formats/Keys/PKCS8.php': {
        'sha256': '393def515b9e6350adb370927b6d60e41376c3a0df142c3a34677cb4ceb8167d',
        'sourcePath': 'phpseclib/Crypt/DH/Formats/Keys/PKCS8.php',
        'occurrences': [(165, b'-----BEGIN PRIVATE KEY-----', b'KEY-----\n * ', b'\n * -----BEG')],
    },
    'vendor/phpseclib/phpseclib/phpseclib/Crypt/DSA/Formats/Keys/PKCS8.php': {
        'sha256': 'b3739dd15b8a94c05d60778f17e37babfc3d2b5c0d118838af4b74338c5d6f6c',
        'sourcePath': 'phpseclib/Crypt/DSA/Formats/Keys/PKCS8.php',
        'occurrences': [(166, b'-----BEGIN PRIVATE KEY-----', b'KEY-----\n * ', b'\n * -----BEG')],
    },
    'vendor/phpseclib/phpseclib/phpseclib/Crypt/EC/Formats/Keys/PKCS1.php': {
        'sha256': '6b355a29b5b550b45e17d55e3e7eb4c538702006011c22f38d8637f00f453f90',
        'sourcePath': 'phpseclib/Crypt/EC/Formats/Keys/PKCS1.php',
        'occurrences': [(163, b'-----BEGIN EC PRIVATE KEY-----', b'ders:\n *\n * ', b'\n * -----BEG')],
    },
    'vendor/phpseclib/phpseclib/phpseclib/Crypt/EC/Formats/Keys/PKCS8.php': {
        'sha256': '0180d6720dd47365292975c94a1a621ed0c5a3a05e6d0e0c57f32bd91b73089e',
        'sourcePath': 'phpseclib/Crypt/EC/Formats/Keys/PKCS8.php',
        'occurrences': [(165, b'-----BEGIN PRIVATE KEY-----', b'KEY-----\n * ', b'\n * -----BEG')],
    },
    'vendor/phpseclib/phpseclib/phpseclib/Crypt/RSA/Formats/Keys/PKCS1.php': {
        'sha256': 'df5ffa63b796919cc291c97e2c00616a4b1ad5ec732aee9a87db3eb142ea348b',
        'sourcePath': 'phpseclib/Crypt/RSA/Formats/Keys/PKCS1.php',
        'occurrences': [(153, b'-----BEGIN RSA PRIVATE KEY-----', b'ders:\n *\n * ', b'\n * -----BEG')],
    },
    'vendor/phpseclib/phpseclib/phpseclib/Crypt/RSA/Formats/Keys/PKCS8.php': {
        'sha256': '8010e237da8e0affba5ceb33158034a0b0616608e4fd299de25a1255de794957',
        'sourcePath': 'phpseclib/Crypt/RSA/Formats/Keys/PKCS8.php',
        'occurrences': [(253, b'-----BEGIN PRIVATE KEY-----', b'KEY-----\n * ', b'\n * -----BEG')],
    },
    'vendor/phpseclib/phpseclib/phpseclib/Crypt/RSA/Formats/Keys/PSS.php': {
        'sha256': '820a1a2f5ba915889e888b22b4365030c059e31c505396b3499becbf60e869cf',
        'sourcePath': 'phpseclib/Crypt/RSA/Formats/Keys/PSS.php',
        'occurrences': [(257, b'-----BEGIN PRIVATE KEY-----', b'KEY-----\n * ', b'\n * -----BEG')],
    },
}


def scan_source_inputs(files: dict[str, bytes]) -> list[dict]:
    """Reject credentials; recognize only pinned, exact public encoder syntax."""
    tokens = re.compile(rb'github_pat_[A-Za-z0-9_]{30,}|e2b_[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}')
    pem_headers = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')
    lock = json.loads(files['composer.lock'])
    package = next((entry for entry in lock['packages'] + lock.get('packages-dev', [])
                    if entry['name'] == 'phpseclib/phpseclib'), None)
    locked_source = bool(package and package.get('source', {}).get('url') == 'https://github.com/phpseclib/phpseclib.git'
                         and package.get('source', {}).get('reference') == PHPSECLIB_SOURCE_COMMIT)
    accepted = []
    for name, value in files.items():
        if tokens.search(value):
            raise ValueError('Refusing a credential marker in source: ' + name)
        matches = list(pem_headers.finditer(value))
        if not matches:
            continue
        public = PUBLIC_PEM_SYNTAX.get(name)
        if not locked_source or not public or hashlib.sha256(value).hexdigest() != public['sha256']:
            raise ValueError('Refusing a credential marker in source: ' + name)
        actual = [(match.start(), match.group(), value[match.start()-12:match.start()],
                   value[match.end():match.end()+12]) for match in matches]
        if actual != public['occurrences']:
            raise ValueError('Refusing an unrecognized PEM occurrence in source: ' + name)
        accepted.append({'path': name, 'sha256': public['sha256'],
                         'offsets': [match.start() for match in matches],
                         'classification': 'exact-public-format-syntax-no-key-payload',
                         'officialByteComparison': 'verified-during-preparation-review',
                         'sourceCommit': PHPSECLIB_SOURCE_COMMIT,
                         'sourceUrl': 'https://raw.githubusercontent.com/phpseclib/phpseclib/' + PHPSECLIB_SOURCE_COMMIT + '/' + public['sourcePath']})
    return accepted


def main() -> None:
    arguments = argparse.ArgumentParser(description=__doc__)
    arguments.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    arguments.add_argument('--out', type=Path)
    arguments.add_argument('--source-url', help='Immutable raw GitHub URL of the scanned source archive')
    options = arguments.parse_args()
    repo = options.repo.resolve()
    source = repo/'services/account-api'
    output = (options.out or repo/'.orbit/course-context-validation').resolve()
    files: dict[str, bytes] = {}
    vendor_documentation = {'test', 'tests', 'doc', 'docs', 'example', 'examples', 'development', 'dev'}
    def reject_link(path: Path) -> None:
        # Python 3.10 does not expose Path.is_junction; inspect Windows reparse
        # tags directly as well, before descending into any input directory.
        reparse_tag = getattr(path.lstat(), 'st_reparse_tag', 0)
        if path.is_symlink() or reparse_tag in {0xA0000003, 0xA000000C}:
            raise ValueError('Symlinks and junctions are not allowed in source inputs: '+path.relative_to(source).as_posix())
    total_bytes = 0
    for folder in ['app', 'config', 'routes', 'database', 'tests', 'vendor']:
        reject_link(source/folder)
        print(json.dumps({'state': 'PREPARING_INPUTS', 'scope': folder, 'files': len(files)}), flush=True)
        for current, directories, names in os.walk(source/folder, followlinks=False):
            for name in directories:
                reject_link(Path(current)/name)
            package_root = folder == 'vendor' and len(Path(current).relative_to(source).parts) == 3
            directories[:] = [name for name in directories
                              if name not in {'.git', 'node_modules', '.cache'}
                              and not (package_root and name.lower() in vendor_documentation)]
            for name in names:
                path = Path(current)/name
                reject_link(path)
                relative = path.relative_to(source).as_posix()
                if name.startswith('.env') or (folder=='database' and path.suffix!='.php'):
                    continue
                is_license = name.lower().startswith(('license', 'licence', 'copying', 'notice', 'copyright'))
                if folder == 'vendor' and path.suffix.lower() in {'.md', '.rst'} and not is_license:
                    continue
                if not path.is_file():
                    raise ValueError('Only regular source files are allowed: '+relative)
                files[relative] = path.read_bytes()
                total_bytes += len(files[relative])
                if len(files) > 15000 or total_bytes > 150*1024*1024:
                    raise ValueError('Frozen input exceeds the Kaggle archive bounds.')
                if len(files) % 1000 == 0:
                    print(json.dumps({'state': 'PREPARING_INPUTS', 'files': len(files), 'bytes': total_bytes}), flush=True)
    for name in ['artisan','composer.json','composer.lock','phpunit.xml','bootstrap/app.php','bootstrap/providers.php']:
        reject_link(source/name)
        files[name]=(source/name).read_bytes()
    required=['vendor/autoload.php','vendor/bin/phpunit',*MODIFIED]
    for name in required:
        if name not in files:
            raise ValueError('Required frozen input is missing: '+name)
    public_syntax = scan_source_inputs(files)
    hashes={name:hashlib.sha256(value).hexdigest() for name,value in sorted(files.items())}
    files['source-manifest.json']=json.dumps(hashes,indent=2).encode()
    memory=io.BytesIO()
    with zipfile.ZipFile(memory,'w',zipfile.ZIP_DEFLATED) as archive:
        for name,value in sorted(files.items()):
            info=zipfile.ZipInfo(name,date_time=(2026,10,1,0,0,0))
            info.create_system=3; info.external_attr=(0o100644<<16)
            info.compress_type=zipfile.ZIP_DEFLATED
            archive.writestr(info,value)
    payload=memory.getvalue()
    composer_lock=json.loads(files['composer.lock'])
    extensions={'pdo','pdo_sqlite'}
    for package in composer_lock['packages']+composer_lock.get('packages-dev',[]):
        extensions.update(name[4:].lower() for name in package.get('require',{}) if name.startswith('ext-'))
    spec={'sha256':hashlib.sha256(payload).hexdigest(),'modifiedPhpFiles':MODIFIED,'files':len(files),
          'requiredExtensions':sorted(extensions),
          'sourceScan': {'accountTokenPolicy': 'reject-everywhere',
                         'pemHeaderPolicy': 'reject-except-exact-pinned-public-syntax',
                         'acceptedPublicSyntax': public_syntax,
                         'excludedVendorDocumentation': sorted(vendor_documentation)},
          'runtimePin':{'release':'v1.12.7','asset':'frankenphp-linux-x86_64-gnu',
                        'url':'https://github.com/php/frankenphp/releases/download/v1.12.7/frankenphp-linux-x86_64-gnu',
                        'sha256':'b8eed5e4d2215874a8ca1f9b812d5394b4722d02c44dbcbf5c782b322d6baa43',
                        'bytes':169209640,
                        'releaseSource':'https://github.com/php/frankenphp/releases/tag/v1.12.7',
                        'digestSource':'https://api.github.com/repos/php/frankenphp/releases/tags/v1.12.7',
                        'runtimeDocs':'https://frankenphp.dev/docs/static/',
                        'cliLimits':'https://frankenphp.dev/docs/known-issues/',
                        'extensionBuildSource':'https://raw.githubusercontent.com/php/frankenphp/v1.12.7/build-static.sh'},
          'generatedAt':datetime.now(timezone.utc).isoformat(),'state':'PREPARED_NOT_EXECUTED'}
    if options.source_url:
        if not re.fullmatch(r'https://raw\.githubusercontent\.com/SeCuReDmE-main-dev/Orbit/[0-9a-f]{40}/docs/receipts/fixtures/[A-Za-z0-9_.-]+\.zip',options.source_url):
            raise ValueError('Use an immutable archive URL in the authorized public Orbit repository')
        spec.update({'sourceUrl':options.source_url,'sourceBytes':len(payload)})
    cell=CELL.replace('__SPEC__',repr(spec)).replace('__PAYLOAD__',repr('' if options.source_url else base64.b64encode(payload).decode()))
    notebook={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},
              'cells':[{'cell_type':'markdown','metadata':{},'source':[
                  '# Orbit public course Context — PHP regressions\n',
                  'Run this cell only in Kaggle. It uses frozen application/vendor sources, fixture-only authentication, and fake Sanity HTTP responses. No model, deployment, public activation or real account credential is used.\n',
                  '**PHP >=8.4.1 with the extensions from the frozen Composer lock is checked first. If absent or incompatible, Kaggle downloads the pinned official FrankenPHP v1.12.7 GNU release asset, checks its exact size and SHA-256 before execution, then measures its version and extensions. No workstation runtime is installed and no platform check is bypassed.**\n',
                  'The wrapper forwards every argument unchanged. Composer scripts and PHPUnit process isolation are not exercised; unsupported CLI flags are not discarded. Symfony subprocess compatibility and Artisan route registration are checked before Pint and the targeted PHPUnit regressions. A missing or incompatible runtime is UNAVAILABLE, never a passing test.\n',
                  'The cloud formatter output is retained separately if source formatting changes. Authenticated Studio/CORS browser behavior remains a separate integration check.\n']},
                       {'cell_type':'code','metadata':{},'source':cell.splitlines(True),'outputs':[],'execution_count':None}]}
    output.mkdir(parents=True,exist_ok=True)
    (output/'source.zip').write_bytes(payload)
    (output/'course-context-validation-cell.py').write_text(cell,encoding='utf-8')
    (output/'course-context-validation.ipynb').write_text(json.dumps(notebook,indent=1),encoding='utf-8')
    (output/'preparation.json').write_text(json.dumps(spec,indent=2),encoding='utf-8')
    print(json.dumps(spec))


if __name__=='__main__':
    main()
