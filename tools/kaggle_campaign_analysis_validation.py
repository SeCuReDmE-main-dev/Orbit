"""Kaggle-only regression checks of actual checkpoint analysis; zero LLM calls.

All records below are synthetic software fixtures. They do not represent model
observations, human review, source relevance or educational understanding.
"""
from __future__ import annotations

import copy
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest


def run_analysis_validation():
    if not Path('/kaggle/working').is_dir():
        raise RuntimeError('KAGGLE_ANALYSIS_QA_REQUIRED')
    import analyze_kaggle_campaign_results as analysis
    from orbit_campaign_checkpoint import campaign_identity, digest

    class AnalysisRegression(unittest.TestCase):
        def setUp(self):
            self.directory=tempfile.TemporaryDirectory(prefix='orbit-analysis-qa-',dir='/kaggle/working')
            self.root=Path(self.directory.name)
            self.config={'campaignId':'orbit-analysis-software-fixture',
                         'models':['fixture-flash','fixture-pro'],
                         'origin':'software-qa-fixture-not-a-provider-run'}
            self.identity=campaign_identity(self.config)
            self.questions=[{'id':f'p{packet}-q{question}','packet':packet}
                            for packet in range(1,11) for question in range(6)]
            self.public={'questions':self.questions}
            self.gold={question['id']:{'decision':'ADMIT','modelDecision':'ADMIT'}
                       for question in self.questions if question['packet']<=6}
            self.sequence=0

        def tearDown(self):
            self.directory.cleanup()

        def parameters(self, phase='production', packet=1, condition='baseline', model='fixture-flash'):
            value={'model':model,'packet':packet,'repetition':0,'phase':phase}
            if phase in ('production','production-interpretation'):
                value['condition']=condition
            return value

        def put(self, parameters, state='completed', result=None, attempt=1, archive=None,
                configuration_sha=None, suite='C'):
            self.sequence+=1
            identity=configuration_sha or self.identity
            key=digest({'campaign':identity,'suite':suite,'parameters':parameters})
            row={'key':key,'configurationSha256':identity,'campaignId':self.config['campaignId'],
                 'suite':suite,'parameters':copy.deepcopy(parameters),'attempt':attempt,
                 'state':state,'observedAtUnix':self.sequence,'result':copy.deepcopy(result)}
            path=(self.root/'attempts'/archive if archive else self.root/(key+'.json'))
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_text(json.dumps(row),encoding='utf-8')
            return row

        def usage(self, observed=1, input_cost=1, output_cost=2):
            return {'observedAtUnix':observed,'input_tokens_cost_nanodollars':input_cost,
                    'output_tokens_cost_nanodollars':output_cost,
                    'input_tokens':None,'output_tokens':None,'total_backend_latency_ms':None}

        def analyze(self):
            return analysis.analyze_c(self.config,self.public,self.gold,self.root)

        def test_complete_campaign_keeps_pairing_packet_weights_and_real_exclusion(self):
            for model in self.config['models']:
                for packet in range(1,11):
                    answers=[{'questionId':q['id'],'decision':'ADMIT' if q['id'] in self.gold else 'HOLD'}
                             for q in self.questions if q['packet']==packet]
                    for repetition in range(3):
                        base={'model':model,'packet':packet,'repetition':repetition}
                        self.put({**base,'phase':'extraction'},result={'usage':self.usage(self.sequence+1)})
                        for condition in ('none','baseline','n','p'):
                            parameters={**base,'phase':'production','condition':condition}
                            self.put(parameters,result={'usage':self.usage(self.sequence+1)})
                            self.put({**parameters,'phase':'production-interpretation'},
                                     result={'status':'completed','answer':{'results':answers}})
                        self.put({**base,'phase':'packet'},result={'fixture':True})
            result=self.analyze()
            self.assertTrue(result['execution']['complete'])
            self.assertEqual(result['execution']['observedExtractions'],60)
            self.assertEqual(result['execution']['observedProductions'],240)
            self.assertEqual(result['referenceStatus']['realQuestionsPendingHuman'],24)
            for metric in result['metrics']:
                self.assertEqual(metric['counts']['syntheticDecisionsObserved'],108)
                self.assertEqual(metric['counts']['syntheticCorrect'],108)
                self.assertEqual(metric['counts']['realDecisionsUnscored'],72)
                self.assertEqual(metric['syntheticAccuracyObserved'],1)
            for comparison in result['pairedComparisons']:
                self.assertTrue(comparison['complete'])
                self.assertEqual(comparison['matchedSyntheticDecisions'],108)
                self.assertEqual(comparison['clusters'],6)
                self.assertEqual(comparison['meanDifference'],0)
            cost=result['observedCosts']
            self.assertEqual(cost['generations'],300)
            self.assertEqual(cost['knownSubtotalNanodollars'],900)
            self.assertEqual(cost['totalNanodollars'],900)
            self.assertEqual(cost['missingCostUnits'],0)

        def test_failed_usage_is_charged_and_failed_is_distinct_from_never_run(self):
            self.put(self.parameters(),state='transient-transport',result={'usage':self.usage(10,25,50)})
            self.put(self.parameters(condition='n'),result={'usage':self.usage(20,1000,1000)},
                     configuration_sha='0'*64)
            self.put(self.parameters(condition='p'),result={'usage':self.usage(30,1000,1000)},suite='E')
            result=self.analyze(); cost=result['observedCosts']
            self.assertEqual(cost['generations'],1)
            self.assertEqual(cost['totalNanodollars'],75)
            self.assertEqual(cost['attemptStates'],{'transient-transport':1})
            metric=next(row for row in result['metrics']
                        if row['model']=='fixture-flash' and row['condition']=='baseline')
            self.assertEqual(metric['counts']['missingProductions'],30)
            self.assertEqual(metric['counts']['failedProductions'],1)
            self.assertEqual(metric['counts']['neverRunProductions'],29)
            self.assertEqual(metric['missingProductionStates'],{'transient-transport':1,'never-run':29})
            self.assertIsNone(metric['syntheticAccuracyObserved'])
            self.assertFalse(result['execution']['complete'])

        def test_replayed_usage_is_deduplicated_but_a_new_attempt_is_chargeable(self):
            parameters=self.parameters()
            first=self.usage(100,3,4)
            self.put(parameters,state='observing',result={'usage':first},attempt=1,archive='a-observing.json')
            self.put(parameters,state='transient-transport',result={'usage':first},attempt=1,archive='b-failed.json')
            self.put(parameters,result={'usage':first},attempt=2,archive='c-restored.json')
            # A second copy of an already-completed checkpoint is not a charge.
            self.put(parameters,result={'usage':first},attempt=2,archive='d-duplicate.json')
            self.put(parameters,result={'usage':self.usage(101,5,6)},attempt=3)
            cost=self.analyze()['observedCosts']
            self.assertEqual(cost['generationAttemptRecords'],3)
            self.assertEqual(cost['generations'],2)
            self.assertEqual(cost['totalNanodollars'],18)
            self.assertEqual(cost['attemptStates'],{'transient-transport':1,'completed':2})

        def test_all_missing_costs_remain_unavailable(self):
            self.put(self.parameters(phase='extraction'),result={'usage':self.usage(1,None,None)})
            self.put(self.parameters(),state='transient-transport',result={'usage':self.usage(2,None,None)})
            cost=self.analyze()['observedCosts']
            self.assertEqual(cost['generations'],2)
            self.assertEqual(cost['generationsWithCost'],0)
            self.assertEqual(cost['generationsWithMissingCost'],2)
            self.assertEqual(cost['missingCostUnits'],4)
            self.assertIsNone(cost['knownSubtotalNanodollars'])
            self.assertIsNone(cost['knownNanodollars'])
            self.assertIsNone(cost['totalNanodollars'])

        def test_observed_zero_is_distinct_from_missing_or_partially_known_cost(self):
            self.put(self.parameters(),result={'usage':self.usage(1,0,0)})
            zero=self.analyze()['observedCosts']
            self.assertEqual(zero['totalNanodollars'],0)
            self.put(self.parameters(condition='n'),result={'usage':self.usage(2,7,None)})
            partial=self.analyze()['observedCosts']
            self.assertEqual(partial['knownSubtotalNanodollars'],7)
            self.assertEqual(partial['missingCostUnits'],1)
            self.assertIsNone(partial['totalNanodollars'])

    output=io.StringIO()
    result=unittest.TextTestRunner(stream=output,verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(AnalysisRegression))
    return {'schemaVersion':'orbit-campaign-analysis-software-qa-v1','host':'Kaggle',
            'state':'PASS' if result.wasSuccessful() else 'FAIL','modelCalls':0,
            'testsRun':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),
            'output':output.getvalue(),'origin':'synthetic-software-fixtures-not-provider-results',
            'analyzerSourceSha256':hashlib.sha256(Path(analysis.__file__).read_bytes()).hexdigest(),
            'fullCampaignComplete':False,'humanUnderstandingVerified':False}
