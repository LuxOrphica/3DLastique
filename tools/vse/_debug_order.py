import fitz, os, sys
sys.path.insert(0, '.')
from roles import classify_path

for root, dirs, files in os.walk('C:/temp/samples'):
    for f in files:
        if 'AC00204' in f and f.endswith('.ai'):
            ai = os.path.join(root, f)
            doc = fitz.open(ai)
            page = doc[0]
            paths = page.get_drawings()
            tw = page.get_text("words")
            print(f"Total paths: {len(paths)}")
            for i, p in enumerate(paths):
                r = p.get('rect')
                if not r: continue
                # Only show paths near the ring/strap area x=90-130, y=65-115
                if 85 <= r.x0 <= 135 and 60 <= r.y0 <= 120:
                    role = classify_path(p, tw)
                    c = p.get('color')
                    fl = p.get('fill')
                    w = p.get('width') or 0
                    print(f"  [{i:3d}] role={role:25s} w={w:.1f} color={c} fill={fl} rect=({r.x0:.0f},{r.y0:.0f},{r.x1:.0f},{r.y1:.0f})")
            break
