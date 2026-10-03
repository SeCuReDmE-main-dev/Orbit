"""Prepare prospective final E snapshots; never create VMs, read tokens or call models.

Captured public observations are supplied by the coordinator. This helper checks
their consistency/age; it does not replace fresh browser/provider observations.
"""
from __future__ import annotations

import argparse
import copy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import time

import prepare_kaggle_campaign_v2 as base
from orbit_campaign_checkpoint import campaign_identity
from prepare_kaggle_webmcp_validation_v2 import KAGGLE_BOOTSTRAP
import provision_v2_browser_pool as pool

CAMPAIGN = "orbit-kaggle-20261003-final-e1"
OUTPUT = base.ROOT / ".orbit/closure-20261003/e"
INPUT_DATASET = "/kaggle/input/datasets/celebrum/orbit-kaggle-v2-private-inputs"
AUXILIARY = ["tools/provision_v2_browser_pool.py", "tools/prepare_kaggle_webmcp_validation_v2.py",
             "tools/kaggle_webmcp_boundary_validation.py", "tools/kaggle_webmcp_parallel_validation.py",
             "tools/kaggle_final_e_preparation_validation.py",
             "tools/prepare_final_e_20261003.py"]


def read_json(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 2 * 1024 * 1024:
        raise RuntimeError("BOUNDED_REGULAR_JSON_REQUIRED")
    result = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(result, dict):
        raise RuntimeError("JSON_OBJECT_REQUIRED")
    return result


def write_new(path, value):
    path = Path(path)
    if not path.resolve().is_relative_to(OUTPUT.resolve()):
        raise RuntimeError("VERSIONED_PRIVATE_PREPARATION_DIRECTORY_REQUIRED")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, indent=2)
        stream.write("\n")


def sources():
    engine, harness, rules = base.source_identity()
    return {"engineSourceSha256": base.mapping_digest(engine), "harnessSha256": base.mapping_digest(harness),
            "rulesSha256": base.mapping_digest(rules), "sourceFiles": {"engine": engine, "harness": harness},
            "auxiliaryFiles": {name: hashlib.sha256((base.ROOT/name).read_bytes()).hexdigest() for name in AUXILIARY},
            "campaignRuntimeSourceSha256": hashlib.sha256((base.ROOT/"tools/kaggle_webmcp_campaign.py").read_text(encoding="utf-8").encode()).hexdigest()}


def current_sources(configuration):
    actual = sources()
    if any(configuration.get(key) != value for key, value in actual.items()):
        raise RuntimeError("SOURCE_CHANGED_AFTER_PROSPECTIVE_FREEZE_CREATE_A_NEW_PREPARATION")


def preflight_observations(observed):
    if (observed.get("modelCalls") != 0 or not isinstance(observed.get("source"), str)
            or not 1 <= len(observed["source"]) <= 240 or observed.get("sdkVersion") != "0.6.1"
            or observed.get("modelsAvailable") != base.MODELS):
        raise RuntimeError("ACTUAL_CATALOGUE_SDK_ZERO_MODEL_OBSERVATION_REQUIRED")
    timestamp = observed.get("observedAtUnix")
    if not isinstance(timestamp, (float, int)) or isinstance(timestamp, bool) or not 0 <= time.time() - timestamp <= 3600:
        raise RuntimeError("FRESH_CATALOGUE_QUOTA_OBSERVATION_REQUIRED")
    windows = observed.get("quotaSnapshot")
    if not isinstance(windows, list) or {item.get("name") for item in windows if isinstance(item, dict)} != {"daily", "monthly"} or len(windows) != 2:
        raise RuntimeError("ACTUAL_DAILY_MONTHLY_FREE_QUOTA_REQUIRED")
    for window in windows:
        limit, used = window.get("limitNanodollars"), window.get("usedNanodollars")
        when = window.get("observedAtUnix")
        if (not all(isinstance(value, int) and not isinstance(value, bool) for value in [limit, used])
                or not 0 <= used < limit or used / limit >= 0.85
                or not isinstance(when, (int, float)) or not 0 <= time.time() - when <= 3600):
            raise RuntimeError("CURRENT_FREE_QUOTA_BELOW_CONSERVATIVE_DISPATCH_GUARD_REQUIRED")
    return {"sdkVersion": "0.6.1", "models": list(base.MODELS), "modelsChecked": True,
            "quotaSnapshot": copy.deepcopy(windows), "maxLotReserveNanodollars": None,
            "preflightObservation": {"source": observed["source"], "observedAtUnix": timestamp,
                                     "sdkVersion": "0.6.1", "modelsAvailable": list(base.MODELS), "modelCalls": 0}}


