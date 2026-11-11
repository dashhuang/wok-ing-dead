"""Builds the two small sign fonts from the full OFL families.

  python build-fonts.py <dir with NotoSerifTC.ttf and LXGWWenKaiTC-Bold.ttf> <public/assets/fonts>

Needs fonttools and brotli. Only the Chinese characters that actually appear in
src/chinatown/*.js (plus the lane stencils in src/game.js) are kept, so each file is tiny.
Sources: github.com/google/fonts ofl/notoseriftc and ofl/lxgwwenkaitc (SIL Open Font License 1.1).
"""
import glob, os, re, sys
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options
from fontTools.varLib.instancer import instantiateVariableFont

src, out = sys.argv[1], sys.argv[2]
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
text = ""
for f in glob.glob(os.path.join(root, "src", "chinatown", "*.js")):
    text += open(f, encoding="utf8").read()
game = open(os.path.join(root, "src", "game.js"), encoding="utf8").read()
text += "".join(chr(int(h, 16)) for h in re.findall(r"\\u([0-9a-fA-F]{4})", game[game.index("var CT = {") : game.index("async function cL()")]))
chars = sorted({c for c in text if "⺀" <= c <= "鿿" or "＀" <= c <= "￯"})
chars += list("·—")
print(len(chars), "glyphs:", "".join(chars))
os.makedirs(out, exist_ok=True)

def subset(font, name):
    opts = Options()
    opts.flavor = "woff2"
    opts.layout_features = []
    opts.name_IDs = [1, 2]
    opts.notdef_outline = True
    s = Subsetter(opts)
    s.populate(text="".join(chars))
    s.subset(font)
    font.flavor = "woff2"
    path = os.path.join(out, name)
    font.save(path)
    print(name, os.path.getsize(path) // 1024, "KB")

serif = TTFont(os.path.join(src, "NotoSerifTC.ttf"))
serif = instantiateVariableFont(serif, {"wght": 900})
subset(serif, "ct-serif.woff2")
subset(TTFont(os.path.join(src, "LXGWWenKaiTC-Bold.ttf")), "ct-kai.woff2")
