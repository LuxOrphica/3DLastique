import fitz, sys
sys.path.insert(0, '.')
ai = 'C:/temp/samples/!Fly/1.False(...-199)/FL00018_w_False.ai'
doc = fitz.open(ai)
page = doc[0]
paths = page.get_drawings()
red = [p for p in paths if p.get('color') and p.get('color')[0] > 0.8 and p.get('color')[1] < 0.3 and not p.get('fill')]
print(f'Total red stroke paths: {len(red)}')
for p in red[:30]:
    items = p.get('items', [])
    rect = p.get('rect')
    w = round(p.get('width',0), 2)
    t = items[0][0] if items else '?'
    print(f'  w={w} n_items={len(items)} type={t} x={rect.x0:.1f} y0={rect.y0:.1f} y1={rect.y1:.1f} h={rect.height:.1f}')
