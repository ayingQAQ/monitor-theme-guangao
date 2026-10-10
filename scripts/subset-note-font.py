"""Build the local note font: python scripts/subset-note-font.py <LongCang-Regular.ttf>.

Requires fonttools and brotli. Source: google/fonts ofl/longcang (SIL OFL 1.1).
Only built-in notes, calculator copy and labeled demo text are included; other characters fall back
to a system handwriting font. The modified subset uses its own family name.
"""
from pathlib import Path
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
text = ''.join((root / file).read_text(encoding='utf-8') for file in
               ['src/lib/node-remarks.ts', 'dev/fixtures.ts', 'src/components/ValueCalculator.tsx', 'src/lib/value-export.ts'])
text += ''.join(chr(code) for code in range(32, 127)) + '，。！？·：；、（）¥∞核算估价单现算现写'
font = TTFont(sys.argv[1])
chars = set(map(ord, text)) & set(font.getBestCmap())
options = subset.Options()
options.flavor = 'woff2'
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=chars)
subsetter.subset(font)
for record in font['name'].names:
    if record.nameID in (1, 3, 4, 6, 16):
        record.string = 'GuangaoNote'.encode(record.getEncoding())
font.flavor = 'woff2'
output = root / 'public/fonts/monitor-note.woff2'
font.save(output)
print(f'Note font: {len(chars)} characters, {output.stat().st_size} bytes')
