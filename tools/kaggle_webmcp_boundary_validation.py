"""Kaggle-only regression checks; no model calls or manufactured human approval.

The callback tests execute the actual campaign callback with an explicitly
synthetic transport spy. The start test uses the real owned E2B native worker.
Neither kind is a semantic benchmark or a demonstration of learner understanding.
"""
from __future__ import annotations

import ast
import copy
import hashlib
import io
import json
from pathlib import Path
import time
import unittest


def campaign_callback(source: str, mission='W05'):
    """Extract only the actual nested callback; never import or dispatch an LLM."""
    module = ast.parse(source)
    parent = next(node for node in module.body
                  if isinstance(node, ast.FunctionDef) and node.name == 'native_mission')
    callback = next(node for node in ast.walk(parent)
                    if isinstance(node, ast.FunctionDef) and node.name == 'call_orbit_tool')
    discovery = next(node for node in ast.walk(parent)
                    if isinstance(node, ast.FunctionDef) and node.name == 'discover_orbit_tools')
    wrapper = ast.parse('''
def make_callback(mission):
    count = 0
    dispatched = 0
    hold_requests = 0
    agent_tool_attempts = 0
    discovery_calls = 0
    started = time.time()
    current_role = 'investigation'
    names = {'orbit_resolve_hold', 'orbit_get_capabilities', 'orbit_present_research'}
    worker = {'kind': 'synthetic-transport-spy'}
    parameters = {'mission': mission, 'origin': 'software-qa-fixture'}
    trace = []
    result = {'trace': trace}
    bridge_calls = []
    observations = []
    class LedgerSpy:
        def write(self, parameters, state, result):
            observations.append(copy.deepcopy(result))
    LEDGER = LedgerSpy()
    def bridge(worker, path, body):
        bridge_calls.append(copy.deepcopy({'path': path, 'body': body}))
        if path == '/discover': return {'tools': [{'name': name} for name in sorted(names)], 'origin': 'synthetic-transport-spy-not-a-native-execution'}
        return {'calls': len(bridge_calls), 'result': {'state': 'READY'},
                'origin': 'synthetic-transport-spy-not-a-native-execution'}
''')
    factory = wrapper.body[0]
    factory.body.append(copy.deepcopy(callback))
    factory.body.append(copy.deepcopy(discovery))
    factory.body.extend(ast.parse('''
def snapshot():
    return {'nativeCallAttempts': count, 'dispatchAttempts': dispatched,
            'holdRequestsDispatched': hold_requests, 'agentToolAttempts': agent_tool_attempts,
            'discoveryAttempts': discovery_calls, 'trace': trace}
return call_orbit_tool, snapshot, bridge_calls, observations, discover_orbit_tools
''').body)
    ast.fix_missing_locations(wrapper)
    namespace = {'json': json, 'time': time, 'copy': copy}
    exec(compile(wrapper, '<actual-campaign-callback-software-qa>', 'exec'), namespace)
    return namespace['make_callback'](mission)


def callback_checks(campaign_source: str) -> dict:
    class CallbackBoundaries(unittest.TestCase):
        def test_third_hold_request_is_traced_without_transport_dispatch(self):
            invoke, snapshot, calls, observations, _ = campaign_callback(campaign_source)
            self.assertEqual(invoke('orbit_resolve_hold', '{}')['result']['state'], 'READY')
            self.assertEqual(invoke('orbit_resolve_hold', '{}')['result']['state'], 'READY')
            self.assertEqual(invoke('orbit_resolve_hold', '{}'), {'error': 'HOLD_REQUEST_BUDGET_EXCEEDED'})
            state = snapshot()
            self.assertEqual(len(calls), 2)
            self.assertEqual(state['dispatchAttempts'], 2)
            self.assertEqual(state['holdRequestsDispatched'], 2)
            self.assertEqual(state['nativeCallAttempts'], 3)
            self.assertEqual(len(state['trace']), 3)
            self.assertFalse(state['trace'][-1]['dispatched'])
            self.assertEqual(state['trace'][-1]['number'], 3)
            self.assertEqual(observations[-1]['trace'][-1]['output']['error'], 'HOLD_REQUEST_BUDGET_EXCEEDED')

        def test_invalid_arguments_do_not_consume_a_dispatched_hold_request(self):
            invoke, snapshot, calls, _, _ = campaign_callback(campaign_source)
            self.assertEqual(invoke('orbit_resolve_hold', '{'), {'error': 'INVALID_JSON'})
            self.assertEqual(invoke('orbit_resolve_hold', '[]'), {'error': 'OBJECT_REQUIRED'})
            invoke('orbit_resolve_hold', '{}')
            invoke('orbit_resolve_hold', '{}')
            self.assertEqual(snapshot()['holdRequestsDispatched'], 2)
            self.assertEqual(len(calls), 2)
            self.assertEqual(len(snapshot()['trace']), 4)

        def test_total_native_dispatch_budget_is_preserved(self):
            invoke, snapshot, calls, _, _ = campaign_callback(campaign_source)
            for _ in range(20):
                invoke('orbit_get_capabilities', '{}')
            self.assertEqual(invoke('orbit_get_capabilities', '{}'), {'error': 'MISSION_BOUND_EXCEEDED'})
            self.assertEqual(len(calls), 20)
            self.assertEqual(snapshot()['dispatchAttempts'], 20)
            self.assertEqual(snapshot()['nativeCallAttempts'], 21)

        def test_read_only_role_still_cannot_deposit(self):
            invoke, snapshot, calls, _, _ = campaign_callback(campaign_source, 'W06')
            self.assertEqual(invoke('orbit_present_research', '{}'), {'error': 'COORDINATOR_ONLY'})
            self.assertEqual(calls, [])
            self.assertEqual(snapshot()['dispatchAttempts'], 0)

        def test_discovery_and_invalid_calls_share_one_twenty_attempt_budget(self):
            invoke, snapshot, calls, observations, discover = campaign_callback(campaign_source)
            discover()
            self.assertEqual(invoke('orbit_resolve_hold', '{'), {'error': 'INVALID_JSON'})
            for _ in range(18): invoke('orbit_get_capabilities', '{}')
            self.assertEqual(snapshot()['agentToolAttempts'],20)
            self.assertEqual(len(calls),19)
            self.assertEqual(discover(),{'error':'MISSION_BOUND_EXCEEDED'})
            self.assertEqual(len(calls),19)
            self.assertEqual(snapshot()['agentToolAttempts'],21)
            self.assertEqual(snapshot()['discoveryAttempts'],2)
            self.assertEqual(observations[-1]['trace'][-1]['output']['error'],'MISSION_BOUND_EXCEEDED')

        def test_discovery_only_is_bounded_before_transport(self):
            _, snapshot, calls, _, discover = campaign_callback(campaign_source)
            for _ in range(20): discover()
            self.assertEqual(discover(),{'error':'MISSION_BOUND_EXCEEDED'})
            self.assertEqual(len(calls),20)
            self.assertEqual(snapshot()['agentToolAttempts'],21)

    output = io.StringIO()
    result = unittest.TextTestRunner(stream=output, verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(CallbackBoundaries))
    return {'state': 'PASS' if result.wasSuccessful() else 'FAIL',
            'scope': 'actual callback with synthetic transport spy; not native-tool proof',
            'testsRun': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors),
            'output': output.getvalue(), 'campaignSourceSha256': hashlib.sha256(campaign_source.encode()).hexdigest(),
            'campaignSourceByteScope': 'UTF-8 encoding of the supplied source text'}


