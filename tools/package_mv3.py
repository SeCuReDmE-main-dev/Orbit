"""Create the deterministic Orbit Companion MV3 ZIP and checksum."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import zipfile


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "web" / "dist").resolve()
ARTIFACTS = (ROOT / "artifacts").resolve()
TARGET = ARTIFACTS / "orbit-companion-mv3-unpacked-build.zip"
CHECKSUMS = ARTIFACTS / "SHA256SUMS.txt"


def _inside(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
    except ValueError:
        return False
    return True


def main() -> int:
    if not SOURCE.is_dir() or not _inside(SOURCE, ROOT):
        raise SystemExit("web/dist is missing or outside the repository")
    if not _inside(ARTIFACTS, ROOT):
        raise SystemExit("artifacts directory is outside the repository")
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    entries = sorted(
        (path.relative_to(SOURCE).as_posix(), path)
        for path in SOURCE.rglob("*")
        if path.is_file()
    )
    if not entries:
        raise SystemExit("web/dist contains no files")

    temporary = ARTIFACTS / ".orbit-companion-mv3.tmp.zip"
    with zipfile.ZipFile(
        temporary,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        for relative, path in entries:
            if relative.startswith("/") or ".." in Path(relative).parts:
                raise SystemExit(f"unsafe archive path: {relative}")
            info = zipfile.ZipInfo(relative, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)

    with zipfile.ZipFile(temporary, mode="r") as archive:
        names = archive.namelist()
        if names != sorted(names) or len(names) != len(entries):
            raise SystemExit("archive entry verification failed")
        if "manifest.json" not in names:
            raise SystemExit("archive is missing manifest.json")
        bad = archive.testzip()
        if bad is not None:
            raise SystemExit(f"archive CRC failed for {bad}")

    os.replace(temporary, TARGET)
    digest = hashlib.sha256(TARGET.read_bytes()).hexdigest()
    CHECKSUMS.write_text(
        f"{digest}  {TARGET.name}\n",
        encoding="ascii",
        newline="\n",
    )
    print(
        json.dumps(
            {
                "artifact": TARGET.name,
                "bytes": TARGET.stat().st_size,
                "entries": len(entries),
                "sha256": digest,
            },
            separators=(",", ":"),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
