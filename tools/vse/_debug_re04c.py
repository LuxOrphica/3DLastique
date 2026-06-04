import fitz, sys, os
sys.path.insert(0, '.')
from engine import classify_with_registry, _build_registry_lookup, apply_node_role_override
from roles import classify_color

for root, dirs, files in os.walk('C:/temp/samples'):
    for f in files:
        if 'RE00004' in f and f.endswith('.ai'):
            ai = os.path.join(root, f)
            doc = fitz.open(ai)
            page = doc[0]
            tw = page.get_text('words')
            reg = _build_registry_lookup()
            print("=== ALL CIRCULAR-ISH OR LARGE PATHS ===")
            for i, p in enumerate(page.get_drawings()):
                r = p.get('rect')
                if not r: continue
                role = classify_with_registry(p, tw, reg)
                role = apply_node_role_override(ai, p, role)
                c = p.get('color')
                cc = classify_color(c) if c else 'NONE'
                fl = p.get('fill')
                w = p.get('width') or 0
                # Show anything that could be oval/circle or large
                ratio = max(r.width, r.height) / max(min(r.width, r.height), 0.1)
                if (ratio < 2.5 and r.width > 10) or r.width > 80 or r.height > 80:
                    print(f'[{i:3d}] role={role:20s} color={cc:5s} w={w:.2f} fill={fl is not None} rect=({r.x0:.0f},{r.y0:.0f},{r.x1:.0f},{r.y1:.0f}) size={r.width:.0f}x{r.height:.0f}')
            break
