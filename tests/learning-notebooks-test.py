"""Kaggle-only validation of source notebooks, actual exports and assembly.

The HTML browser output and a Google free-account Colab run need separate observed QA.
"""
from pathlib import Path
import hashlib
import importlib.util
import io
import json
import os
import sys
import tempfile
import types
import unittest
import zipfile
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/learning/orbit-formation'
spec = importlib.util.spec_from_file_location('orbit_learning_merge', BASE / 'assembly/merge_modules.py')
merge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(merge)


def source(cell):
    return ''.join(cell['source']) if isinstance(cell['source'], list) else cell['source']


def exported(number, mutation=''):
    notebook = json.loads((BASE / f'notebooks/module-{number}.ipynb').read_text(encoding='utf-8'))
    namespace = {'__name__': 'notebook_export', 'hashlib': hashlib, 'io': io, 'json': json,
                 'Path': Path, 're': __import__('re'), 'time': __import__('time'), 'zipfile': zipfile}
    namespace.update(MODULE_ID=number, MISSION_ID=f'module-{number}', parameters={'initial': 'kept', 'test': 'modified'},
                     reflection={'prediction': 'Je prédis une différence.', 'observations': ['Je constate une différence limitée.'],
                                 'explanation': 'Une seule donnée est modifiée.', 'assistance': 'Assistant : piste; vérification personnelle.',
                                 'limitations': 'Rendu client non certifié.', 'openQuestion': 'Comment transférer ?'})
    exec(source(notebook['cells'][5]), namespace)
    exec(source(notebook['cells'][6]), namespace)
    target = next(name for name in namespace['student_files'] if name.endswith('.js'))
    namespace['student_files'][target] += mutation
    google = types.ModuleType('google'); colab = types.ModuleType('google.colab'); downloads = []
    colab.files = types.SimpleNamespace(download=lambda name: downloads.append(name))
    google.colab = colab
    old = Path.cwd()
    with tempfile.TemporaryDirectory() as folder:
        try:
            os.chdir(folder)
            with patch.dict(sys.modules, {'google': google, 'google.colab': colab}):
                exec(source(notebook['cells'][10]), namespace)
            data = Path(downloads[0]).read_bytes()
        finally:
            os.chdir(old)
    return data, namespace['student_files']


class LearningNotebookValidation(unittest.TestCase):
    def test_eight_student_notebooks_and_separate_instructor_copies(self):
        for number in range(1, 9):
            student = json.loads((BASE / f'notebooks/module-{number}.ipynb').read_text(encoding='utf-8'))
            corrected = json.loads((BASE / f'notebooks/instructor/module-{number}.ipynb').read_text(encoding='utf-8'))
            self.assertEqual(student['nbformat'], 4)
            self.assertEqual(student['metadata']['orbit']['minutes'], 30)
            self.assertEqual(student['metadata']['orbit']['audience'], 'student')
            self.assertEqual(corrected['metadata']['orbit']['audience'], 'instructor')
            self.assertNotIn('accelerator', student['metadata'])
            for cell in student['cells'] + corrected['cells']:
                if cell['cell_type'] == 'code':
                    compile(source(cell), '<notebook-cell>', 'exec')
                    self.assertIsNone(cell['execution_count'])
                    self.assertEqual(cell['outputs'], [])

    def test_source_manifests_are_faithful(self):
        manifest = json.loads((BASE / 'notebooks/manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(len(manifest['files']), 16)
        for item in manifest['files']:
            self.assertEqual(hashlib.sha256((BASE / item['path']).read_bytes()).hexdigest(), item['sha256'])

    def test_prediction_precedes_preview_and_no_installer_or_model_call(self):
        for number in range(1, 9):
            notebook = json.loads((BASE / f'notebooks/module-{number}.ipynb').read_text(encoding='utf-8'))
            text = '\n'.join(source(cell) for cell in notebook['cells'])
            self.assertIn("if not reflection['prediction'].strip()", source(notebook['cells'][7]))
            for forbidden in ['!pip ', 'pip install', '!npm ', 'api_key=', 'E2B_API_KEY', 'KAGGLE_API_TOKEN', 'requests.post(', 'openai.', 'genai.']:
                self.assertNotIn(forbidden, text)

    def test_export_uses_the_actual_modified_code(self):
        data, student = exported(4, '\n// UNIQUE-STUDENT-MODIFICATION\n')
        number, files, result = merge.load_module(data)
        self.assertEqual(number, 4)
        self.assertIn(b'UNIQUE-STUDENT-MODIFICATION', files['frontend/inertia.js'])
        self.assertEqual(files['frontend/inertia.js'].decode('utf-8'), student['inertia.js'])
        self.assertEqual(result['status'], 'external-declared')
        self.assertFalse(result['verification']['humanApproval'])
        replay = json.loads(files['notebook.ipynb'])
        self.assertIn('UNIQUE-STUDENT-MODIFICATION', source(replay['cells'][1]))
        for cell in replay['cells']:
            if cell['cell_type'] == 'code':
                compile(source(cell), '<captured-notebook>', 'exec')

    def test_export_is_stored_zip_for_the_browser_import(self):
        data, _ = exported(1)
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            self.assertTrue(all(info.compress_type == zipfile.ZIP_STORED for info in archive.infolist()))

    def test_assembly_uses_eight_actual_student_exports(self):
        archives = [exported(number, f'\n// MY-MODULE-{number}\n')[0] for number in range(1, 9)]
        scaffold = {path.relative_to(BASE / 'assembly').as_posix(): path.read_bytes()
                    for path in (BASE / 'assembly').rglob('*') if path.is_file() and path.name != 'merge_modules.py' and '__pycache__' not in path.parts}
        assembled = merge.assemble(archives, scaffold)
        with zipfile.ZipFile(io.BytesIO(assembled)) as archive:
            for number in range(1, 9):
                name = next(name for name in merge.REQUIRED[number] if name.endswith('.js'))
                self.assertIn(f'MY-MODULE-{number}', archive.read(f'src/learning/module-{number}/{name}').decode('utf-8'))
            package = json.loads(archive.read('package.json'))
            self.assertEqual(package['dependencies'], {'astro': '7.3.3', 'three': '0.181.2'})
            self.assertIn('src/student-frontend.js', archive.namelist())
            self.assertIn('src/pages/index.astro', archive.namelist())
        with self.assertRaises(ValueError):
            merge.assemble(archives[:-1], scaffold)
        with self.assertRaises(ValueError):
            merge.assemble(archives + [archives[0]], scaffold)
        with self.assertRaises(ValueError):
            merge.assemble(archives, {'src/learning/module-1/interaction-state.js': 'hidden instructor replacement'})

    def test_tampered_export_and_unsafe_path_are_refused(self):
        data, _ = exported(1)
        with zipfile.ZipFile(io.BytesIO(data)) as original:
            content = {info.filename: original.read(info) for info in original.infolist()}
        content['frontend/interaction-state.js'] += b'\n// tampered after hashing'
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as archive:
            for name, raw in content.items(): archive.writestr(name, raw)
        with self.assertRaises(ValueError): merge.load_module(buffer.getvalue())
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as archive: archive.writestr('../unwanted', b'no')
        with self.assertRaises(ValueError): merge.load_module(buffer.getvalue())


if __name__ == '__main__':
    unittest.main(verbosity=2)
