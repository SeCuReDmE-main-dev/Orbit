"""Kaggle-only checks of provider failure classification and bounded resume.

The response strings are synthetic fixtures reproducing an observed overload
message. Callbacks are local test doubles, never provider/model requests. The
real CampaignLedger persists their attempts in a temporary Kaggle directory.
"""
from __future__ import annotations

import hashlib
import io
from pathlib import Path
import tempfile
import threading
import time
import unittest


OVERLOAD_429 = (
    "Error code: 429 - {'error': {'message': 'The model is currently "
    "experiencing heavy load. Please try again later.', 'type': 'rate_limit_error'}}"
)


def run_failure_classification_validation():
    if not Path('/kaggle/working').is_dir():
        raise RuntimeError('KAGGLE_FAILURE_CLASSIFICATION_QA_REQUIRED')
    import orbit_campaign_checkpoint as checkpoint

    class FailureClassificationRegression(unittest.TestCase):
        def setUp(self):
            self.directory = tempfile.TemporaryDirectory(
                prefix='orbit-failure-classification-qa-', dir='/kaggle/working')
            config = {
                'campaignId': 'orbit-failure-classification-software-fixture',
                'origin': 'synthetic-software-qa-not-provider-observation',
                'maxTransientAttempts': 2,
                'maxLotReserveNanodollars': None,
                'quotaPolicy': {'unknownPricingStrategy': 'serial-provider-free-quota',
                                'maxSnapshotAgeSeconds': 3600},
                'quotaSnapshot': [{'name': 'synthetic-test-window',
                                   'limitNanodollars': 10_000_000_000,
                                   'usedNanodollars': 0,
                                   'observedAtUnix': time.time() - 1,
                                   'resetsAtUnix': None}],
            }
            # No provider, SDK client or campaign initialization is needed for
            # these isolated ledger tests. The public entry point gates Kaggle.
            self.ledger = object.__new__(checkpoint.CampaignLedger)
            self.ledger.config = config
            self.ledger.suite = 'C'
            self.ledger.root = Path(self.directory.name) / 'C'
            self.ledger.root.mkdir()
            self.ledger.lock = threading.RLock()
            self.ledger.dispatch_lock = threading.RLock()
            self.ledger.blocked = threading.Event()
            self.ledger.identity = checkpoint.campaign_identity(config)

        def tearDown(self):
            self.directory.cleanup()

        def test_explicit_provider_model_overload_is_transient(self):
            self.assertEqual(checkpoint.failure_kind(RuntimeError(OVERLOAD_429)),
                             'transient-transport')
            self.assertEqual(checkpoint.safe_error(RuntimeError(OVERLOAD_429))['failureKind'],
                             'transient-transport')
            self.assertEqual(checkpoint.failure_kind(
                'HTTP 429: model currently experiencing heavy load'), 'transient-transport')
            self.assertEqual(checkpoint.failure_kind(
                'model currently experiencing heavy load'), 'technical-error')

        def test_quota_429_takes_priority_and_blocks_another_dispatch(self):
            for message in ('HTTP 429 RESOURCE_EXHAUSTED', 'HTTP 429 quota exceeded',
                            OVERLOAD_429 + ' quota exceeded', 'HTTP 429 insufficient credit'):
                self.assertEqual(checkpoint.failure_kind(message), 'blocked-quota')
            parameters = {'phase': 'production', 'condition': 'n', 'case': 'quota'}
            dispatches = []

            def quota_refusal():
                dispatches.append('synthetic-dispatch')
                raise RuntimeError('HTTP 429 RESOURCE_EXHAUSTED quota exceeded')

            with self.assertRaises(checkpoint.QuotaBlocked):
                self.ledger.call(parameters, quota_refusal)
            self.assertTrue(self.ledger.blocked.is_set())
            self.assertEqual(self.ledger.read(parameters)['state'], 'blocked-quota')
            with self.assertRaises(checkpoint.QuotaBlocked):
                self.ledger.call({**parameters, 'condition': 'p'}, quota_refusal)
            self.assertEqual(dispatches, ['synthetic-dispatch'])

        def test_unknown_429_remains_terminal_for_the_same_harness(self):
            parameters = {'phase': 'extraction', 'case': 'unknown-429'}
            dispatches = []

            def unknown_refusal():
                dispatches.append('synthetic-dispatch')
                raise RuntimeError('HTTP 429 rate_limit_error; cause unavailable')

            self.assertEqual(checkpoint.failure_kind(
                'HTTP 429 rate_limit_error; cause unavailable'), 'technical-error')
            with self.assertRaisesRegex(RuntimeError, 'cause unavailable'):
                self.ledger.call(parameters, unknown_refusal)
            self.assertEqual(self.ledger.read(parameters)['state'], 'technical-error')
            with self.assertRaisesRegex(RuntimeError, 'TECHNICAL_FIX_REQUIRES_NEW_HARNESS_VERSION'):
                self.ledger.call(parameters, unknown_refusal)
            self.assertEqual(dispatches, ['synthetic-dispatch'])
            self.assertEqual(self.ledger.read(parameters)['attempt'], 1)

        def test_overload_resume_stops_before_a_third_attempt(self):
            parameters = {'phase': 'production', 'condition': 'baseline', 'case': 'overload'}
            dispatches = []

            def overload():
                dispatches.append('synthetic-dispatch')
                raise RuntimeError(OVERLOAD_429)

            for attempt in (1, 2):
                with self.assertRaisesRegex(RuntimeError, 'experiencing heavy load'):
                    self.ledger.call(parameters, overload)
                row = self.ledger.read(parameters)
                self.assertEqual(row['state'], 'transient-transport')
                self.assertEqual(row['attempt'], attempt)
                self.assertFalse(self.ledger.blocked.is_set())
            with self.assertRaisesRegex(RuntimeError, 'TRANSPORT_ATTEMPTS_EXHAUSTED'):
                self.ledger.call(parameters, overload)
            self.assertEqual(len(dispatches), 2)
            self.assertEqual(self.ledger.read(parameters)['attempt'], 2)
            historical_attempts = list((self.ledger.root / 'attempts').glob('*.json'))
            self.assertEqual(len(historical_attempts), 2)

    output = io.StringIO()
    result = unittest.TextTestRunner(stream=output, verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(FailureClassificationRegression))
    return {
        'schemaVersion': 'orbit-provider-failure-classification-software-qa-v1',
        'host': 'Kaggle', 'state': 'PASS' if result.wasSuccessful() else 'FAIL',
        'modelCalls': 0, 'providerRequests': 0,
        'testsRun': result.testsRun, 'failures': len(result.failures),
        'errors': len(result.errors), 'output': output.getvalue(),
        'origin': 'synthetic-software-fixtures-not-provider-results',
        'checkpointSourceSha256': hashlib.sha256(Path(checkpoint.__file__).read_bytes()).hexdigest(),
        'validationSourceSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'fullCampaignComplete': False, 'humanUnderstandingVerified': False,
    }
