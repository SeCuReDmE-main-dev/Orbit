"""Package a Kaggle/E2B-built static overlay; never build, test or deploy on Windows.

Existing account/API files, other routes and every .htaccess stay outside this
archive. The cPanel broker must apply it as an overlay with a retained backup.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import stat
import tarfile
import zipfile


ROOT = Path(__file__).resolve().parents[1]
RELEASE = "orbit-v3-closure-20261001T180900Z"
PRIVATE = ROOT / ".orbit"
DEFAULT_ARTIFACT = PRIVATE / "formation-20261001" / "formation-built.tar.gz"
DEFAULT_BASELINE = PRIVATE / "closure-20261001" / "initial-snapshot" / "landing.html"
DEFAULT_BASELINE_ASSETS = PRIVATE / "formation-20261001" / "orbit-learning-navigation.zip"
BASELINE_SHA256 = "90b58c335ef87fb0984cfb835ead09de91d845b25d312a321174a8cfd29ab3c6"
MAX_MEMBERS = 5000
MAX_FILE_BYTES = 32 * 1024 * 1024
MAX_TOTAL_BYTES = 128 * 1024 * 1024
MAX_ARCHIVE_BYTES = 100 * 1024 * 1024
PUBLIC_SUFFIXES = {
    ".html", ".js", ".css", ".json", ".map", ".txt", ".pdf", ".ipynb",
    ".zip", ".tgz", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico",
    ".webmanifest", ".ttf", ".woff", ".woff2", ".wasm",
}
SOURCE_SUFFIXES = {".md", ".ts", ".tsx", ".astro", ".mjs", ".py"}
FORBIDDEN_PARTS = {
    ".git", ".env", ".env.local", ".env.production", "node_modules",
    "credentials.json", "kaggle.json", "storage", "vendor", "instructor",
}
HASHED_ASSET = re.compile(rb"\.[A-Za-z0-9_-]{8}\.(js|css)")
ASSET_REFERENCE = re.compile(rb"(?:src|href)=[\"'](/_astro/[^\"']+)[\"']")
DEPENDENCY_REFERENCE = re.compile(rb"(?:from|import)\s*\(?\s*[\"'](\./[^\"']+\.(?:js|css))[\"']")
SECRET_MARKERS = {
    "private-key": re.compile(rb"-----BEGIN [A-Z ]*PRIVATE KEY-----[\r\n\\n ]+[A-Za-z0-9+/=]{32,}"),
    "provider-key": re.compile(rb"\b(?:sk-proj-|sk-ant-|e2b_)[A-Za-z0-9_-]{16,}"),
    "google-api-key": re.compile(rb"\bAIza[A-Za-z0-9_-]{35}\b"),
    "github-token": re.compile(rb"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{22,})"),
    "jwt": re.compile(rb"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b"),
    "credential-assignment": re.compile(
        rb"\b(?:SANITY_[A-Z_]*TOKEN|E2B_API_KEY|KAGGLE_(?:API_TOKEN|KEY)|"
        rb"CPANEL_[A-Z_]*(?:PASSWORD|TOKEN)|EMAIL_ORBIT_PASSWORD)\s*[:=]\s*[\"']?[A-Za-z0-9._/-]{12,}"
    ),
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def release_paths(release_id: str) -> tuple[Path, Path]:
    if not re.fullmatch(r"orbit-[a-z0-9][A-Za-z0-9-]{0,95}", release_id):
        raise ValueError("A bounded Orbit release identifier is required")
    receipt = (PRIVATE / "closure-20261001" / "closure-release-package.json" if release_id == RELEASE
               else PRIVATE / "releases" / release_id / "closure-release-package.json")
    return PRIVATE / "releases" / (release_id + ".zip"), receipt


def validate_plugin_build(plugin_bytes: bytes, report: dict, host_report: dict | None) -> str:
    if (report.get("package") != "@orbit/learning-studio" or report.get("bundled") is not True
            or report.get("sha256") != digest(plugin_bytes)
            or report.get("environmentDeclaredByOrchestrator") not in {"e2b", "kaggle"}):
        raise ValueError("Portable plugin differs from its cloud build report")
    with tarfile.open(fileobj=io.BytesIO(plugin_bytes), mode="r:gz") as archive:
        package_metadata = json.load(archive.extractfile("package/package.json"))
        entry_digest = digest(archive.extractfile("package/dist/index.js").read())
    environment = report["environmentDeclaredByOrchestrator"]
    if (package_metadata.get("name") != report["package"]
            or package_metadata.get("version") != report.get("version")
            or not isinstance(host_report, dict) or host_report.get("state") != "BUILD_COMPLETE"
            or host_report.get("environment") != environment
            or host_report.get("archiveSha256") != digest(plugin_bytes)
            or host_report.get("installedPluginEntrySha256") != entry_digest
            or (report.get("version") != "1.0.0" and (
                host_report.get("pluginVersion") != report.get("version")
                or host_report.get("pluginArchive") != report.get("archive")))):
        raise ValueError("Second Studio must install this exact cloud-built plugin archive")
    return environment


def safe_path(name: str, directory: bool = False) -> PurePosixPath:
    value = name[:-1] if directory and name.endswith("/") else name
    if not value or any(character in value for character in ("\\", "\x00", ":")):
        raise ValueError("Unsafe archive path")
    if any(ord(character) < 32 for character in value):
        raise ValueError("Control character in archive path")
    parts = value.split("/")
    if any(part in {"", ".", ".."} for part in parts) or PurePosixPath(value).is_absolute():
        raise ValueError("Unsafe archive path")
    return PurePosixPath(value)


def public_file(name: str, data: bytes, source_archive: bool = False) -> None:
    path = safe_path(name)
    suffixes = PUBLIC_SUFFIXES | SOURCE_SUFFIXES if source_archive else PUBLIC_SUFFIXES
    if path.suffix.lower() not in suffixes or any(
        part.lower() in FORBIDDEN_PARTS or part.startswith(".") for part in path.parts
    ):
        raise ValueError("Non-public file refused: " + name)
    if len(data) > MAX_FILE_BYTES:
        raise ValueError("Public file exceeds its byte bound: " + name)
    for label, pattern in SECRET_MARKERS.items():
        if pattern.search(data):
            # Report the rule and path, never the matched value.
            raise ValueError("Secret marker refused: " + label + " in " + name)
    if path.suffix.lower() == ".ipynb":
        notebook = json.loads(data)
        if notebook.get("nbformat") != 4 or not isinstance(notebook.get("cells"), list):
            raise ValueError("Malformed public notebook: " + name)
        if any(cell.get("outputs") or cell.get("execution_count") is not None
               for cell in notebook["cells"] if cell.get("cell_type") == "code"):
            raise ValueError("Executed/private notebook outputs refused: " + name)


def inspect_nested(name: str, data: bytes) -> None:
    """Inspect the actual plugin and assembly members without extracting them."""
    if name.endswith(".tgz"):
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
            seen, total = set(), 0
            for member in archive:
                total += member.size
                if len(seen) >= MAX_MEMBERS or member.size < 0 or total > MAX_TOTAL_BYTES:
                    raise ValueError("Nested plugin exceeds bounds")
                path = safe_path(member.name, member.isdir()).as_posix()
                if path in seen or (not member.isfile() and not member.isdir()):
                    raise ValueError("Duplicate, linked or special plugin member")
                seen.add(path)
                if member.isfile():
                    if member.size < 0 or member.size > MAX_FILE_BYTES:
                        raise ValueError("Nested plugin member exceeds bounds")
                    stream = archive.extractfile(member)
                    if stream is None:
                        raise ValueError("Plugin member is unreadable")
                    value = stream.read(member.size + 1)
                    if len(value) != member.size:
                        raise ValueError("Plugin member size differs")
                    public_file(path, value, source_archive=True)
    elif name.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            members = archive.infolist()
            if len(members) > MAX_MEMBERS or sum(item.file_size for item in members) > MAX_TOTAL_BYTES:
                raise ValueError("Nested assembly exceeds bounds")
            seen = set()
            for member in members:
                path = safe_path(member.filename, member.is_dir()).as_posix()
                mode = (member.external_attr >> 16) & 0o170000
                if path in seen or mode not in {0, stat.S_IFREG, stat.S_IFDIR} or member.flag_bits & 1:
                    raise ValueError("Duplicate, linked, special or encrypted assembly member")
                seen.add(path)
                if not member.is_dir():
                    if member.file_size > MAX_FILE_BYTES:
                        raise ValueError("Nested assembly member exceeds bounds")
                    public_file(path, archive.read(member), source_archive=True)


def destination(name: str) -> str | None:
    """Select only public pages/assets and map Studio's absolute /static URLs."""
    path = safe_path(name)
    if any(part.startswith(".") for part in path.parts):
        return None
    if name.startswith("web/dist/"):
        relative = path.relative_to("web/dist").as_posix()
        if relative.startswith("formation/plugins/") or relative == "formation/release.json":
            return None  # Use only the plugin produced by this same cloud build.
        if relative == "index.html" or relative.startswith(("app/", "guide/", "formation/", "_astro/", "brand/", "fonts/")):
            return relative
    if name == "studio/dist/index.html":
        return "studio/index.html"
    if name.startswith("studio/dist/static/"):
        return path.relative_to("studio/dist").as_posix()
    if name.startswith("tools/learning-studio-host/dist/"):
        return "formation/studio/" + path.relative_to("tools/learning-studio-host/dist").as_posix()
    return None


