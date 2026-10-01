"""Package only formation/**, preserving all existing public routes."""
from pathlib import Path, PurePosixPath
from datetime import datetime, timezone
import hashlib,json,stat,tarfile,zipfile

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.orbit/formation-20261001'
MAX_FILES=3000
MAX_FILE_BYTES=32*1024*1024
MAX_TOTAL_BYTES=128*1024*1024
# Deployments must advance mtime: LiteSpeed caches compressed static variants.
# Reusing a constant timestamp can keep a previous representation alive.
DEPLOY_TIMESTAMP=datetime.now(timezone.utc).timetuple()[:6]

def safe_path(name):
    if not isinstance(name,str) or not name or '\\' in name or '\x00' in name or ':' in name:
        raise ValueError('Unsafe build path')
    parts=name.split('/')
    if any(part in {'','.','..'} for part in parts) or PurePosixPath(name).is_absolute():
        raise ValueError('Unsafe build path')
    return PurePosixPath(name)

def zip_entry(name,directory=False):
    info=zipfile.ZipInfo(name+('/' if directory else ''),DEPLOY_TIMESTAMP)
    info.create_system=3
    info.compress_type=zipfile.ZIP_DEFLATED
    info.external_attr=((stat.S_IFDIR|0o755) if directory else (stat.S_IFREG|0o644))<<16
    if directory:info.external_attr|=0x10
    return info

def main():
    entries={}
    total=0
    with tarfile.open(OUT/'formation-built.tar.gz') as built:
        for member in built.getmembers():
            is_plugin=member.name.startswith('artifacts/learning-studio/') and member.name.endswith('.tgz')
            is_host=member.name.startswith('tools/learning-studio-host/dist/')
            if not is_plugin and not is_host and not member.name.startswith(('web/dist/formation/','web/dist/_astro/')):continue
            if member.isdir():continue
            if not member.isfile():raise ValueError('Build contains a non-regular public file')
            path=safe_path(member.name)
            if is_plugin:
                target='formation/plugins/'+path.name
            elif is_host:
                target='formation/studio/'+path.relative_to('tools/learning-studio-host/dist').as_posix()
            elif member.name.startswith('web/dist/formation/'):
                target=path.relative_to('web/dist').as_posix()
            elif member.name.startswith('web/dist/_astro/'):
                target='formation/'+path.relative_to('web/dist').as_posix()
            else:continue
            safe_path(target)
            if not target.startswith('formation/') or target in entries:raise ValueError('Unsafe or duplicate output path')
            if member.size<0 or member.size>MAX_FILE_BYTES:raise ValueError('Public file size limit exceeded')
            total+=member.size
            if total>MAX_TOTAL_BYTES or len(entries)>=MAX_FILES:raise ValueError('Public package size limit exceeded')
            data=built.extractfile(member).read()
            if not is_host and target.endswith(('.html','.js','.css')):data=data.replace(b'/_astro/',b'/formation/_astro/')
            if len(data)>MAX_FILE_BYTES:raise ValueError('Transformed public file size limit exceeded')
            entries[target]=data
    if len([name for name in entries if name.startswith('formation/plugins/') and name.endswith('.tgz')])!=1:
        raise ValueError('Require the single plugin built in the same cloud snapshot')
    if not {'formation/lab/index.html','formation/projets/index.html','formation/studio/index.html','formation/studio/.htaccess'}.issubset(entries):raise ValueError('Missing formation or second Studio entry')
    # Fixed URLs change between releases; hashed assets retain their caching.
    entries['formation/.htaccess']=b'<IfModule mod_headers.c>\n    <FilesMatch "^(?:release\\.json|orbit-learning-studio-[0-9.]+\\.tgz)$">\n        Header always set Cache-Control "no-cache, max-age=0, must-revalidate"\n    </FilesMatch>\n</IfModule>\n<IfModule LiteSpeed>\n    RewriteEngine On\n    RewriteRule ^release\\.json$ - [E=no-brotli:1,E=no-gzip:1]\n</IfModule>\n'
    hashes={name:hashlib.sha256(value).hexdigest() for name,value in sorted(entries.items())}
    entries['formation/release.json']=json.dumps({'version':'1.0.0','scope':'formation-only','landingModified':False,'secondStudio':{'basePath':'/formation/studio','projectId':'pzscx4w8','dataset':'production','authenticatedRuntimeValidated':False,'crossOriginContextValidated':False,'sanityPermissionsChanged':False},'files':hashes},indent=2).encode()
    package=OUT/'orbit-formation-only.zip'
    if sum(map(len,entries.values()))>MAX_TOTAL_BYTES or len(entries)>MAX_FILES:raise ValueError('Public package size limit exceeded')
    directories=sorted({parent.as_posix() for name in entries for parent in PurePosixPath(name).parents if parent.as_posix()!='.'})
    with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED) as archive:
        for directory in directories:archive.writestr(zip_entry(directory,True),b'')
        for name,data in sorted(entries.items()):archive.writestr(zip_entry(name),data)
    report={'state':'packaged-not-deployed','package':str(package),'sha256':hashlib.sha256(package.read_bytes()).hexdigest(),'files':len(entries),'directories':len(directories),'permissions':{'files':'0644','directories':'0755','creator':'Unix'},'scope':'formation/** only','landingIncluded':False,'guideIncluded':False,'originalStudioIncluded':False,'secondStudioIncluded':True,'secondStudioFiles':sum(name.startswith('formation/studio/') for name in entries),'httpAccessVerified':False}
    (OUT/'release-package.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report))

if __name__=='__main__':main()
