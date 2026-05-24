import fitz
doc = fitz.open('C:/temp/sample_node.ai')
page = doc[0]
paths = page.get_drawings()

# Show raw item structure for first 5 paths
for i, p in enumerate(paths[:5]):
    print(f"\n--- Path {i} ---")
    print(f"  rect: {p.get('rect')}")
    print(f"  width: {p.get('width')}, color: {p.get('color')}, fill: {p.get('fill')}")
    items = p.get('items', [])
    print(f"  items ({len(items)}):")
    for item in items:
        print(f"    {item}")