def normalized_asset_bytes(data: bytes) -> bytes:
    return HASHED_ASSET.sub(rb".ASSET_HASH.\1", data)


def asset_key(name: str) -> str:
    return normalized_asset_bytes(name.encode()).decode()


def verify_landing(entries: dict[str, bytes], baseline: bytes, asset_archive: Path) -> dict:
    current = entries["index.html"]
    if digest(baseline) != BASELINE_SHA256 or normalized_asset_bytes(baseline) != normalized_asset_bytes(current):
        raise ValueError("Landing markup differs beyond content-addressed asset references")
    if current.count(b"data-atom-link=") != 5 or b'href="/formation/lab/"' not in current:
        raise ValueError("The approved five-door landing is missing")
    examined, excluded = [], []
    with zipfile.ZipFile(asset_archive) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or len(names) > MAX_MEMBERS:
            raise ValueError("Ambiguous baseline asset archive")
        old_refs = ASSET_REFERENCE.findall(baseline)
        new_refs = ASSET_REFERENCE.findall(current)
        if len(old_refs) != len(new_refs):
            raise ValueError("Landing dependency references differ")
        # Astro can emit several index.<hash>.css or index.<hash>.js assets for
        # different pages. Resolve the exact references in the landing graph,
        # never an arbitrary global match after erasing the content hash.
        pending = [(old.decode().lstrip("/"), new.decode().lstrip("/"))
                   for old, new in zip(old_refs, new_refs)]
        visited = {}
        while pending:
            name, actual_name = pending.pop()
            safe_path(name)
            safe_path(actual_name)
            if asset_key(name) != asset_key(actual_name):
                raise ValueError("Landing dependency identity differs: " + name)
            if name in visited:
                if visited[name] != actual_name:
                    raise ValueError("Ambiguous landing dependency reference: " + name)
                continue
            visited[name] = actual_name
            if len(visited) > 100:
                raise ValueError("Landing dependency graph exceeds bounds")
            if actual_name not in entries or name not in names:
                raise ValueError("Landing dependency is absent: " + name)
            member = archive.getinfo(name)
            if member.file_size > MAX_FILE_BYTES:
                raise ValueError("Baseline landing dependency exceeds bounds")
            old, new = archive.read(name), entries[actual_name]
            if PurePosixPath(name).name.startswith("webmcp."):
                if b"orbit-webmcp-v7" not in new:
                    raise ValueError("Expected root WebMCP v7 metadata is absent")
                excluded.append({"before": name, "after": actual_name, "reason": "Authorized root WebMCP contract update"})
                continue
            if normalized_asset_bytes(old) != normalized_asset_bytes(new):
                raise ValueError("Landing visual/runtime dependency changed: " + name)
            examined.append({"before": name, "after": actual_name, "beforeSha256": digest(old), "afterSha256": digest(new)})
            old_imports = DEPENDENCY_REFERENCE.findall(old)
            new_imports = DEPENDENCY_REFERENCE.findall(new)
            if len(old_imports) != len(new_imports):
                raise ValueError("Landing dependency imports differ: " + name)
            old_parent = PurePosixPath(name).parent
            new_parent = PurePosixPath(actual_name).parent
            pending.extend(((old_parent / before.decode()[2:]).as_posix(),
                            (new_parent / after.decode()[2:]).as_posix())
                           for before, after in zip(old_imports, new_imports))
    if not excluded:
        raise ValueError("Landing root WebMCP update was not identified")
    return {"baselineIndexSha256": digest(baseline), "indexSha256": digest(current),
            "markupUnchangedExceptAssetHashes": True, "unchangedDependencies": examined,
            "authorizedMetadataDependencies": excluded, "visualOrPhysicsChangesAuthorized": False}


