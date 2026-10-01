"""Package only formation/**, preserving all existing public routes."""
from pathlib import Path
import hashlib,json,tarfile,zipfile

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.orbit/formation-20261001'

def main():
    entries={}
    with tarfile.open(OUT/'formation-built.tar.gz') as built:
        for member in built.getmembers():
            if not member.isfile():continue
            path=Path(member.name)
            if member.name.startswith('web/dist/formation/'):
                target=path.relative_to('web/dist').as_posix()
            elif member.name.startswith('web/dist/_astro/'):
                target='formation/'+path.relative_to('web/dist').as_posix()
            else:continue
            if '..' in Path(target).parts:raise ValueError('Unsafe build path')
            data=built.extractfile(member).read()
            if target.endswith(('.html','.js','.css')):data=data.replace(b'/_astro/',b'/formation/_astro/')
            entries[target]=data
    plugin=ROOT/'artifacts/learning-studio/orbit-learning-studio-1.0.0.tgz'
    entries['formation/plugins/'+plugin.name]=plugin.read_bytes()
    if not {'formation/lab/index.html','formation/projets/index.html'}.issubset(entries):raise ValueError('Missing formation entry')
    hashes={name:hashlib.sha256(value).hexdigest() for name,value in sorted(entries.items())}
    entries['formation/release.json']=json.dumps({'version':'1.0.0','scope':'formation-only','landingModified':False,'files':hashes},indent=2).encode()
    package=OUT/'orbit-formation-only.zip'
    with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED) as archive:
        for name,data in sorted(entries.items()):archive.writestr(name,data)
    report={'state':'packaged-not-deployed','package':str(package),'sha256':hashlib.sha256(package.read_bytes()).hexdigest(),'files':len(entries),'scope':'formation/** only','landingIncluded':False,'guideIncluded':False}
    (OUT/'release-package.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report))

if __name__=='__main__':main()
