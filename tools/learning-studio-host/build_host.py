"""Build a second self-hosted Studio in E2B; this is not authenticated QA."""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import urllib.request

NODE_VERSION = '22.20.0'
NODE_SHA256 = '00bbd05e306ea68b6e13e17360d0e2f680b493ef95f2fea1c4296ff7437530bc'
DEPENDENCIES = {'react': '19.3.0', 'react-dom': '19.3.0', 'sanity': '6.16.0', 'styled-components': '6.5.3'}
PLUGIN_REFERENCE = 'file:../../artifacts/learning-studio/orbit-learning-studio-1.0.0.tgz'


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--environment', choices=['e2b'], required=True)
    arguments = parser.parse_args()
    if os.name == 'nt':
        raise RuntimeError('Build this host only in the isolated E2B Linux workspace.')
    host = Path(__file__).resolve().parent
    repository = host.parents[1]
    status_path = host/'host-build-status.json'
    status_path.unlink(missing_ok=True)
    artifacts = repository/'artifacts/learning-studio'
    report = json.loads((artifacts/'package-report.json').read_text())
    archive = artifacts/'orbit-learning-studio-1.0.0.tgz'
    archive_bytes = archive.read_bytes()
    archive_sha = hashlib.sha256(archive_bytes).hexdigest()
    if report['archive'] != archive.name or report['sha256'] != archive_sha or report['bundled'] is not True:
        raise RuntimeError('Portable archive and cloud packaging receipt disagree.')

    package = json.loads((host/'package.json').read_text())
    expected = {'@orbit/learning-studio': PLUGIN_REFERENCE, **DEPENDENCIES}
    lock_path = host/'package-lock.json'
    lock_source = lock_path.read_bytes()
    lock = json.loads(lock_source)
    if package['dependencies'] != expected or lock['packages']['']['dependencies'] != expected:
        raise RuntimeError('Host dependencies differ from the retained installation graph.')
    plugin_lock = lock['packages']['node_modules/@orbit/learning-studio']
    if plugin_lock['resolved'] != PLUGIN_REFERENCE or plugin_lock.get('link'):
        raise RuntimeError('The host must install the archive, not a workspace source link.')
    # Keep every registry version and integrity unchanged. The archive is rebuilt
    # from the current source, so bind only its SHA-512 in this isolated checkout.
    plugin_lock['integrity'] = 'sha512-'+base64.b64encode(hashlib.sha512(archive_bytes).digest()).decode()
    bound_lock = (json.dumps(lock, indent=2)+'\n').encode()
    lock_path.write_bytes(bound_lock)

    runtime = host/'.runtime'
    runtime.mkdir(exist_ok=True)
    runtime_data = urllib.request.urlopen(
        f'https://nodejs.org/dist/v{NODE_VERSION}/node-v{NODE_VERSION}-linux-x64.tar.xz', timeout=90,
    ).read(64*1024*1024+1)
    if len(runtime_data) > 64*1024*1024 or hashlib.sha256(runtime_data).hexdigest() != NODE_SHA256:
        raise RuntimeError('Pinned Node archive integrity failure.')
    with tarfile.open(fileobj=io.BytesIO(runtime_data), mode='r:xz') as stream:
        stream.extractall(runtime, filter='data')
    bindir = runtime/f'node-v{NODE_VERSION}-linux-x64'/'bin'
    isolated_home = host/'.build-home'
    isolated_home.mkdir(exist_ok=True)
    npm_config = host/'.build.npmrc'
    npm_config.write_text('')
    environment = {
        'PATH': str(bindir)+':/usr/local/bin:/usr/bin:/bin', 'HOME': str(isolated_home),
        'CI': 'true', 'NO_COLOR': '1', 'SANITY_CLI_TELEMETRY_ENABLED': 'false',
        'SANITY_STUDIO_TELEMETRY_DISABLED': '1',
        'npm_config_userconfig': str(npm_config), 'npm_config_cache': str(host/'.npm-cache'),
        'npm_config_registry': 'https://registry.npmjs.org/',
    }
    # Do not forward SANITY_STUDIO_* credentials or the orchestrator's account.
    node, npm = str(bindir/'node'), str(bindir/'npm')
    observed_node = subprocess.run([node, '--version'], env=environment, check=True, capture_output=True, text=True).stdout.strip()
    if observed_node != 'v'+NODE_VERSION:
        raise RuntimeError('Unexpected host build runtime.')
    subprocess.run([npm, 'ci', '--workspaces=false', '--ignore-scripts', '--no-audit', '--no-fund', '--include=optional'], cwd=host, env=environment, check=True)
    installed_lock = json.loads(lock_path.read_text())['packages']
    for name, version in DEPENDENCIES.items():
        if installed_lock['node_modules/'+name]['version'] != version:
            raise RuntimeError('Host dependency version drift: '+name)
    subprocess.run([str(host/'node_modules/.bin/sanity'), 'build', 'dist', '--yes', '--no-auto-updates'], cwd=host, env=environment, check=True)
    output = host/'dist'
    if not (output/'index.html').is_file():
        raise RuntimeError('The second Studio did not produce an entry point.')
    shutil.copy2(host/'.htaccess', output/'.htaccess')
    html = (output/'index.html').read_text()
    if '</head>' not in html:
        raise RuntimeError('Generated Studio shell is missing its head element.')
    (output/'index.html').write_text(html.replace('</head>', '<meta name="robots" content="noindex, nofollow" /></head>', 1))
    installed_entry = host/'node_modules/@orbit/learning-studio/dist/index.js'
    status = {
        'state': 'BUILD_COMPLETE', 'environment': arguments.environment, 'kind': 'build-not-test',
        'finishedAt': datetime.now(timezone.utc).isoformat(), 'nodeVersion': NODE_VERSION,
        'fixedHostDependencies': DEPENDENCIES, 'projectId': 'pzscx4w8', 'dataset': 'production',
        'basePath': '/formation/studio', 'workspaceBasePath': '/', 'archiveSha256': archive_sha,
        'installedPluginEntrySha256': hashlib.sha256(installed_entry.read_bytes()).hexdigest(),
        'sourceLockSha256': hashlib.sha256(lock_source).hexdigest(),
        'installationLockSha256': hashlib.sha256(bound_lock).hexdigest(),
        'builtFiles': len([path for path in output.rglob('*') if path.is_file()]),
        'authenticatedRuntimeValidated': False, 'crossOriginContextValidated': False,
        'nativeWebMcpValidated': False, 'sanityWritesPerformed': False, 'sanityPermissionsChanged': False,
        'originalStudioModified': False, 'landingModified': False,
    }
    status_path.write_text(json.dumps(status, indent=2)+'\n')
    print(json.dumps(status))


if __name__ == '__main__':
    main()