def recorded_pool_retirement(cleanup):
    if pool.POOL.exists() or pool.SECRET_FILE.exists():
        raise RuntimeError("RETIRED_POOL_CREDENTIAL_FILES_MUST_BE_ABSENT")
    ledger = read_json(pool.LEDGER)
    if (ledger.get("state") != "closed" or ledger.get("ownedGenerationConfirmedAbsent") is not True
            or ledger.get("localMissionCredentialFilesRemoved") is not True
            or cleanup.get("state") != "closed" or cleanup.get("ownedAfter") != 0
            or cleanup.get("generation") != ledger.get("currentGeneration")):
        raise RuntimeError("MATCHING_RECORDED_POOL_CLEANUP_REQUIRED")
    return {"generation": ledger["currentGeneration"], "state": "recorded-retired",
            "observedAt": cleanup.get("observedAt"), "liveInventoryStillRequiredByProvisioner": True}


def fresh_pool_inventory(observed):
    when = observed.get("observedAtUnix")
    active, owned = observed.get("activeSandboxes"), observed.get("registeredOwnedSandboxes")
    if (observed.get("campaign") != pool.CAMPAIGN or observed.get("modelCalls") != 0
            or observed.get("resourcesMutated") is not False
            or not isinstance(observed.get("source"), str) or not 1 <= len(observed["source"]) <= 240
            or not isinstance(when, (int, float)) or isinstance(when, bool) or not 0 <= time.time()-when <= 3600
            or not isinstance(active, int) or isinstance(active, bool) or active < 0
            or not isinstance(owned, int) or isinstance(owned, bool) or owned != 0):
        raise RuntimeError("FRESH_READ_ONLY_RETIRED_POOL_INVENTORY_REQUIRED")
    return {key: observed[key] for key in ["campaign", "source", "observedAtUnix",
                                          "activeSandboxes", "registeredOwnedSandboxes", "resourcesMutated", "modelCalls"]}


