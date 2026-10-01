"""Software validation for Kaggle only; no model/API/resource calls.

This file is appended after the shared-engine runner in a private validation
notebook. Source/reference inputs remain mounted privately, never embedded.
"""
import copy
import inspect
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest

from orbit_campaign_checkpoint import CampaignLedger, QuotaBlocked, campaign_identity, digest, evaluation_frame, failure_kind, public_observation, require_configuration, verify_scoped_views


class HarnessValidation(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory(prefix='orbit-harness-v2-',dir='/kaggle/working')
        self.config=copy.deepcopy(RUN_CONFIG)
        self.config['quotaSnapshot']=[{'name':'synthetic-test-window','limitNanodollars':10_000_000_000,
            'usedNanodollars':0,'observedAtUnix':time.time()-1,'resetsAtUnix':None}]
        self.config['maxLotReserveNanodollars']=None
        self.config['quotaPolicy']['unknownPricingStrategy']='serial-provider-free-quota'
        self.config['quotaPolicy']['maxSnapshotAgeSeconds']=3600
        self.config['resumeDatasetDir']=None
        # Test-only ledgers do not share campaign paths or impersonate account
        # quota observations. Runtime host/SDK checks precede this test class.
        self.ledger=object.__new__(CampaignLedger)
        self.ledger.config=self.config;self.ledger.suite='C'
        self.ledger.root=Path(self.directory.name)/'C';self.ledger.root.mkdir()
        self.ledger.lock=threading.RLock();self.ledger.dispatch_lock=threading.RLock()
        self.ledger.blocked=threading.Event();self.ledger.identity=campaign_identity(self.config)

    def tearDown(self):
        self.directory.cleanup()

    def observation(self,cost=None):
        return {'raw':'observable-output','usage':{'observedAtUnix':time.time(),
            'input_tokens':None,'output_tokens':None,'input_tokens_cost_nanodollars':cost,
            'output_tokens_cost_nanodollars':0 if cost is not None else None,'total_backend_latency_ms':None}}

    def test_real_corpus_originals_and_mapped_spans(self):
        result=verify_scoped_views(PUBLIC,ORIGINAL_ACCESS,RUN_CONFIG['inputCorpusDir'])
        self.assertEqual(result['originalsVerified'],48)
        self.assertEqual(len(PUBLIC['questions']),60)

    def test_gap_markers_are_not_source_passages(self):
        document={'text':'abc[GAP]xyz','originalSnapshotSha256':'a'*64,'excerptMap':[
            {'inputStartCharacter':0,'inputEndCharacter':3,'originalStartCharacter':0},
            {'inputStartCharacter':8,'inputEndCharacter':11,'originalStartCharacter':50}]}
        self.assertEqual(quote_location(document,'xyz')['originalStartCharacter'],50)
        self.assertIsNone(quote_location(document,'c[GAP]x'))
        self.assertIsNone(quote_location(document,'[GAP]'))
        self.assertIsNone(quote_location(document,''))

    def test_altered_source_map_is_refused(self):
        corrupted=copy.deepcopy(PUBLIC)
        real=next(document for document in corrupted['documents'] if document.get('excerptMap'))
        real['excerptMap'][0]['sha256']='0'*64
        with self.assertRaisesRegex(RuntimeError,'SCOPED_VIEW_CONTENT_MISMATCH'):
            verify_scoped_views(corrupted,ORIGINAL_ACCESS,RUN_CONFIG['inputCorpusDir'])

    def test_unsafe_original_reference_is_refused(self):
        access=copy.deepcopy(ORIGINAL_ACCESS);access['records'][0]['snapshotPath']='../../outside.txt'
        with self.assertRaisesRegex(RuntimeError,'UNSAFE_ORIGINAL_PATH'):
            verify_scoped_views(PUBLIC,access,RUN_CONFIG['inputCorpusDir'])

    def test_first_free_prompt_requires_no_invented_price_or_reset(self):
        self.assertTrue(self.ledger.lot_allowed())
        self.assertIsNone(self.config['quotaSnapshot'][0]['resetsAtUnix'])
        self.assertIsNone(self.config['maxLotReserveNanodollars'])
        result=self.ledger.call({'phase':'extraction','testCase':1},lambda:self.observation())
        self.assertIsNone(result['usage']['input_tokens_cost_nanodollars'])
        self.assertTrue(self.ledger.lot_allowed())

    def test_live_sdk_output_bound_is_supported_without_model_dispatch(self):
        # Inspect the actual Kaggle SDK/client transport, without sending a
        # request. Its OpenAI completion interface rejected max_output_tokens
        # in the first real dispatch; provider parameters must fit that client.
        from kaggle_benchmarks.tools.native import native_tool_agent
        native_parameters=inspect.signature(native_tool_agent).parameters
        self.assertIn('max_tool_rounds',native_parameters)
        # The corrected campaign is a new explicit identity. All three suite
        # gates must accept that version while rejecting unfrozen snapshots
        # and unknown identities; no campaign can bypass the release gate.
        corrected=copy.deepcopy(self.config)
        corrected['campaignId']='orbit-kaggle-20261001-v2-sdkparams2'
        corrected['format']='orbit-kaggle-campaign-v2'
        corrected['frozen']=True
        corrected['executableSuites']=['C','D','E']
        for suite in ('C','D','E'):
            self.assertEqual(require_configuration(corrected,suite),corrected['sdkVersion'])
        unknown=copy.deepcopy(corrected);unknown['campaignId']+='-unknown'
        with self.assertRaisesRegex(RuntimeError,'CAMPAIGN_NAMESPACE_OR_VERSION_UNSUPPORTED'):
            require_configuration(unknown,'C')
        unknown=copy.deepcopy(corrected);unknown['format']='orbit-kaggle-campaign-v3'
        with self.assertRaisesRegex(RuntimeError,'CAMPAIGN_NAMESPACE_OR_VERSION_UNSUPPORTED'):
            require_configuration(unknown,'C')
        unfrozen=copy.deepcopy(corrected);unfrozen['frozen']=False
        with self.assertRaisesRegex(RuntimeError,'CAMPAIGN_MANIFEST_NOT_FROZEN'):
            require_configuration(unfrozen,'C')
        with self.assertRaisesRegex(RuntimeError,'CAMPAIGN_SUITE_UNSUPPORTED'):
            require_configuration(corrected,'unknown')
        for model in MODELS:
            llm=kbench.llms[model]
            client_parameters=inspect.signature(llm.client.chat.completions.create).parameters
            self.assertIn('max_tokens',client_parameters,model)
            self.assertNotIn('max_output_tokens',client_parameters,model)
        class ObservingLLM:
            def prompt(inner,prompt,**kwargs):
                self.assertEqual(kwargs['extra_api_params'],{'max_tokens':4096})
                self.assertEqual(kwargs['reasoning'],'medium')
                return 'observable-response-without-provider-call'
        global LEDGER
        saved_ledger=LEDGER
        try:
            LEDGER=self.ledger
            observed=recorded_prompt(ObservingLLM(),{'phase':'extraction','testCase':'sdk-bound'},'contract probe')
            self.assertEqual(observed['raw'],'observable-response-without-provider-call')
        finally:
            LEDGER=saved_ledger

    def test_actual_sdk_cache_distinguishes_parameters_and_replays_only_same_row(self):
        # Execute the installed SDK scheduler with a task that never calls a
        # model. Fresh one-row DataFrames must not all share Run.param_id zero.
        executions=[]
        @kbench.task(name='Orbit SDK parameter identity validation',store_task=False)
        def identity_probe(llm,packet:int,repetition:int,campaign_fingerprint:str)->dict:
            executions.append(packet)
            return {'packet':packet,'repetition':repetition,'configuration':campaign_fingerprint}
        configuration=digest({'testDirectory':self.directory.name})
        rows=[{'packet':packet,'repetition':0,'campaign_fingerprint':configuration} for packet in (1,2)]
        frames=[evaluation_frame([row],configuration,'C',MODELS[0]) for row in rows]
        self.assertNotEqual(frames[0].index[0],frames[1].index[0])
        self.assertEqual(frames[0].index[0],evaluation_frame([rows[0]],configuration,'C',MODELS[0]).index[0])
        with kbench.client.enable_cache():
            observed=[identity_probe.evaluate(llm=[kbench.llms[MODELS[0]]],evaluation_data=frame,
                       on_failure='continue',max_attempts=1) for frame in frames]
            replay=identity_probe.evaluate(llm=[kbench.llms[MODELS[0]]],evaluation_data=frames[0],
                       on_failure='continue',max_attempts=1)
        for runs,packet in zip(observed,(1,2)):
            self.assertFalse(list(runs.errored_runs))
            self.assertEqual(len(runs.completed_runs),1)
            self.assertEqual(list(runs.completed_runs)[0].result['packet'],packet)
        self.assertEqual(list(replay.completed_runs)[0].result['packet'],1)
        self.assertEqual(executions,[1,2])
        with self.assertRaisesRegex(RuntimeError,'DUPLICATE_EVALUATION_PARAMETER_IDENTITY'):
            evaluation_frame([rows[0],rows[0]],configuration,'C',MODELS[0])

    def test_historical_campaign_observations_are_preserved_but_not_pooled(self):
        self.ledger.write({'phase':'extraction','packet':1},'completed',result=self.observation(100))
        foreign={'state':'completed','configurationSha256':'0'*64,'parameters':{'phase':'packet'},
                 'result':{'historical':True}}
        (self.ledger.root/'foreign-historical.json').write_text(json.dumps(foreign))
        self.assertEqual(len(self.ledger.rows()),1)
        self.assertEqual(self.ledger.accounting()['states'],{'completed':1})
        self.assertEqual(self.ledger.accounting()['historicalStatesNotPooled'],{'completed':1})
        self.assertTrue((self.ledger.root/'foreign-historical.json').exists())

    def test_expired_quota_observation_stops_dispatch(self):
        self.config['quotaSnapshot'][0]['observedAtUnix']=time.time()-3601
        with self.assertRaisesRegex(QuotaBlocked,'QUOTA_SNAPSHOT_INVALID_OR_EXPIRED'):
            self.ledger.lot_allowed()

    def test_known_consumption_stops_before_new_dispatch(self):
        self.config['quotaSnapshot'][0]['usedNanodollars']=8_500_000_000
        with self.assertRaisesRegex(QuotaBlocked,'NO_NEW_LOT_AT_DECLARED_QUOTA_THRESHOLD'):
            self.ledger.lot_allowed()

    def test_provider_quota_refusal_pauses_without_fallback(self):
        parameters={'phase':'production','condition':'n','testCase':2}
        def refuse(): raise RuntimeError('RESOURCE_EXHAUSTED quota')
        with self.assertRaises(QuotaBlocked):self.ledger.call(parameters,refuse)
        self.assertTrue(self.ledger.blocked.is_set())
        self.assertEqual(self.ledger.read(parameters)['state'],'blocked-quota')
        self.assertEqual(failure_kind('max_tool_rounds reached'),'sdk-round-limit')

    def test_completed_generations_resume_independently(self):
        phases=[{'phase':'extraction'}]+[{'phase':'production','condition':name} for name in ('none','baseline','n','p')]
        calls=[]
        for parameters in phases:
            self.ledger.call(parameters,lambda:calls.append(1) or self.observation(100))
        for parameters in phases:
            self.ledger.call(parameters,lambda:self.fail('A completed observation must not be regenerated.'))
        self.assertEqual(len(calls),5)
        self.assertEqual(self.ledger.accounting()['states']['completed'],5)

    def test_historical_usage_is_retained_once_after_restart(self):
        parameters={'phase':'production','condition':'baseline','testCase':3}
        self.ledger.write(parameters,'running')
        self.ledger.write(parameters,'observing',result=self.observation(5_000_000_000))
        self.ledger.write(parameters,'transient-transport',error={'message':'simulated timeout'})
        self.ledger.write(parameters,'running')
        self.ledger.write(parameters,'completed',result=self.observation(100))
        # If archive/current duplicates are charged twice, this 50% observation
        # falsely crosses the guard. If history is dropped, the next assertion
        # with another 40% observation falsely stays below it.
        self.assertTrue(self.ledger.lot_allowed())
        self.ledger.write({'phase':'extraction','testCase':4},'completed',result=self.observation(4_000_000_000))
        with self.assertRaises(QuotaBlocked):self.ledger.lot_allowed()

    def test_sdk_concurrency_cannot_overlap_prompt_dispatch(self):
        active=0;peak=0;errors=[];counter_lock=threading.Lock()
        def callback():
            nonlocal active,peak
            with counter_lock:active+=1;peak=max(peak,active)
            time.sleep(0.01)
            with counter_lock:active-=1
            return self.observation(100)
        def run(index):
            try:self.ledger.call({'phase':'extraction','testCase':index},callback)
            except Exception as error:errors.append(type(error).__name__)
        workers=[threading.Thread(target=run,args=(index,)) for index in range(4)]
        for worker in workers:worker.start()
        for worker in workers:worker.join()
        self.assertFalse(errors);self.assertEqual(peak,1)

    def test_secret_fields_and_private_reasoning_are_not_archived(self):
        observed=public_observation({'token':'synthetic-secret','controlToken':'synthetic-control',
            'reasoning_trace':'not-observable','call':{'name':'orbit_get_capabilities','arguments':{}},
            'url':'https://example.invalid/?token=synthetic-secret'})
        self.assertNotIn('token',observed);self.assertNotIn('controlToken',observed)
        self.assertNotIn('reasoning_trace',observed)
        self.assertEqual(observed['call']['name'],'orbit_get_capabilities')
        self.assertNotIn('synthetic-secret',observed['url'])

    def test_resume_rejects_untrusted_directory_and_modified_archive(self):
        self.config['resumeDatasetDir']=self.directory.name
        with self.assertRaisesRegex(RuntimeError,'RESUME_INPUT_MUST_BE_KAGGLE_DATASET'):
            self.ledger.restore()
        self.config['resumeDatasetDir']=RUN_CONFIG['inputCorpusDir']
        self.config['resumeArchives']={'private-original-access.json':'0'*64}
        with self.assertRaisesRegex(RuntimeError,'RESUME_ARCHIVE_DIGEST_MISMATCH'):
            self.ledger.restore()


def run_software_validation():
    if not Path('/kaggle/working').is_dir():raise RuntimeError('KAGGLE_EXECUTION_REQUIRED')
    loader=unittest.defaultTestLoader
    result=unittest.TextTestRunner(verbosity=2).run(loader.loadTestsFromTestCase(HarnessValidation))
    receipt={'format':'orbit-campaign-v2-software-validation','host':'Kaggle',
        'modelCalls':0,'harnessTestsRun':result.testsRun,'harnessFailures':len(result.failures),
        'harnessErrors':len(result.errors),'sourceSha256':SOURCE_SHA256,
        'references':'36-synthetic-scored-24-real-invariants-only-no-semantic-gold',
        'corpusSha256':RUN_CONFIG['corpusSha256'],'harnessSha256':RUN_CONFIG['harnessSha256']}
    if result.wasSuccessful():
        RESULTS.mkdir(parents=True,exist_ok=True)
        deterministic_suite()
        receipt['deterministicStatus']=json.loads((RESULTS/'suite-b-status.json').read_text())
    target=Path('/kaggle/working/orbit-campaign-v2-software-validation.json')
    target.write_text(json.dumps(receipt,indent=2),encoding='utf-8')
    print(json.dumps(receipt))
    if not result.wasSuccessful():raise RuntimeError('CLOUD_HARNESS_VALIDATION_FAILED')
    return receipt
