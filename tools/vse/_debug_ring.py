import fitz, os, sys
sys.path.insert(0, '.')
for root, dirs, files in os.walk('C:/temp/samples'):
    for f in files:
        if 'AC00204' in f and f.endswith('.ai'):
            ai = os.path.join(root, f)
            doc = fitz.open(ai)
            page = doc[0]
            paths = page.get_drawings()
            ring_paths = [p for p in paths
                          if p.get('rect') and 90 <= p['rect'].x0 <= 130 and 60 <= p['rect'].y0 <= 120]
            for p in ring_paths[:10]:
                c = p.get('color')
                fl = p.get('fill')
                w = p.get('width') or 0
                r = p['rect']
                closed = p.get('closePath', False)
                nitems = len(p.get('items', []))
                print(f'color={c} fill={fl} w={round(w,2)} closed={closed} items={nitems} rect=({r.x0:.0f},{r.y0:.0f},{r.x1:.0f},{r.y1:.0f})')
            break
