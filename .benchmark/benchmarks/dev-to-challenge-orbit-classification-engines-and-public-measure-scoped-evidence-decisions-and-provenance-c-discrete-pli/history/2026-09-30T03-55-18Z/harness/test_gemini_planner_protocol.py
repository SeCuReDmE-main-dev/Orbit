import importlib.util
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('planner',Path(__file__).with_name('gemini-webmcp-loop.py'))
planner=importlib.util.module_from_spec(spec);spec.loader.exec_module(planner)

class PlannerBoundary(unittest.TestCase):
    def test_batched_requests_retain_model_order(self):
        a=planner.parse_actions('{"type":"tool_call","name":"a","arguments":{}}\n{"type":"tool_call","name":"b","arguments":{}}')
        self.assertEqual([x['name'] for x in a],['a','b'])
    def test_premature_final_is_refused(self):
        with self.assertRaises(ValueError):planner.parse_actions('{"type":"tool_call"}\n{"type":"final","answer":{"claimed":"success"}}')
    def test_surrounding_narrative_is_not_executable(self):
        with self.assertRaises(ValueError):planner.parse_actions('I executed it: {"type":"tool_call"}')
    def test_maximum_batch_is_bounded(self):
        with self.assertRaises(ValueError):planner.parse_actions('\n'.join(['{"type":"tool_call"}']*21))
    def test_final_alone_is_data(self):
        self.assertEqual(planner.parse_actions('{"type":"final","answer":{"state":"unknown"}}')[0]['answer']['state'],'unknown')

class ContextCitationBoundary(unittest.TestCase):
    def setUp(self):
        self.calls=[{'name':'orbit_sanity_initial_context','arguments':{},'result':{'state':'READY','content':[{'type':'text','text':'policies/privacy [core]'}]}},
            {'name':'orbit_sanity_read_entries','arguments':{'paths':['policies/privacy']},'result':{'state':'READY','content':[{'type':'text','text':'Background stores data for ten minutes. Source: https://example.org/privacy'}]}}]
        claim={'statement':'Background retains data.','entryPath':'policies/privacy','quote':'Background stores data for ten minutes.',
            'sourceUrls':['https://example.org/privacy'],'scope':{'provider':'example','product':'API','mode':'background'},'decision':'supported'}
        self.answer={'claims':[claim,dict(claim)]}
    def test_observed_quotes_do_not_imply_semantic_or_human_review(self):
        result=planner.check_context_answer(self.calls,self.answer)
        self.assertTrue(result['observableChecksPassed'])
        self.assertEqual(result['semanticRelevance'],'not-scored')
        self.assertFalse(result['sourceOriginalVerification'])
        self.assertFalse(result['humanReview'])
    def test_claim_cannot_borrow_quote_from_another_entry(self):
        self.answer['claims'][1]['entryPath']='other/path'
        self.assertFalse(planner.check_context_answer(self.calls,self.answer)['observableChecksPassed'])
    def test_unread_url_and_missing_scope_are_refused(self):
        self.answer['claims'][1]['sourceUrls']=['https://unread.example/']
        self.answer['claims'][1]['scope'].pop('mode')
        result=planner.check_context_answer(self.calls,self.answer)
        self.assertFalse(result['observableChecksPassed'])
        self.assertFalse(result['citationChecks'][1]['scopeComplete'])
    def test_guessed_path_not_in_outline_is_not_accepted(self):
        self.calls[0]['result']['content'][0]['text']='other/path [core]'
        self.assertFalse(planner.check_context_answer(self.calls,self.answer)['observableChecksPassed'])
    def test_combined_entries_do_not_establish_per_entry_citation(self):
        self.calls[1]['arguments']['paths'].append('other/path')
        self.assertFalse(planner.check_context_answer(self.calls,self.answer)['observableChecksPassed'])

if __name__=='__main__':unittest.main()
