"""Read-only deployment diagnosis using Orbit's private environment and local operator packages."""
from pathlib import Path
import json
import os
import sys
import sysconfig
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]

def main():
    expected = (ROOT / '.venv').resolve()
    if Path(sys.prefix).resolve() != expected:
        raise SystemExit('Use Orbit .venv/Scripts/python.exe to run this operator.')
    if not (ROOT / '.env').is_file():
        raise SystemExit('Orbit private .env is missing.')
    os.environ.update({
        'SECUREDME_EDUCATION_ROOT': str(ROOT),
        'SECUREDME_SETTINGS_ENV_PATH': str(ROOT / '.env'),
        'SECUREDME_SETTINGS_VENV_PATH': str(expected),
        'SECUREDME_SETTINGS_PLUGIN_ROOT': sysconfig.get_paths()['purelib'],
    })
    from securedme_cpanel_operator.client import CPanelClient
    try:
        result = CPanelClient().call('DomainInfo', 'list_domains', timeout=20)
        data = result.get('data') or result.get('result', {}).get('data') or {}
        # This command cannot upload, mutate DNS, or print credential-bearing errors.
        print(json.dumps({'state': 'observed', 'operation': 'DomainInfo/list_domains',
                          'data_fields': sorted(data) if isinstance(data, dict) else [],
                          'status': result.get('status', result.get('result', {}).get('status'))}))
    except HTTPError as exc:
        print(json.dumps({'state': 'blocked', 'http_status': exc.code}))
        return 1
    except Exception as exc:
        print(json.dumps({'state': 'blocked', 'error_type': type(exc).__name__}))
        return 1
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
