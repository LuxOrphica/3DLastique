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
            blue_paths = []
            for p in page.get_drawings():
                c = p.get('color')
                if not c: continue
                if classify_color(c) in ('BLUE', 'CYAN'):
                    role = classify_with_registry(p, tw, reg)
                    role = apply_node_role_override(ai, p, role)
                    r = p.get('rect')
                    w = p.get('width') or 0
                    print(f'role={role} color={classify_color(c)} rgb=({c[0]:.2f},{c[1]:.2f},{c[2]:.2f}) w={w:.2f} rect=({r.x0:.0f},{r.y0:.0f},{r.x1:.0f},{r.y1:.0f}) closed={p.get("closePath")}')
            break
