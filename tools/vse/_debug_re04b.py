import fitz, sys, os
sys.path.insert(0, '.')
from engine import classify_with_registry, _build_registry_lookup, apply_node_role_override

for root, dirs, files in os.walk('C:/temp/samples'):
    for f in files:
        if 'RE00004' in f and f.endswith('.ai'):
            ai = os.path.join(root, f)
            doc = fitz.open(ai)
            page = doc[0]
            tw = page.get_text('words')
            reg = _build_registry_lookup()
            for p in page.get_drawings():
                r = p.get('rect')
                if not r: continue
                role = classify_with_registry(p, tw, reg)
                role = apply_node_role_override(ai, p, role)
                # Show circular-ish paths (similar width and height)
                if abs(r.width - r.height) < 20 and r.width > 10:
                    c = p.get('color')
                    fl = p.get('fill')
                    w = p.get('width') or 0
                    print(f'role={role:20s} w={w:.2f} color={c} fill={fl} rect=({r.x0:.0f},{r.y0:.0f},{r.x1:.0f},{r.y1:.0f}) size={r.width:.0f}x{r.height:.0f}')
            break