def prospective_prepare(args):
    release = read_json(args.release_json)
    release_bytes = args.release_json.read_bytes()
    if (release.get("version") != "3.0.0" or release.get("displayVersion") != "V3"
            or not re.fullmatch(r"orbit-[A-Za-z0-9-]{1,95}", str(release.get("releaseId", "")))
            or release.get("rootWebMcpContract") != "orbit-webmcp-v7"
            or not {"/", "/app/", "/formation/lab/", "/formation/projets/"}.issubset(release.get("routes", []))):
        raise RuntimeError("REAL_PUBLIC_V3_RELEASE_MANIFEST_REQUIRED")
    captured = read_json(args.release_observation)
    release_hash = hashlib.sha256(release_bytes).hexdigest()
    if (captured.get("url") != "https://orbit.securedme.ca/orbit-release.json" or captured.get("status") != 200
            or not isinstance(captured.get("source"), str) or not 1 <= len(captured["source"]) <= 240
            or captured.get("releaseId") != release["releaseId"]
            or captured.get("sha256") != release_hash):
        raise RuntimeError("MATCHING_ACTUAL_PUBLIC_RELEASE_READBACK_REQUIRED")
    observations = preflight_observations(read_json(args.observations))
    browser = read_json(args.browser_observation)
    rows = browser.get("nativePool", [browser])
    majors = {row.get("chromeMajor") for row in rows if isinstance(row, dict) and row.get("native") is True}
    if len(majors) != 1 or not all(isinstance(value, int) and not isinstance(value, bool) for value in majors):
        raise RuntimeError("OBSERVED_NATIVE_CHROME_PIN_REQUIRED")
    retired = recorded_pool_retirement(read_json(args.cleanup_receipt))
    inventory = fresh_pool_inventory(read_json(args.inventory_observation))
    configuration = read_json(base.ENTRY/"manifest-e-nativebounds1.json")
    configuration.update(sources())
    configuration.update(observations)
    configuration.update({"campaignId": CAMPAIGN, "repositoryHead": subprocess.check_output(["git","rev-parse","HEAD"],cwd=base.ROOT,text=True).strip(),
        "frozen": True, "state": "prospective-pool-and-native-QA-only", "executableSuites": ["E"],
        "modelDispatchAuthorized": False, "quotaChecked": False, "modelCallsExecuted": 0,
        "releaseId": release["releaseId"], "releaseManifestSha256": release_hash, "browserMajor": next(iter(majors)),
        "maxNativeCalls": 20, "maxDurationSeconds": 480, "maxHoldRequests": 2, "maxTransientAttempts": 2,
        "maxWorkers": 8, "maxParallelTrajectories": 8, "workerSecretName": "ORBIT_WORKER_POOL_JSON",
        "inputCorpusDir": INPUT_DATASET, "inputReferenceDir": INPUT_DATASET,
        "resumeDatasetDir": None, "resumeArchives": {}, "recordedPreviousPoolRetirement": retired,
        "readOnlyRetiredPoolInventory": inventory,
        "readOnlyInventoryObservationSha256": hashlib.sha256(args.inventory_observation.read_bytes()).hexdigest(),
        "releaseObservation": {key: captured[key] for key in ["url", "status", "source", "releaseId", "sha256"]},
        "browserPinObservationSha256": hashlib.sha256(args.browser_observation.read_bytes()).hexdigest(),
        "browserPinIsProvisionalUntilNewPoolQualification": True})
    configuration["targets"]["E"] = {"trajectories": 144}
    configuration["quotaPolicy"]["unknownPricingStrategy"] = "bounded-parallel-provider-free-quota"
    configuration["quotaPolicy"]["maxSnapshotAgeSeconds"] = 3600
    configuration["quotaPolicy"]["paidTopupAllowed"] = False
    configuration["quotaPolicy"]["automaticModelReplacement"] = False
    directory = OUTPUT/(release["releaseId"] + "-" + configuration["harnessSha256"][:12] + "-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"))
    write_new(directory/"manifest-provision.json", configuration)
    write_new(directory/"preparation.json", {"state": "PROSPECTIVE_NOT_RUN", "campaignId": CAMPAIGN,
        "manifest": str(directory/"manifest-provision.json"), "configurationSha256": campaign_identity(configuration),
        "modelsExecuted": False, "vmsCreated": False, "observationsAreCoordinatorSupplied": True})
    return {"state": "PROSPECTIVE_NOT_RUN", "directory": str(directory), "manifest": str(directory/"manifest-provision.json")}


def owned_pool(configuration, preparation):
    ledger = read_json(pool.LEDGER)
    if (configuration.get("campaignId") != CAMPAIGN or configuration.get("modelDispatchAuthorized") is not False
            or configuration.get("maxNativeCalls") != 20 or configuration.get("maxDurationSeconds") != 480
            or configuration.get("maxHoldRequests") != 2 or configuration.get("maxWorkers") != 8
            or preparation.get("experimentalCampaignId") != CAMPAIGN or preparation.get("state") != "prepared-not-tested"
            or preparation.get("workers") != 8 or preparation.get("releaseId") != configuration["releaseId"]
            or preparation.get("harnessSha256") != configuration["harnessSha256"]
            or ledger.get("experimentalCampaignId") != CAMPAIGN
            or ledger.get("currentGeneration") != preparation.get("generation") or ledger.get("state") != "prepared-not-tested"
            or ledger.get("releaseId") != configuration["releaseId"] or ledger.get("harnessSha256") != configuration["harnessSha256"]):
        raise RuntimeError("EXACT_NEW_OWNED_E_POOL_PREPARATION_REQUIRED")
    rows = [row for row in ledger.get("sandboxes", []) if row.get("generation") == preparation["generation"]]
    browsers = [row["id"] for row in rows if row.get("role") == "browser" and row.get("state") == "running"]
    if (len(browsers) != 8 or len(set(browsers)) != 8 or len(rows) != 9
            or len({row.get("id") for row in rows}) != 9
            or sum(row.get("role") == "control" and row.get("state") == "running" for row in rows) != 1):
        raise RuntimeError("EIGHT_BROWSER_ONE_CONTROL_GENERATION_REQUIRED")
    return sorted(browsers)