def zip_member(name: str, timestamp: tuple, directory: bool = False) -> zipfile.ZipInfo:
    member = zipfile.ZipInfo(name + ("/" if directory else ""), timestamp)
    member.create_system = 3
    member.compress_type = zipfile.ZIP_DEFLATED
    member.external_attr = ((stat.S_IFDIR | 0o755) if directory else (stat.S_IFREG | 0o644)) << 16
    if directory:
        member.external_attr |= 0x10
    return member


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact", type=Path, default=DEFAULT_ARTIFACT)
    parser.add_argument("--artifact-sha256", required=True)
    parser.add_argument("--landing-baseline", type=Path, default=DEFAULT_BASELINE)
    parser.add_argument("--landing-assets", type=Path, default=DEFAULT_BASELINE_ASSETS)
    parser.add_argument("--release-id", default=RELEASE)
    args = parser.parse_args()
    output, receipt = release_paths(args.release_id)
    if not re.fullmatch(r"[a-f0-9]{64}", args.artifact_sha256):
        raise ValueError("An exact lowercase cloud-artifact SHA-256 is required")
    for source in (args.artifact, args.landing_baseline, args.landing_assets):
        if source.is_symlink() or not source.resolve(strict=True).is_relative_to(PRIVATE.resolve()):
            raise ValueError("Inputs must be regular private workspace artifacts")
    if args.artifact.stat().st_size > MAX_ARCHIVE_BYTES:
        raise ValueError("Cloud artifact exceeds its compressed bound")
    artifact_bytes = args.artifact.read_bytes()
    if digest(artifact_bytes) != args.artifact_sha256:
        raise ValueError("Cloud artifact SHA-256 differs")
    entries, origin, plugin_data, plugin_report, host_report = {}, {}, None, None, None
    total, archive_total = 0, 0
    with tarfile.open(fileobj=io.BytesIO(artifact_bytes), mode="r:gz") as archive:
        seen = set()
        for member in archive:
            archive_total += member.size
            if len(seen) >= MAX_MEMBERS or member.size < 0 or archive_total > MAX_TOTAL_BYTES:
                raise ValueError("Cloud artifact exceeds uncompressed/member bounds")
            safe_name = safe_path(member.name, member.isdir()).as_posix()
            if safe_name in seen or (not member.isfile() and not member.isdir()):
                raise ValueError("Duplicate, linked or special cloud artifact member")
            seen.add(safe_name)
            if member.isdir():
                continue
            is_plugin = member.name.startswith("artifacts/learning-studio/") and member.name.endswith(".tgz")
            is_report = member.name == "artifacts/learning-studio/package-report.json"
            is_host_report = member.name == "tools/learning-studio-host/host-build-status.json"
            target = "formation/plugins/" + PurePosixPath(member.name).name if is_plugin else destination(member.name)
            if target is None and not is_report and not is_host_report:
                continue
            if member.size < 0 or member.size > MAX_FILE_BYTES:
                raise ValueError("Selected cloud member exceeds its bound")
            stream = archive.extractfile(member)
            if stream is None:
                raise ValueError("Selected cloud member is unreadable")
            data = stream.read(member.size + 1)
            if len(data) != member.size:
                raise ValueError("Selected cloud member size differs")
            if is_report:
                plugin_report = json.loads(data)
                continue
            if is_host_report:
                host_report = json.loads(data)
                continue
            if target in entries:
                raise ValueError("Duplicate public destination: " + target)
            public_file(target, data)
            inspect_nested(target, data)
            total += len(data)
            if total > MAX_TOTAL_BYTES:
                raise ValueError("Selected public payload exceeds its bound")
            entries[target], origin[target] = data, member.name
            if is_plugin:
                if plugin_data is not None:
                    raise ValueError("Exactly one cloud-built portable plugin is required")
                plugin_data = (target, data)
    if plugin_data is None or not isinstance(plugin_report, dict):
        raise ValueError("Cloud plugin and its build report are required")
    plugin_name, plugin_bytes = plugin_data
    if plugin_report.get("archive") != PurePosixPath(plugin_name).name:
        raise ValueError("Portable plugin differs from its cloud build report")
    environment = validate_plugin_build(plugin_bytes, plugin_report, host_report)
    required = {"index.html", "app/index.html", "guide/index.html", "studio/index.html",
                "formation/lab/index.html", "formation/projets/index.html", "formation/studio/index.html",
                "formation/assembly.zip", "brand/securedme-publication-lab-primary-dark.png", plugin_name}
    required.update("formation/notebooks/module-" + str(number) + ".ipynb" for number in range(1, 9))
    if not required.issubset(entries) or not any(name.startswith("static/") for name in entries):
        raise ValueError("Required public page, module, asset or Studio output is missing")
    # HTML/CSS declarations of these fixed public asset roots must resolve inside
    # this overlay. The second Studio deliberately shares Sanity's root icons.
    asset_refs = set()
    for name, data in entries.items():
        if name.endswith((".html", ".css")):
            asset_refs.update(match.decode().split("?", 1)[0].split("#", 1)[0].lstrip("/")
                              for match in re.findall(rb"[\"'(](/(?:_astro|static|fonts|brand|formation/studio/static)/[^\"')\s<>]+)", data))
    if any(name not in entries for name in asset_refs):
        raise ValueError("A declared public asset dependency is missing")
    landing = verify_landing(entries, args.landing_baseline.read_bytes(), args.landing_assets)
    now = datetime.now(timezone.utc)
    common = {"releaseId": args.release_id, "version": "3.0.0", "displayVersion": "V3", "generatedAt": now.isoformat(),
              "buildHost": "Kaggle" if environment == "kaggle" else "E2B", "buildArtifactSha256": args.artifact_sha256, "fullMissionComplete": False,
              "softwareValidation": {"state": "SEPARATE_KAGGLE_RECEIPTS_REQUIRED", "testsExecutedByPackager": False},
              "modelsCalledByPackager": False, "deploymentPerformed": False}
    plugin = {"package": "@orbit/learning-studio", "version": plugin_report.get("version"),
              "path": "/" + plugin_name, "sha256": digest(plugin_bytes), "builtInSameArtifact": True}
    hashes = {name: digest(data) for name, data in sorted(entries.items())}
    formation = {**common, "scope": "formation-only", "parentReleaseId": args.release_id,
                 "context": {"knowledgeBase": "kbbBvrClyweF", "backendIncluded": False,
                             "activation": "Separate audited PHP package after final Kaggle validation"},
                 "portablePlugin": plugin, "secondStudio": {"basePath": "/formation/studio", "projectId": "pzscx4w8",
                     "dataset": "production", "authenticatedRuntimeValidatedByPackager": False,
                     "sanityPermissionsChanged": False},
                 "files": {name: value for name, value in hashes.items() if name.startswith("formation/")},
                 "sharedAssets": {name: value for name, value in hashes.items() if name.startswith(("_astro/", "fonts/", "brand/", "static/"))},
                 "hashScope": "Public formation payload and shared assets; release manifests and SHA256SUMS.txt excluded."}
    entries["formation/release.json"] = (json.dumps(formation, indent=2, ensure_ascii=False) + "\n").encode()
    public = {**common, "scope": "closure-static-overlay", "applicationRelease": args.release_id,
              "atomMechanismVersion": "2.1.7", "landingVisualMarkupChanged": False,
              "rootWebMcpContract": "orbit-webmcp-v7", "formationWebMcpContract": "orbit-formation-webmcp-v1",
              "routes": ["/", "/app/", "/guide/", "/studio/", "/formation/lab/", "/formation/projets/", "/formation/studio/"],
              "portablePlugin": plugin, "backendBundled": False, "existingAccountRuntimePreserved": True,
              "files": {name: digest(data) for name, data in sorted(entries.items())},
              "hashScope": "Every payload file plus formation/release.json; orbit-release.json and SHA256SUMS.txt excluded."}
    entries["orbit-release.json"] = (json.dumps(public, indent=2, ensure_ascii=False) + "\n").encode()
    entries["SHA256SUMS.txt"] = ("\n".join(digest(data) + "  " + name for name, data in sorted(entries.items())) + "\n").encode()
    if len(entries) > MAX_MEMBERS or sum(map(len, entries.values())) > MAX_TOTAL_BYTES:
        raise ValueError("Final public package exceeds bounds")
    output.parent.mkdir(parents=True, exist_ok=True)
    receipt.parent.mkdir(parents=True, exist_ok=True)
    if output.exists() or receipt.exists():
        raise ValueError("Refuse to overwrite an existing closure package or receipt")
    timestamp = now.timetuple()[:6]
    directories = sorted({parent.as_posix() for name in entries for parent in PurePosixPath(name).parents if parent.as_posix() != "."})
    created = False
    try:
        with output.open("xb") as target:
            created = True
            with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
                for directory in directories:
                    archive.writestr(zip_member(directory, timestamp, True), b"")
                for name, data in sorted(entries.items()):
                    archive.writestr(zip_member(name, timestamp), data)
        if output.stat().st_size > MAX_ARCHIVE_BYTES:
            raise ValueError("Final static ZIP exceeds the cPanel broker's 100 MiB bound")
    except Exception:
        if created:
            output.unlink(missing_ok=True)
        raise
    report = {"state": "PACKAGED_NOT_DEPLOYED", "releaseId": args.release_id, "packagePath": str(output),
              "packageSha256": digest(output.read_bytes()), "cloudArtifactSha256": args.artifact_sha256,
              "files": len(entries), "directories": len(directories), "payloadBytes": sum(map(len, entries.values())),
              "permissions": {"files": "0644", "directories": "0755", "creator": "Unix", "timestampUTC": now.isoformat()},
              "landing": landing, "plugin": plugin, "expectedPaths": sorted(required | {"orbit-release.json", "formation/release.json", "SHA256SUMS.txt"}),
              "fileHashes": {name: digest(data) for name, data in sorted(entries.items())}, "sourceMembers": origin,
              "preservedByOmission": ["all .htaccess files", "api/**", "account runtime", "database", "storage", "other public routes"],
              "softwareTestsExecutedLocally": False, "modelCalls": 0, "deploymentPerformed": False,
              "fullMissionComplete": False, "separateCourseBackendRequired": True,
              "secretScan": "Bounded filename, raw marker and nested archive inspection; not a guarantee against every possible encoding."}
    with receipt.open("x", encoding="utf-8") as target:
        json.dump(report, target, indent=2, ensure_ascii=False)
        target.write("\n")
    print(json.dumps({key: report[key] for key in ("state", "releaseId", "packagePath", "packageSha256", "files", "directories", "fullMissionComplete")}))


if __name__ == "__main__":
    main()
