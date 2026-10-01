"""Guard the retrieval boundary, not just the current page examples."""
import importlib.util
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('intake',Path(__file__).with_name('prepare_real_corpus.py'))
intake=importlib.util.module_from_spec(spec);spec.loader.exec_module(intake)

class IntakeBoundary(unittest.TestCase):
    def test_multiline_title_is_not_lost(self):
        raw='# First\nURL: https://example.invalid/a\n\nA passage.\n# Second\n  Extra title furniture\n\nURL: https://example.invalid/b\n\nB passage.'
        pages=dict(intake.split_pages(raw))
        self.assertEqual(len(pages),2)
        self.assertIn('B passage.',pages['https://example.invalid/b'])
        self.assertNotIn('B passage.',pages['https://example.invalid/a'])
    def test_duplicate_url_is_not_an_independent_page(self):
        raw='# Paper\nURL: https://example.invalid/a\n\nURL: https://example.invalid/a\nProof.\n# Next\nURL: https://example.invalid/b\nOther.'
        pages=intake.split_pages(raw)
        self.assertEqual(len(pages),2)
        self.assertIn('Proof.',pages[0][1])
    def test_failure_does_not_pollute_previous_snapshot(self):
        raw='# Paper\nURL: https://example.invalid/a\nEvidence.\nError fetching https://example.invalid/b: CRAWL_NOT_FOUND'
        self.assertNotIn('CRAWL_NOT_FOUND',intake.split_pages(raw)[0][1])
    def test_missing_header_is_refused(self):
        with self.assertRaises(RuntimeError):intake.split_pages('URL: https://example.invalid/a\nUnattributed.')

if __name__=='__main__':unittest.main()