def rejected_start_checks(worker: dict, config: dict, bridge) -> dict:
    """Exercise failed-start isolation in the real owned native E2B worker."""
    rows = []
    failed = None

    def check(name, passed, observation):
        rows.append({'name': name, 'passed': bool(passed), 'observation': observation})
        if not passed:
            raise RuntimeError('NATIVE_START_BOUNDARY_FAILED:' + name)

    setup = {'engine': 'baseline', 'configuration': 'original10', 'scenario': 'preflight',
             'read': False, 'write': False, 'expectedReleaseId': config['releaseId'],
             'expectedReleaseSha256': config['releaseManifestSha256']}

    def pinned_native(response):
        return (response.get('native') is True and response.get('registeredToolCount') == 15
                and response.get('exposedToolCount') == 10
                and response.get('releaseId') == setup['expectedReleaseId']
                and response.get('releaseSha256') == setup['expectedReleaseSha256'])

    def native_observation(response):
        return {key: response.get(key) for key in
                ['native', 'registeredToolCount', 'exposedToolCount', 'releaseId', 'releaseSha256']}

    try:
        ready = bridge(worker, '/start', setup)
        check('correct-release-native-start', pinned_native(ready), native_observation(ready))
        bad_digest = '0' * 64 if setup['expectedReleaseSha256'] != '0' * 64 else '1' * 64
        rejected = bridge(worker, '/start', {**setup, 'expectedReleaseSha256': bad_digest})
        check('wrong-fingerprint-start-refused', rejected.get('error') == 'PUBLIC_RELEASE_FINGERPRINT_MISMATCH', rejected)
        discovery = bridge(worker, '/discover', {})
        check('rejected-start-cannot-discover-old-registry', discovery.get('httpStatus') == 410 and 'tools' not in discovery, discovery)
        invoked = bridge(worker, '/call', {'name': 'orbit_get_capabilities', 'arguments': {}})
        check('rejected-start-cannot-invoke-old-tool', invoked.get('httpStatus') == 410 and 'result' not in invoked, invoked)
        restarted = bridge(worker, '/start', setup)
        check('correct-start-recovers-after-refusal', pinned_native(restarted), native_observation(restarted))
    except Exception as error:
        # Preserve the already-observed checks without exporting exception
        # URLs, headers or private transport details.
        failed = type(error).__name__
    finally:
        closed = bridge(worker, '/stop', {})
        rows.append({'name': 'owned-profile-closed', 'passed': closed.get('state') == 'closed', 'observation': closed})
    return {'state': 'PASS' if failed is None and all(row['passed'] for row in rows) else 'FAIL', 'checks': rows,
            'errorType': failed,
            'transport': 'Kaggle to actual owned E2B native browser', 'modelCalls': 0,
            'humanApprovalFabricated': False}


def run_boundary_validation(campaign_source: str, worker: dict, config: dict, bridge) -> dict:
    if not Path('/kaggle/working').is_dir():
        raise RuntimeError('KAGGLE_EXECUTION_REQUIRED')
    callback = callback_checks(campaign_source)
    if callback['state'] != 'PASS':
        return {'schemaVersion': 'orbit-webmcp-campaign-boundary-qa-v1', 'state': 'FAIL',
                'host': 'Kaggle', 'callback': callback,
                'nativeStart': {'state': 'NOT_RUN', 'reason': 'CALLBACK_CHECKS_FAILED'},
                'modelCalls': 0, 'fullMissionComplete': False}
    native = rejected_start_checks(worker, config, bridge)
    return {'schemaVersion': 'orbit-webmcp-campaign-boundary-qa-v1',
            'state': 'PASS' if native['state'] == 'PASS' else 'FAIL',
            'host': 'Kaggle', 'callback': callback, 'nativeStart': native,
            'modelCalls': 0, 'fullMissionComplete': False}
