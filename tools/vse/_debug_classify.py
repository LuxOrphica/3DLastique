import fitz, sys, os
sys.path.insert(0, '.')
from roles import classify_path
from engine import classify_with_registry, _build_registry_lookup, _path_style_key, apply_node_role_override

for root, dirs, files in os.walk('C:/temp/samples'):
    for f in files:
        if 'AC00200' in f and f.endswith('.ai'):
            ai = os.path.join(root, f)
            doc = fitz.open(ai)
            page = doc[0]
            paths = page.get_drawings()
            tw = page.get_text("words")
            reg = _build_registry_lookup()
            node_name = os.path.basename(ai)

            print("Paths that CLASSIFY differently than expected:")
            for i, p in enumerate(paths):
                c = p.get('color')
                # Red paths only
                if not c or not (c[0] > 0.75 and c[1] < 0.35):
                    continue
                role = classify_with_registry(p, tw, reg)
                role = apply_node_role_override(ai, p, role)
                if role == 'contour_outer':
                    print(f"  [{i}] RED path classified as contour_outer! color={c} w={round(p.get('width',0),2)} rect={p.get('rect')}")
            break
