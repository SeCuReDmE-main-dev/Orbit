"""Exercise final E preparation guards in Kaggle, without models or VM creation.

The exact helper's pure functions are loaded from its embedded source. Temporary
pool ledgers are synthetic software fixtures; these checks do not inventory E2B.
"""
import ast
import copy
import io
import json
from pathlib import Path
import tempfile
import time
from types import SimpleNamespace
import unittest
from orbit_campaign_checkpoint import campaign_identity


def run_preparation_validation(helper_source, config):
    if not Path('/kaggle/working').is_dir():
        raise RuntimeError('KAGGLE_EXECUTION_REQUIRED')
    functions = {'read_json', 'write_new', 'preflight_observations',
                 'recorded_pool_retirement', 'fresh_pool_inventory', 'owned_pool', 'browser_pool_pin', 'qualified_native_pool'}
    tree = ast.parse(helper_source)
    selected = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in functions]
    if {node.name for node in selected} != functions:
        raise RuntimeError('ACTUAL_PREPARATION_GUARD_FUNCTIONS_REQUIRED')
    namespace = {'Path': Path, 'json': json, 'copy': copy, 'time': time,
                 'base': SimpleNamespace(MODELS=list(config['models'])),
                 'campaign_identity': campaign_identity,
                 'CAMPAIGN': 'orbit-kaggle-20261003-final-e1'}
    exec(compile(ast.Module(body=selected, type_ignores=[]), '<actual-final-e-guards>', 'exec'), namespace)

    def observations():
        now = time.time()
        return {'modelCalls': 0, 'source': 'synthetic QA observation; no provider access',
                'sdkVersion': '0.6.1', 'modelsAvailable': list(config['models']), 'observedAtUnix': now,
                'quotaSnapshot': [{'name': name, 'limitNanodollars': 10_000_000_000,
                                  'usedNanodollars': 0, 'observedAtUnix': now, 'resetsAtUnix': None}
                                 for name in ['daily', 'monthly']]}

    class PreparationGuards(unittest.TestCase):
        def test_actual_catalogue_and_quota_remain_bounded(self):
            original = observations()
            accepted = namespace['preflight_observations'](original)
            self.assertEqual(accepted['models'], config['models'])
            self.assertIsNone(accepted['quotaSnapshot'][0]['resetsAtUnix'])
            self.assertIsNone(accepted['maxLotReserveNanodollars'])
            accepted['quotaSnapshot'][0]['usedNanodollars'] = 1
            self.assertEqual(original['quotaSnapshot'][0]['usedNanodollars'], 0)
            for field, value in [('modelCalls', 1), ('sdkVersion', '0.6.2'),
                                 ('modelsAvailable', ['replacement-model']), ('source', '')]:
                with self.subTest(field=field), self.assertRaisesRegex(RuntimeError, 'CATALOGUE_SDK'):
                    namespace['preflight_observations']({**original, field: value})

        def test_stale_partial_and_exhausted_quota_refuse_dispatch(self):
            original = observations()
            for when in [time.time() - 3601, time.time() + 10, True]:
                with self.subTest(when=when), self.assertRaisesRegex(RuntimeError, 'FRESH_CATALOGUE'):
                    namespace['preflight_observations']({**original, 'observedAtUnix': when})
            missing = copy.deepcopy(original); missing['quotaSnapshot'].pop()
            with self.assertRaisesRegex(RuntimeError, 'DAILY_MONTHLY'):
                namespace['preflight_observations'](missing)
            for field, value in [('usedNanodollars', 8_500_000_000), ('usedNanodollars', True),
                                 ('limitNanodollars', 0), ('observedAtUnix', time.time() - 3601)]:
                bad = copy.deepcopy(original); bad['quotaSnapshot'][0][field] = value
                with self.subTest(field=field, value=value), self.assertRaisesRegex(RuntimeError, 'QUOTA_BELOW'):
                    namespace['preflight_observations'](bad)

        def test_recorded_retirement_is_not_live_inventory_or_token_access(self):
            with tempfile.TemporaryDirectory(prefix='orbit-e-retirement-fixture-', dir='/kaggle/working') as directory:
                root = Path(directory)
                namespace['pool'] = SimpleNamespace(POOL=root/'pool.private.json',
                    SECRET_FILE=root/'worker-secret.private.txt', LEDGER=root/'resources.json',
                    CAMPAIGN='orbit-kaggle-20261001-v2')
                namespace['pool'].LEDGER.write_text(json.dumps({'state': 'closed',
                    'ownedGenerationConfirmedAbsent': True, 'localMissionCredentialFilesRemoved': True,
                    'currentGeneration': 'retired-synthetic-generation'}))
                cleanup = {'state': 'closed', 'ownedAfter': 0, 'generation': 'retired-synthetic-generation'}
                checked = namespace['recorded_pool_retirement'](cleanup)
                self.assertTrue(checked['liveInventoryStillRequiredByProvisioner'])
                with self.assertRaisesRegex(RuntimeError, 'MATCHING_RECORDED'):
                    namespace['recorded_pool_retirement']({**cleanup, 'ownedAfter': 1})
                namespace['pool'].SECRET_FILE.write_text('synthetic marker; never a credential')
                namespace['pool'].LEDGER.write_text('not valid JSON; must not be read with leftover credential files')
                with self.assertRaisesRegex(RuntimeError, 'CREDENTIAL_FILES_MUST_BE_ABSENT'):
                    namespace['recorded_pool_retirement'](cleanup)
                inventory = {'campaign': namespace['pool'].CAMPAIGN, 'modelCalls': 0,
                    'resourcesMutated': False, 'source': 'synthetic official SDK inventory fixture',
                    'observedAtUnix': time.time(), 'activeSandboxes': 0, 'registeredOwnedSandboxes': 0}
                self.assertEqual(namespace['fresh_pool_inventory'](inventory)['registeredOwnedSandboxes'], 0)
                for field, value in [('observedAtUnix', time.time()-3601), ('resourcesMutated', True),
                                     ('registeredOwnedSandboxes', 1), ('activeSandboxes', True),
                                     ('campaign', 'unrelated-campaign'), ('modelCalls', 1)]:
                    with self.subTest(field=field), self.assertRaisesRegex(RuntimeError, 'READ_ONLY_RETIRED_POOL'):
                        namespace['fresh_pool_inventory']({**inventory, field: value})

        def test_new_pool_requires_exact_identity_and_all_running_resources(self):
            with tempfile.TemporaryDirectory(prefix='orbit-e-pool-fixture-', dir='/kaggle/working') as directory:
                ledger_path = Path(directory)/'resources.json'
                namespace['pool'] = SimpleNamespace(LEDGER=ledger_path)
                generation = 'new-synthetic-generation'
                prepared = {'experimentalCampaignId': namespace['CAMPAIGN'], 'state': 'prepared-not-tested',
                    'workers': 8, 'releaseId': config['releaseId'], 'harnessSha256': config['harnessSha256'],
                    'generation': generation}
                ledger = {**prepared, 'currentGeneration': generation,
                    'sandboxes': [{'id': 'synthetic-browser-'+str(index), 'generation': generation,
                                   'role': 'browser', 'state': 'running'} for index in range(8)] +
                                 [{'id': 'synthetic-control', 'generation': generation,
                                   'role': 'control', 'state': 'running'}]}
                prospective = {**config, 'campaignId': namespace['CAMPAIGN'], 'modelDispatchAuthorized': False,
                               'maxNativeCalls': 20, 'maxDurationSeconds': 480, 'maxHoldRequests': 2, 'maxWorkers': 8}
                ledger_path.write_text(json.dumps(ledger))
                ids = namespace['owned_pool'](prospective, prepared)
                self.assertEqual(len(ids), 8)
                versioned = {**prepared, 'browserVersionSource': 'google-chrome --version / official E2B worker commands',
                    'nativeQualificationStillRequired': True,
                    'browserVersions': [{'worker': index, 'sandboxId': 'synthetic-browser-'+str(index),
                        'version': 'Google Chrome 155.0.1.0', 'chromeMajor': 155} for index in range(8)]}
                self.assertEqual(namespace['browser_pool_pin'](versioned, ids)['chromeMajor'], 155)
                self.assertTrue(namespace['browser_pool_pin'](versioned, ids)['nativeQualificationStillRequired'])
                for field, value in [('worker', 0), ('sandboxId', 'unrelated-worker'), ('chromeMajor', 154)]:
                    bad = copy.deepcopy(versioned); bad['browserVersions'][-1][field] = value
                    with self.subTest(field=field), self.assertRaisesRegex(RuntimeError, 'EIGHT_NEW_WORKER_CHROME'):
                        namespace['browser_pool_pin'](bad, ids)
                with self.assertRaisesRegex(RuntimeError, 'EXACT_NEW_OWNED'):
                    namespace['owned_pool'](prospective, {**prepared, 'releaseId': 'old-release'})
                stopped = copy.deepcopy(ledger); stopped['sandboxes'][-1]['state'] = 'stopped'
                ledger_path.write_text(json.dumps(stopped))
                with self.assertRaisesRegex(RuntimeError, 'EIGHT_BROWSER_ONE_CONTROL'):
                    namespace['owned_pool'](prospective, prepared)
                duplicate = copy.deepcopy(ledger); duplicate['sandboxes'][-1]['id'] = 'synthetic-browser-0'
                ledger_path.write_text(json.dumps(duplicate))
                with self.assertRaisesRegex(RuntimeError, 'EIGHT_BROWSER_ONE_CONTROL'):
                    namespace['owned_pool'](prospective, prepared)

        def test_qualification_requires_every_unique_worker_and_actual_snapshot(self):
            prospective = {**config, 'campaignId': namespace['CAMPAIGN'], 'workerGeneration': 'new-synthetic-generation',
                           'campaignRuntimeSourceSha256': 'a'*64}
            ids = ['synthetic-browser-'+str(index) for index in range(8)]
            receipt = {'state': 'PASS', 'host': 'Kaggle', 'modelCalls': 0, 'campaignId': namespace['CAMPAIGN'],
                'workerGeneration': prospective['workerGeneration'], 'poolSandboxIds': ids,
                'harnessSha256': prospective['harnessSha256'],
                'configurationSha256': campaign_identity(prospective), 'campaignSourceSha256': 'a'*64,
                'releaseManifestSha256': prospective['releaseManifestSha256'], 'observedAtUnix': time.time(),
                'nativePool': [{'worker': index, 'passed': True, 'native': True, 'registeredToolCount': 15,
                    'chromeMajor': prospective['browserMajor'], 'modelCredentialRoleChangeRefused': True,
                    'profileStop': 'closed', 'releaseSha256': prospective['releaseManifestSha256']} for index in range(8)],
                'parallel': {'state': 'PASS', 'nJobsQualified': 8}, 'boundary': {'state': 'PASS'},
                'preparation': {'state': 'PASS'}}
            self.assertEqual(namespace['qualified_native_pool'](prospective, receipt, ids), receipt['observedAtUnix'])
            for field, value in [('modelCalls', 1), ('configurationSha256', 'b'*64), ('poolSandboxIds', ids[:-1])]:
                with self.subTest(field=field), self.assertRaisesRegex(RuntimeError, 'MATCHING_NEW_POOL'):
                    namespace['qualified_native_pool'](prospective, {**receipt, field: value}, ids)
            for field, value in [('worker', 0), ('registeredToolCount', 25), ('profileStop', 'open')]:
                bad = copy.deepcopy(receipt); bad['nativePool'][-1][field] = value
                with self.subTest(field=field), self.assertRaisesRegex(RuntimeError, 'ALL_EIGHT'):
                    namespace['qualified_native_pool'](prospective, bad, ids)
            with self.assertRaisesRegex(RuntimeError, 'ALL_EIGHT'):
                namespace['qualified_native_pool'](prospective, {**receipt, 'preparation': {'state': 'FAIL'}}, ids)

        def test_new_files_cannot_overwrite_history_or_escape_versioned_directory(self):
            with tempfile.TemporaryDirectory(prefix='orbit-e-preparation-fixture-', dir='/kaggle/working') as directory:
                namespace['OUTPUT'] = Path(directory)/'versioned'
                target = namespace['OUTPUT']/'generation'/'manifest.json'
                namespace['write_new'](target, {'state': 'fixture'})
                with self.assertRaises(FileExistsError):
                    namespace['write_new'](target, {'state': 'overwrite'})
                with self.assertRaisesRegex(RuntimeError, 'VERSIONED_PRIVATE'):
                    namespace['write_new'](Path(directory)/'outside.json', {})
                self.assertEqual(json.loads(target.read_text()), {'state': 'fixture'})

    output = io.StringIO()
    result = unittest.TextTestRunner(stream=output, verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(PreparationGuards))
    return {'format': 'orbit-final-e-preparation-qualification-v1', 'host': 'Kaggle', 'modelCalls': 0,
        'state': 'PASS' if result.wasSuccessful() else 'FAIL', 'testsRun': result.testsRun,
        'failures': len(result.failures), 'errors': len(result.errors), 'output': output.getvalue(),
        'limitations': ['Synthetic resource ledgers do not prove live E2B inventory or token revocation.',
                       'Catalogue and quota values in these tests are fixtures; dispatch needs fresh observations.']}
