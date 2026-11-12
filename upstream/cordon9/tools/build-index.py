# Builds upstream/cordon9/index.html: preview gallery + audio players. Usage: python3 build-index.py <cordon9 dir>
import json, os, sys, html
d = sys.argv[1]
shots = json.load(open(os.path.join(d, "previews/_capture.json")))
sounds = json.load(open(os.path.join(d, "audio/index.json")))
groups = [("地图 · Halsey Street", "map-halsey"), ("地图 · Thornwake", "map-field"), ("武器与手", ("weapon", "hands")),
          ("僵尸", "zombie"), ("道具组", "props-"), ("其它", ("kit", "drone", "title"))]
css = """body{margin:0;padding:24px;background:#0b0e11;color:#d6dde3;font:14px/1.5 system-ui,sans-serif}
h1{margin:0 0 4px}h2{margin:32px 0 10px;font-size:16px;color:#f0a830}p{color:#8a96a0;margin:0 0 16px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.g a{color:inherit;text-decoration:none}.g img{width:100%;display:block;border-radius:4px}.g span{font:12px ui-monospace,monospace;color:#8a96a0}
.a{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:6px 18px}.a div{display:flex;align-items:center;gap:8px;font:12px ui-monospace,monospace}
.a audio{height:28px;flex:1;min-width:0}.a b{width:130px;font-weight:500}"""
out = [f"<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>CORDON 9 素材库</title><style>{css}</style>",
       "<h1>CORDON 9 素材库</h1><p>来源 cordon9.pplx.app · 2026-11-12 · 全部由代码生成，未获授权，仅供参考。说明见 README.md。</p>"]
used = set()
for title, key in groups:
    keys = key if isinstance(key, tuple) else (key,)
    items = [s for s in shots if s["name"].startswith(keys) and s["name"] not in used]
    used |= {s["name"] for s in items}
    out.append(f"<h2>{title}（{len(items)}）</h2><div class=g>")
    for s in items:
        f = f"previews/{s['name']}.jpg"
        out.append(f"<a href='{f}' title='cordon9.html?{html.escape(s['query'])}'><img loading=lazy src='{f}'><span>{s['name']}</span></a>")
    out.append("</div>")
cats = {}
for k, v in sounds.items(): cats.setdefault(v["category"], []).append((k, v))
for c, lst in cats.items():
    out.append(f"<h2>音效 · {c}</h2><div class=a>")
    for k, v in lst:
        for f in v["files"]:
            out.append(f"<div><b>{os.path.basename(f['file'])[:-4]}</b><audio controls preload=none {'loop' if v['loop'] else ''} src='audio/{f['file']}'></audio>{f['seconds']}s</div>")
    out.append("</div>")
open(os.path.join(d, "index.html"), "w", encoding="utf-8").write("\n".join(out) + "\n")
print("index.html:", len(shots), "previews,", sum(len(v["files"]) for v in sounds.values()), "sounds")
