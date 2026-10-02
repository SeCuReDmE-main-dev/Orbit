"""Prepare one official, password-protected E2B Desktop for native human login.

This is resource preparation, not a browser test or publication. Run with the
isolated orchestration runtime; do not change the project's normal E2B SDK.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import secrets
import shlex

from e2b_desktop import Sandbox
from e2b_desktop.main import _VNCServer

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".orbit" / "closure-20261001"
LEDGER = OUT / "studio-desktop-resources.private.json"
ACCESS = OUT / "studio-desktop-access.private.json"
CAMPAIGN = "orbit-closure-studio-auth-20261001"
PACKAGE = ROOT / ".orbit" / "releases" / "orbit-v3-closure-20261001T180900Z.zip"
PACKAGE_SHA = "246bd711f6d24048a3c8e5a3387b074f4bdb9abba442b3424a715a69c13ca9e4"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def key_from(path: Path) -> str:
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        key, sep, value = line.partition("=")
        if sep and key.strip().removeprefix("export ") == "E2B_API_KEY":
            value = value.strip().strip("\"'")
            if value:
                return value
    raise RuntimeError("E2B_CREDENTIAL_UNAVAILABLE")


def save(value: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    temp = LEDGER.with_suffix(".tmp")
    temp.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    temp.replace(LEDGER)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["list", "prepare", "controller", "cleanup"])
    parser.add_argument("--env", type=Path, default=Path(r"Z:\SecuredMe Education suite\.env"))
    args = parser.parse_args()
    key = key_from(args.env)
    active = Sandbox.list(limit=100, api_key=key).next_items()
    owned = [item for item in active if item.metadata.get("campaign") == CAMPAIGN and item.metadata.get("app") == "orbit"]
    print(json.dumps({"stage": "inventory", "active": len(active), "owned": len(owned)}), flush=True)
    if args.action == "list":
        return
    ledger = json.loads(LEDGER.read_text()) if LEDGER.exists() else {
        "campaign": CAMPAIGN, "app": "orbit", "createdAt": now(), "resources": [],
        "purpose": "Human native Sanity login before Kaggle-dispatched synthetic publication checks.",
        "killPlan": "Retire the mission bridge, stop the authenticated stream and kill only this campaign's recorded Desktop after result collection; hard two-hour expiry.",
        "noWindowsSessionExport": True, "modelCalls": 0,
    }
    if ledger.get("campaign") != CAMPAIGN or len(owned) > 1:
        raise RuntimeError("OWNERSHIP_BOUNDARY")
    recorded = {item["id"] for item in ledger["resources"]}
    if args.action == "controller":
        if len(owned) != 1 or owned[0].sandbox_id not in recorded:
            raise RuntimeError("OWNED_DESKTOP_REQUIRED")
        row = next(item for item in ledger["resources"] if item["id"] == owned[0].sandbox_id)
        worker = Sandbox.connect(row["id"], api_key=key)
        if row.get("controllerPid"):
            if any(item.pid == row["controllerPid"] for item in worker.commands.list()):
                raise RuntimeError("EXISTING_CONTROLLER_MUST_BE_RETIRED")
            previous_state = "RETIRED_WITH_OBSERVED_401" if row.get("controllerRetirement", {}).get("pid") == row["controllerPid"] else "PROCESS_EXITED_BEFORE_READY"
            row.setdefault("controllerConstructionIncidents", []).append({"pid": row["controllerPid"], "sourceSha256": row.get("controllerSourceSha256"), "bundleSha256": row.get("controllerBundleSha256"), "state": previous_state})
        source = (ROOT / "tools" / "learning-studio-authenticated-validation.ts").read_bytes()
        worker.commands.run("mkdir -p /home/user/orbit-studio-controller", timeout=20, user="user")
        node_directory = "/home/user/orbit-node/node-v22.20.0-linux-x64/bin"
        node_prepare = """import pathlib,hashlib,urllib.request,tarfile,io,os
