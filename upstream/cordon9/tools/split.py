import re, sys, os, json, hashlib
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
a = s.index('<script type="module">') + len('<script type="module">')
b = s.rindex('</script>')
js = s[a:b]
head = s[:a]
marks = [(m.start(), m.group(1)) for m in re.finditer(r'^// ((?:node_modules|src)/\S+)$', js, re.M)]
pre = js[:marks[0][0]]
segs = {}
order = []
for i, (p, name) in enumerate(marks):
    e = marks[i+1][0] if i+1 < len(marks) else len(js)
    body = js[p:e]
    if name not in segs: segs[name] = []; order.append(name)
    segs[name].append(body)
written = []
for name in order:
    if name.startswith('node_modules/'):
        continue
    path = os.path.join(out, name)  # src/...
    os.makedirs(os.path.dirname(path), exist_ok=True)
    body = '\n'.join(x.split('\n',1)[1] if x.startswith('// '+name) else x for x in segs[name])
    if len(segs[name]) > 1:
        body = f'// NOTE: esbuild emitted this module in {len(segs[name])} separate parts; they are joined here in bundle order.\n' + body
    open(path, 'w', encoding='utf-8').write(body)
    written.append((name, len(body), body.count('\n')))
vendor = {n: sum(len(x) for x in segs[n]) for n in order if n.startswith('node_modules/')}
html_shell = head + '\n<!-- bundled module script removed: see src/ -->\n' + s[b:]
open(os.path.join(out, 'shell.html'), 'w', encoding='utf-8').write(html_shell)
json.dump({'modules': [{'path': n, 'chars': c, 'lines': l} for n, c, l in written], 'vendor': vendor, 'order': order,
           'prelude': pre}, open(os.path.join(out, '_split.json'), 'w'), indent=1, ensure_ascii=False)
print(len(written), 'modules'); print(vendor)
