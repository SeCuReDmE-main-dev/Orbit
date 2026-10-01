"""Package only the eight public course transport files; preserve runtime account data."""
from __future__ import annotations

import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVICE = ROOT / "services" / "account-api"
OUTPUT = ROOT / ".orbit" / "course-context-validation"
FILES = (
    "bootstrap/app.php",
    "routes/api.php",
    "config/cors.php",
    "config/orbit.php",
    "config/course_context.php",
    "app/Http/Middleware/PublicCourseContext.php",
    "app/Http/Controllers/CourseContextController.php",
    "app/Services/PublicCourseContextReader.php",
)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    archive = OUTPUT / "backend-incremental.zip"
    records = []
    payload = {}
    for relative in FILES:
        data = (SERVICE / relative).read_bytes()
        if re.search(rb"-----BEGIN .*PRIVATE KEY-----|\b(?:e2b_|sk-proj-)[A-Za-z0-9_-]{16,}", data):
            raise RuntimeError("SECRET_MARKER_REJECTED")
        if not data.startswith(b"<?php"):
            raise RuntimeError("NON_PHP_PAYLOAD_REJECTED")
        payload[relative] = data
        records.append({"path": relative, "bytes": len(data), "sha256": digest(data)})
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
        for relative in FILES:
            member = zipfile.ZipInfo(relative, date_time=(2026, 10, 1, 0, 0, 0))
            member.external_attr = 0o644 << 16
            member.compress_type = zipfile.ZIP_DEFLATED
            output.writestr(member, payload[relative])
    scope = payload["config/course_context.php"].decode("utf-8")
    receipt = {
        "version": "orbit-course-context-incremental-backend-v1",
        "archive": "backend-incremental.zip",
        "sha256": digest(archive.read_bytes()),
        "files": records,
        "fileCount": len(records),
        "scopeEnabledInPackage": bool(re.search(r"'enabled'\s*=>\s*true", scope)),
        "excluded": [".env", "vendor", "database", "storage", "bootstrap/cache", "public landing"],
        "deploymentPerformed": False,
        "testsExecutedLocally": False,
        "softwareEvidence": "docs/receipts/formation/php-context-29-pass-kaggle.json",
        "deploymentPrerecondition": "Audited course manifest, remote backup and governed incremental overlay; preserve existing runtime data.",
    }
    (OUTPUT / "backend-incremental-manifest.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"packagedFiles": len(records), "sha256": receipt["sha256"], "scopeEnabledInPackage": receipt["scopeEnabledInPackage"], "deploymentPerformed": False}))


if __name__ == "__main__":
    main()