r=pathlib.Path('/home/user/orbit-node');r.mkdir(exist_ok=True)
if not all((r/('node-v22.20.0-linux-x64/bin/'+n)).is_file() for n in ['node','npm','npx']):
 b=urllib.request.urlopen('https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.xz',timeout=60).read(64*1024*1024+1)
 if len(b)>64*1024*1024 or hashlib.sha256(b).hexdigest()!='00bbd05e306ea68b6e13e17360d0e2f680b493ef95f2fea1c4296ff7437530bc': raise RuntimeError('NODE_ARCHIVE_PIN')
 with tarfile.open(fileobj=io.BytesIO(b),mode='r:xz') as t:
  members=t.getmembers()
  for m in members:
   p=r/m.name
   if pathlib.PurePosixPath(m.name).is_absolute() or '..' in pathlib.PurePosixPath(m.name).parts or not p.resolve().is_relative_to(r.resolve()): raise RuntimeError('NODE_PATH_BOUNDARY')
   if not (m.isdir() or m.isfile() or m.issym()): raise RuntimeError('NODE_MEMBER_TYPE')
   if m.issym() and (pathlib.PurePosixPath(m.linkname).is_absolute() or not (p.parent/m.linkname).resolve().is_relative_to(r.resolve())): raise RuntimeError('NODE_LINK_BOUNDARY')
  for m in members:
   p=r/m.name
   if m.isdir(): p.mkdir(parents=True,exist_ok=True)
   elif m.isfile():
    p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(t.extractfile(m).read());os.chmod(p,m.mode&0o777)
  for m in members:
   if m.issym():
    p=r/m.name
    if not p.is_symlink(): p.symlink_to(m.linkname)
"""
        worker.commands.run("python3 -c " + shlex.quote(node_prepare), timeout=120, user="user")
        worker.files.write("/home/user/orbit-studio-controller/check.ts", source)
        worker.files.write("/home/user/orbit-studio-controller/package.json", '{"private":true,"type":"module"}\n')
        result = worker.commands.run("npm install --no-audit --no-fund --ignore-scripts --save-exact esbuild@0.28.2 && npx esbuild check.ts --bundle --platform=node --format=esm --outfile=check.mjs",
            cwd="/home/user/orbit-studio-controller", timeout=180, user="user", envs={"PATH": node_directory + ":/usr/local/bin:/usr/bin:/bin"})
        (OUT / "studio-desktop-controller-build.log").write_text(result.stdout + result.stderr, encoding="utf-8")
        bundle = bytes(worker.files.read("/home/user/orbit-studio-controller/check.mjs", format="bytes"))
        stop = """import pathlib,os,signal,time
profile='--user-data-dir=/home/user/orbit-studio-native-profile'
for p in pathlib.Path('/proc').iterdir():
 if not p.name.isdigit(): continue
 try:
  a=(p/'cmdline').read_bytes().split(b'\\0');args=[x.decode() for x in a if x]
  if args and pathlib.Path(args[0]).name in ['chrome','google-chrome'] and profile in args and not any(x.startswith('--type=') for x in args): os.kill(int(p.name),signal.SIGTERM)
 except (FileNotFoundError,ProcessLookupError,PermissionError,UnicodeDecodeError): pass
