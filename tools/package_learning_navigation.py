"""Package the authorized fifth landing link without replacing other pages."""
from pathlib import Path
import hashlib
import json
import tarfile
import zipfile
from package_formation_release import safe_path, zip_entry

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.orbit/formation-20261001'

def main():
    entries = {}
    with tarfile.open(OUT/'formation-built.tar.gz') as built:
        for member in built.getmembers():
            if member.name != 'web/dist/index.html' and not member.name.startswith('web/dist/_astro/'):
                continue
            if member.isdir():
                continue
            if not member.isfile() or member.size > 32*1024*1024:
                raise ValueError('Unexpected landing build member')
            target = safe_path(member.name).relative_to('web/dist').as_posix()
            if target in entries:
                raise ValueError('Duplicate landing member')
            entries[target] = built.extractfile(member).read()
    html = entries.get('index.html', b'')
    if html.count(b'data-atom-link=') != 5 or b'href="/formation/lab/"' not in html:
        raise ValueError('Require five landing navigation links including the approved learning door')
    if len(entries) > 500 or sum(map(len,entries.values())) > 64*1024*1024:
        raise ValueError('Landing package exceeds bounds')
    package = OUT/'orbit-learning-navigation.zip'
    with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(zip_entry('_astro',True),b'')
        for name,data in sorted(entries.items()):
            archive.writestr(zip_entry(name),data)
    receipt = {'state':'PACKAGED_NOT_DEPLOYED','scope':'index.html and content-addressed _astro assets only',
               'sha256':hashlib.sha256(package.read_bytes()).hexdigest(),'files':len(entries),
               'authorizedChange':'Independent fifth navigation orbit to /formation/lab/',
               'guideIncluded':False,'studioIncluded':False,'formationPagesIncluded':False,
               'runtimeValidated':False}
    (OUT/'navigation-package.json').write_text(json.dumps(receipt,indent=2))
    print(json.dumps(receipt))

if __name__ == '__main__':
    main()