def browser_pool_pin(preparation, ids):
    rows = preparation.get("browserVersions", [])
    majors = {row.get("chromeMajor") for row in rows if isinstance(row, dict)}
    if (preparation.get("browserVersionSource") != "google-chrome --version / official E2B worker commands"
            or preparation.get("nativeQualificationStillRequired") is not True or len(rows) != 8
            or len(majors) != 1 or not all(isinstance(major, int) and not isinstance(major, bool) and major > 0 for major in majors)
            or {row.get("worker") for row in rows} != set(range(8))
            or sorted(row.get("sandboxId", "") for row in rows) != ids
            or not all(isinstance(row.get("version"), str) and 1 <= len(row["version"]) <= 120
                       and row["version"].startswith("Google Chrome "+str(row["chromeMajor"])+".") for row in rows)):
        raise RuntimeError("ACTUAL_UNIQUE_EIGHT_NEW_WORKER_CHROME_PIN_REQUIRED")
    return {"chromeMajor": next(iter(majors)), "source": preparation["browserVersionSource"],
            "nativeQualificationStillRequired": True, "workers": copy.deepcopy(rows)}


def qualify_prepare(args):
    configuration = read_json(args.manifest); current_sources(configuration)
    preparation = read_json(args.pool_preparation)
    browser_ids = owned_pool(configuration, preparation)
    actual_browser_pin = browser_pool_pin(preparation, browser_ids)
    configuration.update({"workerGeneration": preparation["generation"], "poolSandboxIds": browser_ids,
                          "bridgeBundleSha256": preparation["bundleSha256"], "modelDispatchAuthorized": False,
                          "provisionalBrowserPinObservationSha256": configuration["browserPinObservationSha256"],
                          "browserPinObservationSha256": hashlib.sha256(args.pool_preparation.read_bytes()).hexdigest(),
                          "browserMajor": actual_browser_pin["chromeMajor"],
                          "currentGenerationBrowserVersionObservation": actual_browser_pin})
    target = args.manifest.parent/"manifest-native-qa.json"
    write_new(target, configuration)
    subprocess.run([sys.executable, str(base.ROOT/"tools/prepare_kaggle_webmcp_validation_v2.py"),
        "--manifest", str(target), "--out", str(target.parent), "--receipt-dir", str(target.parent),
        "--name", "orbit-e-final-qualification"], check=True)
    return {"state": "NATIVE_QUALIFICATION_PREPARED_NOT_RUN", "manifest": str(target),
            "notebook": str(target.parent/"orbit-e-final-qualification.ipynb"), "modelCalls": 0}


