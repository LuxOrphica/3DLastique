import fitz, sys, os
sys.path.insert(0, '.')

samples_dir = 'C:/temp/samples'
# Find CT00024 AI file
for root, dirs, files in os.walk(samples_dir):
    for f in files:
        if 'CT00024' in f and f.endswith('.ai'):
            ai_path = os.path.join(root, f)
            print(f'Found: {ai_path}')
            doc = fitz.open(ai_path)
            page = doc[0]
            for block in page.get_text("dict")["blocks"]:
                if block.get("type") != 0:
                    continue
                for line in block.get("lines", []):
                    for s in line.get("spans", []):
                        txt = s["text"].strip()
                        if 'v' in txt.lower() and len(set(txt.lower())) <= 2:
                            print(f'  text="{txt}" size={s.get("size",0):.1f} color={s.get("color",0)}')
            break
