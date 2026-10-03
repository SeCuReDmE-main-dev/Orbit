"""Pure packaging guards; fixtures do not qualify a cloud build or deployment."""
from __future__ import annotations

from copy import deepcopy
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import unittest

SPEC = importlib.util.spec_from_file_location("closure_packager", Path(__file__).resolve().parents[1] / "tools/package_closure_release.py")
packager = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(packager)


def fixture(version="1.0.1", environment="kaggle"):
    script = b"export const fixture = true;"
    payload = io.BytesIO()
    with tarfile.open(fileobj=payload, mode="w:gz") as archive:
        for name, content in {
            "package/package.json": json.dumps({"name": "@orbit/learning-studio", "version": version}).encode(),
            "package/dist/index.js": script,
        }.items():
            member = tarfile.TarInfo(name)
            member.size = len(content)
            archive.addfile(member, io.BytesIO(content))
    data = payload.getvalue()
    report = {"package": "@orbit/learning-studio", "version": version, "bundled": True,
              "archive": f"orbit-learning-studio-{version}.tgz", "sha256": packager.digest(data),
              "environmentDeclaredByOrchestrator": environment}
    host = {"state": "BUILD_COMPLETE", "environment": environment, "archiveSha256": report["sha256"],
            "installedPluginEntrySha256": packager.digest(script), "pluginVersion": version,
            "pluginArchive": report["archive"]}
    return data, report, host


class ClosurePackagingGuards(unittest.TestCase):
    def test_keeps_legacy_output_and_receipt_paths(self):
        output, receipt = packager.release_paths(packager.RELEASE)
        self.assertEqual(output, packager.PRIVATE / "releases" / (packager.RELEASE + ".zip"))
        self.assertEqual(receipt, packager.PRIVATE / "closure-20261001" / "closure-release-package.json")

    def test_new_releases_have_independent_receipts(self):
        first = packager.release_paths("orbit-v3-final-20261003T180000Z")
        second = packager.release_paths("orbit-v3-final-20261003T190000Z")
        self.assertNotEqual(first[0], second[0])
        self.assertNotEqual(first[1], second[1])
        self.assertTrue(first[1].is_relative_to(packager.PRIVATE))

    def test_refuses_unsafe_or_unbounded_release_identifiers(self):
        for value in ["../orbit-release", "orbit-v3/override", "orbit-v3\\override", "orbit-", "other-release", "orbit-" + "a" * 97]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                packager.release_paths(value)

    def test_accepts_truthful_kaggle_or_e2b_build_identity(self):
        for environment in ["kaggle", "e2b"]:
            with self.subTest(environment=environment):
                self.assertEqual(packager.validate_plugin_build(*fixture(environment=environment)), environment)

    def test_keeps_legacy_build_receipts_compatible(self):
        data, report, host = fixture(version="1.0.0", environment="e2b")
        del host["pluginVersion"], host["pluginArchive"]
        self.assertEqual(packager.validate_plugin_build(data, report, host), "e2b")

    def test_refuses_plugin_identity_drift(self):
        data, report, host = fixture()
        for key, value in [("version", "1.0.0"), ("sha256", "0" * 64), ("package", "unrelated"),
                           ("bundled", False), ("environmentDeclaredByOrchestrator", "windows")]:
            changed = {**report, key: value}
            with self.subTest(key=key), self.assertRaises(ValueError):
                packager.validate_plugin_build(data, changed, host)

    def test_refuses_absent_or_different_installed_plugin(self):
        data, report, host = fixture()
        for changed in [None, {}, {**host, "state": "RUNNING"}, {**host, "environment": "e2b"},
                        {**host, "archiveSha256": "0" * 64}, {**host, "installedPluginEntrySha256": "0" * 64},
                        {**host, "pluginVersion": "1.0.0"}, {**host, "pluginArchive": "old.tgz"}]:
            with self.subTest(host=changed), self.assertRaises(ValueError):
                packager.validate_plugin_build(data, report, changed)

    def test_does_not_rewrite_the_supplied_receipts(self):
        data, report, host = fixture()
        original = deepcopy((report, host))
        packager.validate_plugin_build(data, report, host)
        self.assertEqual((report, host), original)


if __name__ == "__main__":
    unittest.main()
