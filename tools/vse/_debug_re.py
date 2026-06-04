import fitz, sys, os
sys.path.insert(0, '.')
from roles import classify_path
from engine import classify_with_registry, _build_registry_lookup, apply_node_role_override

for root, dirs, files in os.walk('C:/temp/samples'):
    for f in files:
        if 'RE00001' in f and f.endswith('.ai'):
            ai = os.path.join(root, f)
            doc = fitz.open(ai)
            page = doc[0]
            paths = page.get_drawings()
            tw = page.get_text('words')
            reg = _build_registry_lookup()
            red = [p for p in paths if p.get('color') and p.get('color')[0] > 0.8 and p.get('color')[1] < 0.3]
            print(f'Total red paths: {len(red)}')
            for p in red[:15]:
                r = p.get('rect')
                role = classify_with_registry(p, tw, reg)
                role = apply_node_role_override(ai, p, role)
                w = p.get('width') or 0
                dashes = p.get('dashes')
                is_dashed = bool(dashes) and str(dashes) not in ('[] 0', '[]', '')
                fill = p.get('fill')
                print(f'  role={role} dashed={is_dashed} w={w:.2f} fill={fill} rect=({r.x0:.0f},{r.y0:.0f},{r.x1:.0f},{r.y1:.0f}) items={len(p.get("items",[]))}')
            break