time.sleep(2)
"""
        worker.commands.run("python3 -c " + shlex.quote(stop), timeout=20, user="user")
        token = secrets.token_urlsafe(48)
        control = worker.commands.run(node_directory + "/node /home/user/orbit-studio-controller/check.mjs", background=True, timeout=5400, user="user",
            envs={"DISPLAY": ":0", "ORBIT_VALIDATION_HOST": "E2B", "ORBIT_STUDIO_CHECK_TOKEN": token,
                "ORBIT_STUDIO_ORIGIN": row["foreignOrigin"]})
        config = {"bridgeOrigin": "https://" + worker.get_host(8022), "token": token,
            "studioOrigin": row["foreignOrigin"], "sourceSha256": hashlib.sha256(source).hexdigest(),
            "bundleSha256": hashlib.sha256(bundle).hexdigest(), "profileCopied": False,
            "controller": "Native Chrome OS pipe; exact endpoint allowlist only."}
        secret_path = OUT / "studio-desktop-kaggle-secret.private.json"
        secret_path.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
        row.update({"controllerPid": control.pid, "controllerPreparedAt": now(), "controllerSourceSha256": config["sourceSha256"],
            "controllerBundleSha256": config["bundleSha256"], "controllerSecretConfig": str(secret_path), "remoteDebuggingTcpExposed": False})
        save(ledger)
        print(json.dumps({"state": "PIPE_CONTROLLER_CONSTRUCTED_NOT_TESTED", "sandboxId": row["id"],
            "sourceSha256": config["sourceSha256"], "bundleSha256": config["bundleSha256"], "controllerPid": control.pid}), flush=True)
        return
    if args.action == "cleanup":
        for info in owned:
            if info.sandbox_id not in recorded:
                raise RuntimeError("UNREGISTERED_OWNED_RESOURCE")
            worker = Sandbox.connect(info.sandbox_id, api_key=key)
            # The inherited connect does not reconstruct Desktop's stream
            # wrapper. Reattach the official wrapper to the owned VM before
            # stopping its VNC server; killing the VM closes noVNC as well.
            worker._display = ":0"
            worker._Sandbox__vnc_server = _VNCServer(worker)
            try:
                worker.stream.stop()
            finally:
                worker.kill()
            for row in ledger["resources"]:
                if row["id"] == info.sandbox_id:
                    row.update({"state": "stopped", "stoppedAt": now()})
            save(ledger)
        print(json.dumps({"state": "OWNED_DESKTOP_STOPPED", "count": len(owned)}))
        return
    existing = None
    if owned:
        if owned[0].sandbox_id not in recorded:
            raise RuntimeError("UNREGISTERED_OWNED_RESOURCE")
        existing = next(item for item in ledger["resources"] if item["id"] == owned[0].sandbox_id)
        if existing["state"] != "provisioning-failed":
            print(json.dumps({"state": "EXISTING_DESKTOP_RETAINED", "sandboxId": owned[0].sandbox_id}))
            return
    package = PACKAGE.read_bytes()
    if hashlib.sha256(package).hexdigest() != PACKAGE_SHA:
        raise RuntimeError("PINNED_PACKAGE_CHANGED")
    # The official Desktop SDK starts its own Xvfb and desktop window manager.
    # No remote tunnel, exported profile, general remote CDP port or login token.
    if existing:
        worker = Sandbox.connect(existing["id"], api_key=key)
        # Desktop SDK 2.6 initializes this display on create, but its inherited
        # connect does not reconstruct it. Reuse the exact original :0 display.
        worker._display = ":0"
        row = existing
        row.setdefault("provisioningIncidents", []).append({"failureType": row.get("failureType"), "failedAt": row.get("failedAt"), "reason": "Provisioning resumed with python3 and reconstruction of the pinned SDK's own stream object after reconnect."})
        worker._Sandbox__vnc_server = _VNCServer(worker)
        row["state"] = "resuming-preparation"
    else:
        worker = Sandbox.create(timeout=7200, resolution=(1366, 768), api_key=key, allow_internet_access=True,
            metadata={"app": "orbit", "campaign": CAMPAIGN, "role": "native-human-studio-login", "release": "orbit-v3-closure-20261001T180900Z"})
        row = {"id": worker.sandbox_id, "state": "created", "createdAt": now(),
        "officialTemplate": "desktop", "timeoutSeconds": 7200, "packageSha256": PACKAGE_SHA,
        "sdk": "e2b-desktop@2.6.0", "baseSdk": "e2b@2.44.0", "browserTestsExecuted": False,
        "contentLakeWritesExecuted": False}
        ledger["resources"].append(row)
    save(ledger)
    print(json.dumps({"stage": "desktop-created", "sandboxId": worker.sandbox_id}), flush=True)
    try:
        identity = worker.commands.run("id -un", timeout=20, user="user").stdout.strip()
        if identity != "user":
            raise RuntimeError("UNPRIVILEGED_BROWSER_USER_REQUIRED")
        worker.files.write("/home/user/orbit-closure-public.zip", package)
        unpack = """import hashlib,pathlib,zipfile,os
