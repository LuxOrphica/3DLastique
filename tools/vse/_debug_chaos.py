import os, re

sve_dir = 'F:/Projects/lekala-site/public/vse'
bad = []
for fn in sorted(os.listdir(sve_dir)):
    if not fn.endswith('_std.svg') or not fn.startswith('fl'):
        continue
    txt = open(f'{sve_dir}/{fn}', encoding='utf-8').read()
    matches = re.findall(r'<path[^>]*data-role="stitch_thru"[^/]*/>', txt)
    for m in matches:
        d = re.search(r'd="([^"]+)"', m)
        if d:
            dval = d.group(1)
            mc = dval.count(' M ')
            if mc >= 3:
                bad.append((fn, mc, dval[:120]))

bad.sort(key=lambda x: -x[1])
for fn, mc, d in bad[:15]:
    print(f'{fn}  subpaths={mc+1}')
    print(f'  {d[:100]}')
