"""Qualify actual Kaggle SDK scheduling without generating model responses.

This probes threads, per-row actor attribution and chat/context isolation in the
installed SDK. The resource locks are synthetic software fixtures; actual
browser/permission proof is provided separately by the native pool checks.
"""
import copy
import hashlib
import io
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest

from orbit_campaign_checkpoint import CampaignLedger, QuotaBlocked, campaign_identity, digest, evaluation_frame, require_configuration


def run_parallel_validation(config):
    if not Path('/kaggle/working').is_dir(): raise RuntimeError('KAGGLE_EXECUTION_REQUIRED')

    class ParallelBoundaries(unittest.TestCase):
        def test_final_namespaces_budget_and_model_dispatch_gates(self):
            prospective=copy.deepcopy(config)
            prospective.update({'campaignId':'orbit-kaggle-20261003-final-e1','modelDispatchAuthorized':False,
                'maxWorkers':8,'maxParallelTrajectories':8,'maxHoldRequests':2,'maxTransientAttempts':2})
            self.assertEqual(require_configuration(prospective,'E'),'0.6.1')
            with self.assertRaisesRegex(RuntimeError,'NATIVE_QUALIFICATION_REQUIRED'):
                CampaignLedger(prospective,'E')
            for key,value in [('maxWorkers',9),('maxHoldRequests',3),('maxParallelTrajectories',True)]:
                altered={**prospective,key:value}
                with self.subTest(key=key),self.assertRaisesRegex(RuntimeError,'FINAL_BUDGET'):
                    require_configuration(altered,'E')
            with self.assertRaisesRegex(RuntimeError,'NAMESPACE_OR_VERSION_UNSUPPORTED'):
                require_configuration({**prospective,'campaignId':'orbit-kaggle-20261003-final-e2'},'E')
            selected=copy.deepcopy(prospective)
            selected.update({'campaignId':'orbit-kaggle-20261003-final-d1','executableSuites':['D'],
                'contextCaseSelection':['provider']})
            selected['targets']['D']['trajectories']=12
            self.assertEqual(require_configuration(selected,'D'),'0.6.1')
            with self.assertRaisesRegex(RuntimeError,'D_CONTEXT_SNAPSHOT_ONLY'):
                require_configuration(selected,'E')
            with self.assertRaisesRegex(RuntimeError,'D_SELECTED_CONTEXT_TARGET_MISMATCH'):
                require_configuration({**selected,'contextCaseSelection':['provider','provider']},'D')

        def test_e_namespace_cannot_relabel_a_c_result(self):
            self.assertEqual(require_configuration(config,'E'),'0.6.1')
            with self.assertRaisesRegex(RuntimeError,'E_NATIVE_BOUNDARY_SNAPSHOT_ONLY'):
                require_configuration(config,'C')
            legacy=copy.deepcopy(config)
            legacy['campaignId']='orbit-kaggle-20261001-v2-sdkparams2'
            legacy['executableSuites']=['C']
            self.assertEqual(require_configuration(legacy,'C'),'0.6.1')

        def test_actual_sdk_threads_keep_actor_parameter_chat_and_slot_isolated(self):
            observations=[]; lock=threading.Lock(); barrier=threading.Barrier(8)
            slot_locks=[threading.Lock() for _ in range(8)]
            active=0; peak=0
            configuration=digest({'test':'parallel-sdk','atUnix':time.time_ns()})
            @kbench.task(name='Orbit installed SDK parallel isolation probe',store_task=False)
            def parallel_probe(llm,slot:int,expected_model:str,campaign_fingerprint:str):
                nonlocal active,peak
                from kaggle_benchmarks import contexts
                if llm.name!=expected_model: raise RuntimeError('ACTOR_ATTRIBUTION_FAILED')
                with slot_locks[slot], kbench.chats.new() as chat:
                    with lock:
                        active+=1;peak=max(peak,active)
                    barrier.wait(timeout=30)
                    if contexts.get_current().chat is not chat:
                        raise RuntimeError('CHAT_CONTEXT_ISOLATION_FAILED')
                    observed={'slot':slot,'model':llm.name,'chatIdentity':id(chat),
                              'paramIdentity':contexts.get_current().run.param_id}
                    with lock:
                        observations.append(observed);active-=1
                return {'slot':slot,'model':llm.name,'configuration':campaign_fingerprint}
            rows=[{'slot':index,'expected_model':MODELS[index%2],
                   'campaign_fingerprint':configuration} for index in range(8)]
            frame=evaluation_frame(rows,configuration,'E')
            identities=list(frame.index)
            frame['llm']=[kbench.llms[row['expected_model']] for row in rows]
            with kbench.client.enable_cache():
                runs=parallel_probe.evaluate(evaluation_data=frame,n_jobs=8,
                    on_failure='continue',max_attempts=1)
                replay=parallel_probe.evaluate(evaluation_data=frame,n_jobs=8,
                    on_failure='continue',max_attempts=1)
            self.assertFalse(list(runs.errored_runs))
            self.assertFalse(list(replay.errored_runs))
            self.assertEqual(len(runs.completed_runs),8)
            self.assertEqual([run.result['slot'] for run in runs.completed_runs],list(range(8)))
            self.assertEqual([run.result['model'] for run in runs.completed_runs],[row['expected_model'] for row in rows])
            self.assertEqual(len(observations),8,'A cache replay must not execute another task.')
            self.assertEqual(len({row['chatIdentity'] for row in observations}),8)
            self.assertEqual({row['paramIdentity'] for row in observations},set(identities))
            self.assertEqual(peak,8)

        def test_bounded_parallel_free_quota_accepts_unknown_prices_but_stops_on_consumption(self):
            with tempfile.TemporaryDirectory(prefix='orbit-e-quota-qa-',dir='/kaggle/working') as directory:
                isolated=copy.deepcopy(config)
                isolated['quotaSnapshot']=[{'name':'synthetic-test-window','limitNanodollars':10_000_000_000,
                    'usedNanodollars':0,'observedAtUnix':time.time()-1,'resetsAtUnix':None}]
                isolated['maxLotReserveNanodollars']=None
                ledger=object.__new__(CampaignLedger)
                ledger.config=isolated;ledger.suite='E';ledger.root=Path(directory)/'E';ledger.root.mkdir()
                ledger.lock=threading.RLock();ledger.dispatch_lock=threading.RLock()
                ledger.blocked=threading.Event();ledger.identity=campaign_identity(isolated)
                self.assertTrue(ledger.lot_allowed())
                self.assertIsNone(isolated['quotaSnapshot'][0]['resetsAtUnix'])
                isolated['maxParallelTrajectories']=9
                with self.assertRaisesRegex(QuotaBlocked,'CURRENT_QUOTA_AND_EXPLICIT_DISPATCH_POLICY_REQUIRED'):
                    ledger.lot_allowed()
                isolated['maxParallelTrajectories']=8
                isolated['quotaSnapshot'][0]['usedNanodollars']=8_500_000_000
                with self.assertRaisesRegex(QuotaBlocked,'NO_NEW_LOT_AT_DECLARED_QUOTA_THRESHOLD'):
                    ledger.lot_allowed()

    output=io.StringIO()
    result=unittest.TextTestRunner(stream=output,verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(ParallelBoundaries))
    return {'format':'orbit-e-sdk-parallel-qualification-v1','host':'Kaggle','modelCalls':0,
        'state':'PASS' if result.wasSuccessful() else 'FAIL','testsRun':result.testsRun,
        'failures':len(result.failures),'errors':len(result.errors),'output':output.getvalue(),
        'sdkVersion':'0.6.1','nJobsQualified':8,'browserConcurrencyQualified':False,
        'limitations':['No provider request was sent.','Synthetic slot locks do not prove browser behavior.',
                       'Unknown price and reset values remain unknown; real free-provider refusal stops dispatch.']}
