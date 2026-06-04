import fitz, os
for root, dirs, files in os.walk('C:/temp/samples'):
    for f in files:
        if 'AC00204' in f and f.endswith('.ai'):
            ai = os.path.join(root, f)
            doc = fitz.open(ai)
            page = doc[0]
            paths = page.get_drawings()
            # The strap fill around x=120-240, y=76-101
            for p in paths:
                r = p.get('rect')
                fl = p.get('fill')
                if fl and r and 115 <= r.x0 <= 125 and 70 <= r.y0 <= 85 and r.x1 >= 230:
                    print(f'fill={fl} color={p.get("color")} w={p.get("width")} rect=({r.x0:.0f},{r.y0:.0f},{r.x1:.0f},{r.y1:.0f})')
            break
