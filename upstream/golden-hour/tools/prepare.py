"""Rebuild local entry and verify archived source hashes; originals remain unchanged."""
import re,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1]
s=(R/'original/index.html').read_text()
s,n=re.subn(r'<!-- frame-runtime -->.*?<!-- /frame-runtime -->','<!-- Hosting runtime removed for local reference copy. -->',s,flags=re.S)
assert n==1, 'Unexpected host runtime wrapper'
s=s.replace("s.src = 'dist/game'", "s.src = 'original/dist/game'")
(R/'play.html').write_text(s)
for f in json.loads((R/'provenance.json').read_text())['files']:
 assert hashlib.sha256((R/f['path']).read_bytes()).hexdigest()==f['sha256'],f['path']
print('Original hashes verified; play.html rebuilt.')
