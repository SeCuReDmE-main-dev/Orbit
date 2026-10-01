"""One-time, scoped palette migration for the Orbit surface (not avatar assets)."""
from pathlib import Path
import colorsys
import re

root = Path(__file__).resolve().parents[1]
replacements = {
    '#0d1514': '#07091b', '#15211f': '#11162b', '#17201e': '#090c21',
    '#f7f7f5': '#f7f5ff', '#a0b3ad': '#b0bdd9', '#5aa7a3': '#68dcff',
    '#8ab38b': '#bd98ff', '#d2e0c1': '#ffc97a', '#e3edda': '#ffdaa3',
    '#15251f': '#171324', '#b9cfb0': '#d6b4ff', '#d4e2c4': '#ffc97a',
}
def recolor(match):
    value = match.group().lower()
    if len(value) not in (7, 9):
        return value
    base, alpha = value[:7], value[7:]
    if base in replacements:
        return replacements[base] + alpha
    rgb = [int(base[i:i+2], 16)/255 for i in (1,3,5)]
    h, l, s = colorsys.rgb_to_hls(*rgb)
    if 65/360 < h < 185/360 and s > .04:
        rgb = colorsys.hls_to_rgb(229/360, l, min(.6, max(.24, s)))
        return '#' + ''.join(f'{round(c*255):02x}' for c in rgb) + alpha
    return value
for name in ('synthia.css', 'journey.css'):
    path = root/'web/src/styles'/name
    text = path.read_text(encoding='utf-8')
    text = re.sub(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b', recolor, text)
    text = text.replace('--s-serif: Georgia, "Times New Roman", serif;', '--s-display: "Space Grotesk", "Segoe UI", sans-serif;\n  --s-body: "Manrope", "Segoe UI", sans-serif;')
    text = text.replace('var(--s-serif)', 'var(--s-display)')
    text = text.replace('font-family: "Segoe UI", system-ui, sans-serif;', 'font-family: var(--s-body);')
    text = text.replace('500 34px/1 Georgia,\n    serif', '500 34px/1 var(--s-display)')
    path.write_text(text, encoding='utf-8')
