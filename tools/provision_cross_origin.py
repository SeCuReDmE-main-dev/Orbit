"""Provision one owned E2B worker. All browser assertions run from Kaggle."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import secrets
import shlex
import zipfile

from e2b import Sandbox

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / ".orbit" / "closure-20261001"
LEDGER = FOLDER / "cross-origin-resources.private.json"
SECRET_CONFIG = FOLDER / "cross-origin-kaggle-secret.private.json"
CAMPAIGN = "orbit-closure-cross-origin-20261001"
TEMPLATE = "4gcair8oo4fni43x2fit"
PACKAGE = ROOT / ".orbit" / "releases" / "orbit-v3-closure-20261001T180900Z.zip"
PACKAGE_SHA = "246bd711f6d24048a3c8e5a3387b074f4bdb9abba442b3424a715a69c13ca9e4"
SOURCE_SHA = "6cf947c677f5cbd91008a1ef3053aa9c98ec593385955ecf06a8465ab9928cf6"
RELEASE_SHA = "a537a94afe9c3215e6bd0db7a4767234a1a2f0daea3d6a74e8b620b49024b046"
RELEASE_ID = "orbit-v3-closure-20261001T180900Z"


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def credential(path: Path) -> str:
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        key, separator, value = line.partition("=")
        if separator and key.strip().removeprefix("export ") == "E2B_API_KEY":
            value = value.strip().strip("\"'")
            if value:
                return value
    raise RuntimeError("E2B_CREDENTIAL_UNAVAILABLE")


def save(value: dict) -> None:
    FOLDER.mkdir(parents=True, exist_ok=True)
    temporary = LEDGER.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    temporary.replace(LEDGER)


def main() -> None:
    global FOLDER, LEDGER, SECRET_CONFIG, CAMPAIGN, PACKAGE, PACKAGE_SHA, SOURCE_SHA, RELEASE_SHA, RELEASE_ID
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["list", "provision", "refresh", "collect", "cleanup"])
    parser.add_argument("--env", type=Path, default=Path(r"Z:\SecuredMe Education suite\.env"))
    parser.add_argument("--package", type=Path)
    parser.add_argument("--package-sha256")
    parser.add_argument("--release-id")
    parser.add_argument("--source-sha256")
    args = parser.parse_args()
    if any([args.package, args.package_sha256, args.release_id, args.source_sha256]):
        if (not all([args.package, args.package_sha256, args.release_id, args.source_sha256])
                or not all(re.fullmatch(r"[a-f0-9]{64}", value) for value in [args.package_sha256, args.source_sha256])
                or not re.fullmatch(r"orbit-v3-final-[A-Za-z0-9-]{1,76}", args.release_id)):
            raise RuntimeError("EXACT_FINAL_CROSS_ORIGIN_PINS_REQUIRED")
        PACKAGE = args.package.resolve()
        if not PACKAGE.is_relative_to((ROOT/".orbit/releases").resolve()) or not PACKAGE.is_file() or args.package.is_symlink():
            raise RuntimeError("EXACT_PUBLIC_RELEASE_ARCHIVE_REQUIRED")
        PACKAGE_SHA, SOURCE_SHA, RELEASE_ID = args.package_sha256, args.source_sha256, args.release_id
        if sha(PACKAGE.read_bytes()) != PACKAGE_SHA or sha((ROOT/"tools/learning-studio-cross-origin-validation.ts").read_bytes()) != SOURCE_SHA:
            raise RuntimeError("PINNED_INPUT_CHANGED")
        with zipfile.ZipFile(PACKAGE) as archive:
            raw = archive.read("formation/release.json")
        release = json.loads(raw)
        if release.get("releaseId") != RELEASE_ID or release.get("portablePlugin", {}).get("version") != "1.0.1":
            raise RuntimeError("CURRENT_1_0_1_FORMATION_PACKAGE_REQUIRED")
        RELEASE_SHA = sha(raw)
        CAMPAIGN = "orbit-closure-cross-origin-20261003"
        FOLDER = ROOT/".orbit/closure-20261003/cross-origin"/RELEASE_ID
        LEDGER, SECRET_CONFIG = FOLDER/"cross-origin-resources.private.json", FOLDER/"cross-origin-kaggle-secret.private.json"
    key = credential(args.env)
    # Required precondition: inspect existing account resources before creating.
    active = Sandbox.list(limit=100, api_key=key).next_items()
    owned = [s for s in active if s.metadata.get("campaign") == CAMPAIGN and s.metadata.get("app") == "orbit"]
    print(json.dumps({"stage": "resource-inventory", "active": len(active), "owned": len(owned)}), flush=True)
    if args.action == "list":
        return
    ledger = json.loads(LEDGER.read_text()) if LEDGER.exists() else {
        "campaign": CAMPAIGN, "app": "orbit", "template": TEMPLATE,
        "createdAt": timestamp(), "resources": [], "KaggleOnlyTests": True,
        "killPlan": "After collecting the Kaggle result and retiring its bridge token, stop only the owned worker; one-hour automatic expiry is the fallback.",
    }
    if ledger.get("campaign") != CAMPAIGN or len(owned) > 1:
        raise RuntimeError("OWNERSHIP_BOUNDARY")
    if args.action == "cleanup":
        ids = {row["id"] for row in ledger["resources"]}
        for info in owned:
            if info.sandbox_id not in ids:
                raise RuntimeError("UNREGISTERED_OWNED_RESOURCE")
            Sandbox.kill(info.sandbox_id, api_key=key)
            for row in ledger["resources"]:
                if row["id"] == info.sandbox_id:
                    row.update({"state": "stopped", "stoppedAt": timestamp()})
            save(ledger)
        print(json.dumps({"state": "OWNED_WORKER_STOPPED", "count": len(owned)}))
        return
    if args.action == "collect":
        if len(owned) != 1 or owned[0].sandbox_id not in {row["id"] for row in ledger["resources"]}:
            raise RuntimeError("OWNED_RESOURCE_UNAVAILABLE")
        worker = Sandbox.connect(owned[0].sandbox_id, api_key=key)
        # Collection reads existing result files; it starts no browser campaign.
        listing = worker.files.list("/home/user/learning-studio-cross-origin-results")
        runs = [item for item in listing if item.name.startswith("cross-origin-")]
        outputs = []
        for item in runs:
            raw = bytes(worker.files.read(item.path + "/status.json", format="bytes"))
            target = FOLDER / (item.name + "-worker-status.json")
            target.write_bytes(raw)
            outputs.append({"path": str(target), "sha256": sha(raw)})
        print(json.dumps({"state": "COLLECTED", "results": outputs}))
        return
    if owned and args.action != "refresh":
        row = next((r for r in ledger["resources"] if r["id"] == owned[0].sandbox_id), None)
        if row and row.get("state") == "prepared":
            print(json.dumps({"state": "REUSED_PREPARED", "sandboxId": row["id"]}))
            return
        raise RuntimeError("OWNED_WORKER_ALREADY_EXISTS_NOT_READY")
    package = PACKAGE.read_bytes()
    source = (ROOT / "tools" / "learning-studio-cross-origin-validation.ts").read_bytes()
    if sha(package) != PACKAGE_SHA or sha(source) != SOURCE_SHA:
        raise RuntimeError("PINNED_INPUT_CHANGED")
    if args.action == "refresh":
        if len(owned) != 1:
            raise RuntimeError("EXISTING_OWNED_WORKER_REQUIRED")
        row = next((r for r in ledger["resources"] if r["id"] == owned[0].sandbox_id), None)
        if not row:
            raise RuntimeError("UNREGISTERED_OWNED_RESOURCE")
        worker = Sandbox.connect(row["id"], api_key=key)
        row.setdefault("controllerHistory", []).append({key: row.get(key) for key in
            ("sourceSha256", "bundleSha256", "preparedAt", "checkerPid")})
        for process in worker.commands.list():
            if process.pid == row.get("checkerPid"):
                worker.commands.kill(process.pid)
        row.update({"state": "refreshing", "sourceSha256": SOURCE_SHA})
    else:
        worker = Sandbox.create(TEMPLATE, timeout=7200, secure=True, api_key=key,
            metadata={"app": "orbit", "campaign": CAMPAIGN, "role": "cross-origin-public-browser",
                      "release": RELEASE_ID, "sourceSha256": SOURCE_SHA})
        row = {"id": worker.sandbox_id, "state": "created", "createdAt": timestamp(),
               "secure": True, "timeoutSeconds": 7200, "packageSha256": PACKAGE_SHA, "sourceSha256": SOURCE_SHA}
        ledger["resources"].append(row)
    save(ledger)
    print(json.dumps({"stage": "created", "sandboxId": worker.sandbox_id}), flush=True)
    try:
        worker.commands.run("mkdir -p /home/user/orbit-cross-origin/tools /home/user/orbit-public", timeout=30, user="user")
        worker.files.write("/home/user/orbit-cross-origin/tools/learning-studio-cross-origin-validation.ts", source)
        worker.files.write("/home/user/orbit-cross-origin/tools/webmcp-browser.ts", (ROOT / "tools" / "webmcp-browser.ts").read_bytes())
        worker.files.write("/home/user/orbit-cross-origin/package.json", '{"private":true,"type":"module"}\n')
        worker.files.write("/home/user/orbit-closure-public.zip", package)
        unpack = """import hashlib,pathlib,zipfile,os
