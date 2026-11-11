"""Builds the interface fonts in public/assets/fonts/ui from the full OFL families.

  python build-ui-fonts.py <dir with the source .ttf files>

Needs fonttools and brotli. Run it again after changing any text in src/i18n/locales/:
each CJK file keeps only the characters its own locale uses, so a missing glyph means a
stale build. Sources (github.com/google/fonts, SIL Open Font License 1.1):

  ofl/inter/Inter[opsz,wght].ttf
  ofl/notoserifdisplay/NotoSerifDisplay[wdth,wght].ttf
  ofl/notosanssc|notosanstc|notosansjp/NotoSans{SC,TC,JP}[wght].ttf
  ofl/notoserifsc|notoseriftc|notoserifjp/NotoSerif{SC,TC,JP}[wght].ttf

The source files may keep their "<family>__" download prefix.
"""
import glob, os, re, sys
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options
from fontTools.varLib.instancer import instantiateVariableFont

src = sys.argv[1]
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
out = os.path.join(root, "public", "assets", "fonts", "ui")
os.makedirs(out, exist_ok=True)


def source(name):
    hits = glob.glob(os.path.join(glob.escape(src), "*" + glob.escape(name)))
    if not hits:
        sys.exit("missing source font: " + name)
    return TTFont(hits[0])


def strings(path):
    text = open(path, encoding="utf8").read()
    # values only: everything inside quotes after the key's colon
    return "".join(m.group(2) for m in re.finditer(r'(:\s*)"((?:[^"\\]|\\.)*)"', text))


LOCALES = os.path.join(root, "src", "i18n", "locales")
BRAND = "行屍走鑊"
NAMES = "简体中文繁體日本語"
# Latin, Latin-1 and the punctuation / symbols the interface draws with the Latin faces.
LATIN = (
    [chr(c) for c in range(0x20, 0x7F)]
    + [chr(c) for c in range(0xA0, 0x100)]
    + list("‐‑–—―‘’‚“”„†‡•…‰′″‹›€™←↑→↓−∞≈≤≥■□▪▲►▼◄●○◆◇")
)


def cjk_chars(text):
    keep = set()
    for c in text:
        o = ord(c)
        if o >= 0x2E80 or 0x2500 <= o <= 0x257F or c in "·—…“”‘’":
            keep.add(c)
    return "".join(sorted(keep)) + "·—…“”‘’　"


def save(font, name, chars, axes, features=None):
    # Subset first, then pin or narrow the axes (instancing a full CJK font is slow).
    opts = Options()
    opts.flavor = "woff2"
    opts.layout_features = features if features is not None else ["kern", "liga", "calt", "tnum", "case", "ss01", "cv11", "palt", "vert", "locl"]
    opts.name_IDs = [0, 1, 2, 13, 14]
    opts.notdef_outline = True
    s = Subsetter(opts)
    s.populate(text=chars)
    s.subset(font)
    font = instantiateVariableFont(font, axes)
    font.flavor = "woff2"
    path = os.path.join(out, name)
    font.save(path)
    print(f"{name:24s} {os.path.getsize(path) // 1024:4d} KB  {len(set(chars))} chars")


latin_extra = "".join(c for f in glob.glob(os.path.join(LOCALES, "*.js")) for c in strings(f) if ord(c) < 0x2E80)
latin = "".join(sorted(set(LATIN) | set(latin_extra) - set("·—…“”‘’") | set("·—…“”‘’")))

save(source("Inter[opsz,wght].ttf"), "gm-sans.woff2", latin, {"wght": (400, 800), "opsz": (14, 32)})
save(source("NotoSerifDisplay[wdth,wght].ttf"), "gm-display.woff2", latin, {"wght": (500, 900), "wdth": (62.5, 100)})
save(source("NotoSerifTC[wght].ttf"), "gm-logo.woff2", BRAND, {"wght": 900}, features=[])
save(source("NotoSansSC[wght].ttf"), "gm-names.woff2", NAMES, {"wght": 500}, features=[])

for code, tag in (("zh-CN", "SC"), ("zh-TW", "TC"), ("ja", "JP")):
    chars = cjk_chars(strings(os.path.join(LOCALES, code + ".js")) + BRAND)
    save(source(f"NotoSans{tag}[wght].ttf"), f"gm-sans-{tag.lower()}.woff2", chars, {"wght": (400, 800)})
    save(source(f"NotoSerif{tag}[wght].ttf"), f"gm-serif-{tag.lower()}.woff2", chars, {"wght": (600, 900)})