def qualified_native_pool(configuration, qualified, ids):
    """Admit an observed eight-worker qualification, never a partial receipt."""
    if (qualified.get("state") != "PASS" or qualified.get("host") != "Kaggle" or qualified.get("modelCalls") != 0
            or qualified.get("campaignId") != CAMPAIGN or qualified.get("workerGeneration") != configuration.get("workerGeneration")
            or sorted(qualified.get("poolSandboxIds", [])) != ids or qualified.get("harnessSha256") != configuration["harnessSha256"]
            or qualified.get("configurationSha256") != campaign_identity(configuration)
            or qualified.get("campaignSourceSha256") != configuration["campaignRuntimeSourceSha256"]
            or qualified.get("releaseManifestSha256") != configuration["releaseManifestSha256"]):
        raise RuntimeError("ACTUAL_MATCHING_NEW_POOL_NATIVE_QUALIFICATION_REQUIRED")
    when = qualified.get("observedAtUnix")
    rows = qualified.get("nativePool", [])
    if (not isinstance(when, (int, float)) or isinstance(when, bool)
            or not 0 <= time.time()-when <= 3600 or len(rows) != 8
            or {row.get("worker") for row in rows} != set(range(8))
            or not all(row.get("passed") is True and row.get("native") is True and row.get("registeredToolCount") == 15
                and row.get("chromeMajor") == configuration["browserMajor"] and row.get("modelCredentialRoleChangeRefused") is True
                and row.get("profileStop") == "closed" and row.get("releaseSha256") == configuration["releaseManifestSha256"] for row in rows)
            or qualified.get("parallel", {}).get("state") != "PASS"
            or qualified.get("parallel", {}).get("nJobsQualified") != 8
            or qualified.get("boundary", {}).get("state") != "PASS"
            or qualified.get("preparation", {}).get("state") != "PASS"):
        raise RuntimeError("FRESH_ALL_EIGHT_NATIVE_WORKERS_AND_BOUNDARIES_REQUIRED")
    return when


def freeze(args):
    configuration = read_json(args.manifest); current_sources(configuration)
    ids = owned_pool(configuration, read_json(args.pool_preparation))
    qualified = read_json(args.qualification)
    when = qualified_native_pool(configuration, qualified, ids)
    configuration.update(preflight_observations(read_json(args.observations)))
    configuration.update({"state": "frozen-current-qualified-final-E", "modelDispatchAuthorized": True,
        "quotaChecked": True, "browserPinIsProvisionalUntilNewPoolQualification": False,
        "nativeQualificationSha256": hashlib.sha256(args.qualification.read_bytes()).hexdigest(),
        "nativeQualificationObservedAtUnix": when})
    base.validate_frozen(configuration, "E")
    target = args.manifest.parent/"manifest-model.json"
    write_new(target, configuration)
    notebook = base.notebook(configuration, "E")
    pool_guard = """if len(POOL)!=8 or sorted(worker.get('sandboxId','') for worker in POOL)!=RUN_CONFIG['poolSandboxIds']:
    raise RuntimeError('EXACT_FRESH_OWNED_WORKER_SECRET_REQUIRED')
"""
    notebook['cells'].insert(2, {'cell_type': 'code', 'metadata': {}, 'execution_count': None,
                                 'outputs': [], 'source': pool_guard.splitlines(True)})
    notebook['cells'].insert(1, {'cell_type': 'code', 'metadata': {}, 'execution_count': None,
                                 'outputs': [], 'source': KAGGLE_BOOTSTRAP.splitlines(True)})
    write_new(target.parent/"orbit-e-final-campaign.ipynb", notebook)
    write_new(target.parent/"model-preparation.json", {"state": "FROZEN_RUNNER_PREPARED_NOT_RUN", "campaignId": CAMPAIGN,
        "configurationSha256": campaign_identity(configuration), "manifest": str(target),
        "nativeQualificationSha256": configuration["nativeQualificationSha256"], "modelsExecuted": False,
        "notebookSha256": hashlib.sha256((target.parent/"orbit-e-final-campaign.ipynb").read_bytes()).hexdigest()})
    return {"state": "FROZEN_RUNNER_PREPARED_NOT_RUN", "manifest": str(target),
            "notebook": str(target.parent/"orbit-e-final-campaign.ipynb"), "modelsExecuted": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_subparsers(dest="action", required=True)
    prepare = actions.add_parser("prepare")
    for name in ["release-json", "release-observation", "observations", "browser-observation", "cleanup-receipt", "inventory-observation"]:
        prepare.add_argument("--"+name, type=Path, required=True)
    qualify = actions.add_parser("qualify")
    qualify.add_argument("--manifest", type=Path, required=True)
    qualify.add_argument("--pool-preparation", type=Path, required=True)
    final = actions.add_parser("freeze")
    for name in ["manifest", "pool-preparation", "qualification", "observations"]:
        final.add_argument("--"+name, type=Path, required=True)
    args = parser.parse_args()
    result = {"prepare": prospective_prepare, "qualify": qualify_prepare, "freeze": freeze}[args.action](args)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