p=pathlib.Path('/home/user/orbit-closure-public.zip')
if hashlib.sha256(p.read_bytes()).hexdigest()!='""" + PACKAGE_SHA + """': raise RuntimeError('PACKAGE_HASH')
r=pathlib.Path('/home/user/orbit-public').resolve()
with zipfile.ZipFile(p) as z:
 for m in z.infolist():
  f=(r/m.filename).resolve()
  if not f.is_relative_to(r): raise RuntimeError('PATH_BOUNDARY')
 z.extractall(r)
for f in r.rglob('*'): os.chmod(f,0o755 if f.is_dir() else 0o644)
"""
        worker.commands.run("python -c " + shlex.quote(unpack), timeout=60, user="user")
        print(json.dumps({"stage": "public-package-staged"}), flush=True)
        result = worker.commands.run("npm install --no-audit --no-fund --ignore-scripts --save-exact esbuild@0.28.2 && npx esbuild tools/learning-studio-cross-origin-validation.ts --bundle --platform=node --format=esm --outfile=/home/user/learning-cross-origin-check.mjs",
            cwd="/home/user/orbit-cross-origin", timeout=180, user="user")
        (FOLDER / "cross-origin-cloud-build.log").write_text(result.stdout + result.stderr, encoding="utf-8")
        bundle = bytes(worker.files.read("/home/user/learning-cross-origin-check.mjs", format="bytes"))
        mission_token = secrets.token_urlsafe(48)
        foreign = "https://" + worker.get_host(8000)
        bridge = "https://" + worker.get_host(8021)
        static_pid = row.get("staticPid")
        if not any(process.pid == static_pid for process in worker.commands.list()):
            static = worker.commands.run("python -m http.server 8000 --bind 0.0.0.0 --directory /home/user/orbit-public", background=True, timeout=3600, user="user")
            static_pid = static.pid
        check = worker.commands.run("node /home/user/learning-cross-origin-check.mjs", background=True, timeout=3600, user="user",
            envs={"ORBIT_VALIDATION_HOST": "E2B", "ORBIT_FOREIGN_ORIGIN": foreign,
                  "ORBIT_FORMATION_RELEASE_SHA256": RELEASE_SHA, "ORBIT_CROSS_ORIGIN_CHECK_TOKEN": mission_token,
                  "ORBIT_CROSS_ORIGIN_CHECK_PORT": "8021"})
        config = {"bridgeOrigin": bridge, "foreignOrigin": foreign, "token": mission_token,
                  "sourceSha256": SOURCE_SHA, "bundleSha256": sha(bundle), "releaseSha256": RELEASE_SHA}
        SECRET_CONFIG.write_text(json.dumps(config), encoding="utf-8")
        row.update({"state": "prepared", "preparedAt": timestamp(), "foreignOrigin": foreign, "bridgeOrigin": bridge,
                    "bundleSha256": sha(bundle), "releaseSha256": RELEASE_SHA,
                    "staticPid": static_pid, "checkerPid": check.pid, "browserTestsStarted": False,
                    "modelCalls": 0, "secretConfigPath": str(SECRET_CONFIG)})
        save(ledger)
        print(json.dumps({"state": "PREPARED_NOT_TESTED", "sandboxId": worker.sandbox_id,
                          "bundleSha256": sha(bundle), "releaseSha256": RELEASE_SHA}), flush=True)
    except Exception as error:
        row.update({"state": "provisioning-failed", "failureType": type(error).__name__})
        save(ledger)
        # No upstream error bodies or credential-bearing values enter output.
        raise RuntimeError("CROSS_ORIGIN_PROVISIONING_FAILED") from None


if __name__ == "__main__":
    main()