p=pathlib.Path('/home/user/orbit-closure-public.zip')
if hashlib.sha256(p.read_bytes()).hexdigest()!='""" + PACKAGE_SHA + """': raise RuntimeError('PACKAGE_HASH')
r=pathlib.Path('/home/user/orbit-public').resolve();r.mkdir(exist_ok=True)
with zipfile.ZipFile(p) as z:
 for m in z.infolist():
  f=(r/m.filename).resolve()
  if not f.is_relative_to(r): raise RuntimeError('PATH_BOUNDARY')
 z.extractall(r)
for f in r.rglob('*'): os.chmod(f,0o755 if f.is_dir() else 0o644)
"""
        worker.commands.run("python3 -c " + shlex.quote(unpack), timeout=60, user="user")
        server_source = """from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
ROOT=Path('/home/user/orbit-public').resolve()
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT),**kwargs)
 def do_GET(self):
  target=Path(self.translate_path(self.path)).resolve()
  if not target.is_relative_to(ROOT): self.send_error(403);return
  if self.path.split('?')[0].startswith('/formation/studio/') and not target.exists() and not target.suffix:
   self.path='/formation/studio/index.html'
  super().do_GET()
 def log_message(self,*args): pass
ThreadingHTTPServer(('0.0.0.0',8000),Handler).serve_forever()
"""
        worker.files.write("/home/user/orbit-static-host.py", server_source)
        for process in worker.commands.list():
            if process.cmd == "python3 /home/user/orbit-static-host.py":
                worker.commands.kill(process.pid)
        static = worker.commands.run("python3 /home/user/orbit-static-host.py", background=True, timeout=7200, user="user")
        host = "https://" + worker.get_host(8000)
        profile = "/home/user/orbit-studio-native-profile"
        version = worker.commands.run("google-chrome --version", timeout=20, user="user").stdout.strip()
        # Headed Chrome has no debugging TCP listener. Kaggle can later launch
        # a bounded pipe controller using this native profile within this VM.
        browser = worker.commands.run("google-chrome --user-data-dir=" + shlex.quote(profile) +
            " --enable-blink-features=WebMCPTesting --no-first-run --no-default-browser-check --disable-sync " +
            shlex.quote(host + "/formation/studio/"), background=True, timeout=7200, user="user", envs={"DISPLAY": ":0"})
        worker.stream.start(require_auth=True)
        stream_url = worker.stream.get_url(auth_key=worker.stream.get_auth_key())
        ACCESS.write_text(json.dumps({"sandboxId": worker.sandbox_id, "streamUrl": stream_url,
            "studioUrl": host + "/formation/studio/", "profile": profile,
            "state": "HUMAN_NATIVE_LOGIN_REQUIRED", "passwordAndMfaRemainHuman": True,
            "streamPasswordIsNotSanityCredential": True}, indent=2) + "\n", encoding="utf-8")
        row.update({"state": "prepared-for-human-login", "preparedAt": now(), "foreignOrigin": host,
            "staticPid": static.pid, "browserPid": browser.pid, "chromeVersion": version,
            "nativeProfile": profile, "streamAuthenticationRequired": True,
            "remoteDebuggingTcpExposed": False, "accessArtifact": str(ACCESS)})
        save(ledger)
        print(json.dumps({"state": "HUMAN_LOGIN_TRANSPORT_PREPARED_NOT_TESTED", "sandboxId": worker.sandbox_id,
            "foreignOrigin": host, "chromeVersion": version, "streamAuthenticationRequired": True,
            "accessArtifact": str(ACCESS)}), flush=True)
    except Exception as error:
        row.update({"state": "provisioning-failed", "failureType": type(error).__name__, "failedAt": now()})
        save(ledger)
        raise RuntimeError("STUDIO_DESKTOP_PROVISIONING_FAILED") from None


if __name__ == "__main__":
    main()
