"""Provision Orbit's E2B infrastructure; never run benchmark models locally.

Credentials are read at runtime. Templates contain tools, not account secrets.
The ownership ledger is required for cleanup, which cannot kill other projects.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
CAMPAIGN = "orbit-kaggle-20260930-v1"
DIRECTORY = ROOT / ".orbit" / "cloud-lab" / CAMPAIGN
LEDGER = DIRECTORY / "resources.json"


def credentials(path: Path) -> str:
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        key, separator, value = line.partition("=")
        if separator and key.strip().removeprefix("export ") == "E2B_API_KEY":
            secret = value.strip().strip('"\'')
            if secret:
                return secret
    raise RuntimeError("E2B_API_KEY is missing; no credential value logged.")


def write_ledger(value: dict) -> None:
    DIRECTORY.mkdir(parents=True, exist_ok=True)
    temporary = LEDGER.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2), encoding="utf-8")
    temporary.replace(LEDGER)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["list", "templates", "control", "build", "browser", "collect", "cleanup"])
    parser.add_argument("--env", type=Path, default=Path(r"Z:\SecuredMe Education suite\.env"))
    args = parser.parse_args()
    from e2b import Sandbox, Template

    key = credentials(args.env)
    # Listing is a required precondition for all creations.
    active = Sandbox.list(limit=100, api_key=key).next_items()
    owned = [s for s in active if s.metadata.get("campaign") == CAMPAIGN and s.metadata.get("app") == "orbit"]
    print(json.dumps({"activeSandboxes": len(active), "ownedSandboxes": len(owned)}))
    ledger = json.loads(LEDGER.read_text()) if LEDGER.exists() else {
        "campaign": CAMPAIGN, "project": "Secured_Me", "templates": {}, "sandboxes": [],
        "modelExecution": "Kaggle only", "softwareTests": "Kaggle only",
    }
    if args.action == "list":
        return
    if args.action == "templates":
        control = (Template().from_python_image("3.12")
            .run_cmd("apt-get update && apt-get install -y --no-install-recommends curl ca-certificates xz-utils git unzip build-essential", user="root")
            .run_cmd("curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs", user="root")
            .run_cmd("pip install --no-cache-dir kaggle==2.2.4 e2b==2.51.0"))
        browser = (Template().from_python_image("3.12")
            .run_cmd("apt-get update && apt-get install -y --no-install-recommends curl ca-certificates xz-utils gnupg wget fonts-liberation", user="root")
            .run_cmd("curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs", user="root")
            .run_cmd("wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb && apt-get install -y /tmp/chrome.deb && rm /tmp/chrome.deb", user="root")
            .run_cmd("pip install --no-cache-dir fastapi uvicorn"))
        for role, template in [("control", control), ("browser", browser)]:
            if role in ledger["templates"]:
                continue
            alias = "orbit-kaggle-control" if role == "control" else "orbit-webmcp-browser"
            result = Template.build(template, alias=alias, cpu_count=4, memory_mb=4096, api_key=key)
            ledger["templates"][role] = {"alias": alias, "templateId": result.template_id,
                "buildId": result.build_id, "state": "built"}
            write_ledger(ledger)
            print(json.dumps({"role": role, "templateId": result.template_id, "state": "built"}))
        return
    if args.action == "control":
        if owned:
            print(json.dumps({"state": "reused", "sandboxId": owned[0].sandbox_id}))
            return
        if "control" not in ledger["templates"]:
            raise RuntimeError("Build the control template first.")
        head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
        sandbox = Sandbox.create(ledger["templates"]["control"]["templateId"], timeout=3600,
            metadata={"app": "orbit", "campaign": CAMPAIGN, "role": "control", "head": head},
            secure=True, api_key=key)
        ledger["sandboxes"].append({"id": sandbox.sandbox_id, "role": "control",
            "createdAt": datetime.now(timezone.utc).isoformat(), "state": "running",
            "killPlan": "Collect files, then cleanup; expires automatically after one hour."})
        write_ledger(ledger)
        # Environment inventory is infrastructure provisioning, not a software test.
        result = sandbox.commands.run("python --version && node --version && kaggle --version", timeout=60)
        (DIRECTORY / "control-runtime.txt").write_text(result.stdout + result.stderr, encoding="utf-8")
        print(json.dumps({"sandboxId": sandbox.sandbox_id, "state": "running", "runtimeExit": result.exit_code}))
        return
    if args.action == "build":
        import io, zipfile
        control = next((s for s in owned if s.metadata.get('role') == 'control'), None)
        if control is None:
            raise RuntimeError('Create the owned control sandbox first.')
        buffer = io.BytesIO()
        records = {}
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
            candidates = [ROOT/name for name in ['package.json','package-lock.json','tsconfig.base.json'] if (ROOT/name).exists()]
            for folder in ['web','studio','packages','services/broker']:
                candidates.extend((ROOT/folder).rglob('*'))
            for path in sorted(set(candidates)):
                if not path.is_file() or any(part in ['node_modules','dist','.astro','.sanity','.git','.venv'] for part in path.relative_to(ROOT).parts): continue
                if path.name.startswith('.env') or path.suffix in ['.db','.sqlite','.log']: continue
                name=path.relative_to(ROOT).as_posix(); data=path.read_bytes()
                archive.writestr(name,data); records[name]=hashlib.sha256(data).hexdigest()
            archive.writestr('orbit-source-manifest.json',json.dumps(records,indent=2))
        payload=buffer.getvalue()
        (DIRECTORY/'build-source.zip').write_bytes(payload)
        sandbox=Sandbox.connect(control.sandbox_id,api_key=key)
        sandbox.files.write('/home/user/orbit-source.zip',payload)
        unpack="import zipfile,pathlib;root=pathlib.Path('/home/user/orbit');root.mkdir(exist_ok=True);z=zipfile.ZipFile('/home/user/orbit-source.zip');assert all((root/n).resolve().is_relative_to(root.resolve()) for n in z.namelist());z.extractall(root)"
        import shlex
        # Windows-generated lock omits this optional Linux binding (npm #4828).
        # Install the exact parent-declared version only in the cloud checkout.
        # npm's workspace installer also trips edgesOut on an omitted optional
        # binding. Fetch its pinned tarball directly through the official CLI.
        natives = [('@bruits/satteri-linux-x64-gnu','0.10.5'),('@astrojs/compiler-binding-linux-x64-gnu','0.4.1'),('@rolldown/binding-linux-x64-gnu','1.2.9')]
        steps=[]
        for name, version in natives:
            archive_name=name.lstrip('@').replace('/','-')+'-'+version+'.tgz'
            steps.append(f'npm pack {name}@{version} --pack-destination /tmp && mkdir -p node_modules/{name} && tar -xzf /tmp/{archive_name} --strip-components=1 -C node_modules/{name}')
        command='python -c '+shlex.quote(unpack)+' && cd /home/user/orbit && npm ci --no-audit --no-fund && '+' && '.join(steps)+' && npm run build -w web && npm run build -w studio'
        # These are builds, not test runs. Software assertions execute in Kaggle.
        from e2b.sandbox.commands.command_handle import CommandExitException
        try:
            handle=sandbox.commands.run(command,cwd='/home/user',timeout=1800,
                on_stdout=lambda text: None, on_stderr=lambda text: None)
        except CommandExitException as error:
            handle = error
        (DIRECTORY/'cloud-build.log').write_text(handle.stdout+handle.stderr,encoding='utf-8')
        status={'host':'E2B','kind':'build-not-test','exitCode':handle.exit_code,'sourceSha256':hashlib.sha256(payload).hexdigest(),'files':len(records)}
        (DIRECTORY/'cloud-build-status.json').write_text(json.dumps(status,indent=2),encoding='utf-8')
        print(json.dumps(status)); return
    if args.action == "browser":
        import secrets
        control = next((s for s in owned if s.metadata.get('role') == 'control'), None)
        if control is None: raise RuntimeError('Control sandbox is required for the bridge build.')
        builder=Sandbox.connect(control.sandbox_id,api_key=key)
        builder.set_timeout(3600)
        print(json.dumps({'stage':'control-connected'}))
        builder.commands.run('mkdir -p /home/user/orbit/tools',timeout=30)
        for name in ['webmcp-browser.ts','e2b-webmcp-bridge.ts']:
            builder.files.write('/home/user/orbit/tools/'+name,(ROOT/'tools'/name).read_bytes())
        result=builder.commands.run('npx esbuild tools/e2b-webmcp-bridge.ts --bundle --platform=node --format=esm --outfile=/home/user/bridge.mjs',cwd='/home/user/orbit',timeout=60)
        print(json.dumps({'stage':'bridge-built'}))
        bundle=bytes(builder.files.read('/home/user/bridge.mjs',format='bytes'))
        existing=next((s for s in owned if s.metadata.get('role')=='browser'),None)
        if existing:
            worker=Sandbox.connect(existing.sandbox_id,api_key=key)
        else:
            worker=Sandbox.create(ledger['templates']['browser']['templateId'],timeout=3600,
                metadata={'app':'orbit','campaign':CAMPAIGN,'role':'browser'},secure=True,api_key=key)
            ledger['sandboxes'].append({'id':worker.sandbox_id,'role':'browser','state':'running','createdAt':datetime.now(timezone.utc).isoformat(),'killPlan':'Collect Kaggle transport result, then stop this campaign worker.'})
            write_ledger(ledger)
        print(json.dumps({'stage':'worker-connected'}))
        for process in worker.commands.list():
            if process.cmd == '/bin/bash' and process.args == ['-l','-c','node /home/user/bridge.mjs']:
                worker.commands.kill(process.pid)
        worker.files.write('/home/user/bridge.mjs',bundle)
        print(json.dumps({'stage':'worker-source-written'}))
        token=secrets.token_urlsafe(48)
        process=worker.commands.run('node /home/user/bridge.mjs',background=True,envs={'ORBIT_BRIDGE_TOKEN':token},timeout=3600)
        print(json.dumps({'stage':'worker-server-started'}))
        # Ephemeral bridge token is scoped to public Orbit tools, not E2B's API.
        # Keep this private and out of stdout, images, source and public exports.
        (DIRECTORY/'bridge-private.json').write_text(json.dumps({'url':'https://'+worker.get_host(8000),'token':token,'sandboxId':worker.sandbox_id}),encoding='utf-8')
        print(json.dumps({'state':'bridge-prepared-not-tested','sandboxId':worker.sandbox_id,'bundleSha256':hashlib.sha256(bundle).hexdigest()}))
        return
    if args.action == "cleanup":
        ids = {r["id"] for r in ledger["sandboxes"]}
        for sandbox in owned:
            if sandbox.sandbox_id not in ids:
                continue
            Sandbox.kill(sandbox.sandbox_id, api_key=key)
            for row in ledger["sandboxes"]:
                if row["id"] == sandbox.sandbox_id:
                    row["state"] = "stopped"
            write_ledger(ledger)
            print(json.dumps({"sandboxId": sandbox.sandbox_id, "state": "stopped"}))
        return
    if args.action == "collect":
        control = next((s for s in owned if s.metadata.get('role') == 'control'), None)
        if control is None: raise RuntimeError('Owned control sandbox is unavailable.')
        sandbox = Sandbox.connect(control.sandbox_id, api_key=key)
        result = sandbox.commands.run('tar -czf /home/user/orbit-built.tar.gz -C /home/user/orbit web/dist studio/dist',timeout=120)
        data = sandbox.files.read('/home/user/orbit-built.tar.gz',format='bytes')
        (DIRECTORY/'orbit-built.tar.gz').write_bytes(data)
        print(json.dumps({'state':'collected','host':'E2B','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}))
        return
    raise RuntimeError("Collection is not yet configured; no results have been represented as executed.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # HTTP/client exceptions can carry credentials. Do not print their repr.
        detail = "Operation failed; credentials and server response omitted."
        if type(error).__name__ == "BuildException":
            # Build errors describe our credential-free Docker steps only.
            import re
            detail = re.sub(r"(?:e2b_|sk_|Bearer\s+)[A-Za-z0-9_-]+", "[REDACTED]", str(error))[:1500]
        print(json.dumps({"state": "failed", "errorType": type(error).__name__, "message": detail}))
        raise SystemExit(1)
