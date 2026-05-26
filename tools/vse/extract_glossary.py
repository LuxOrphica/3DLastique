"""
Extract English terms/phrases from all AI files for glossary building.
Output: glossary_terms.json + public/vse-tools/glossary.html
"""
import os, sys, json, re, fitz
from collections import Counter

HERE        = os.path.dirname(os.path.abspath(__file__))
SAMPLES_DIR = os.environ.get("VSE_SAMPLES_DIR", "C:/temp/samples")

with open(os.path.join(HERE, "nodes.json"), encoding="utf-8") as f:
    nodes = [n for n in json.load(f) if n.get("enabled", True)]

# Stop words to ignore
STOP = {"the","and","for","with","from","into","only","all","put","set","fix",
        "left","right","back","front","side","top","bottom","inside","outside",
        "one","two","three","four","five","six","per","not","but","can","via",
        "see","use","add","cut","fold","pull","push","turn","both","each","this",
        "that","also","over","under","near","its","view","line","lines","part","parts"}

terms = Counter()
phrases = Counter()

processed = errors = 0
for n in nodes:
    ai_path = f"{SAMPLES_DIR}/{n['file']}"
    if not os.path.exists(ai_path):
        continue
    try:
        doc  = fitz.open(ai_path)
        page = doc[0]
        # Get text blocks to capture multi-word labels
        blocks = page.get_text("blocks")
        doc.close()
    except:
        errors += 1
        continue

    for block in blocks:
        text = block[4].strip()
        if not text: continue
        lines = text.split("\n")
        for line in lines:
            line = line.strip()
            # Only lines that look like English labels (contain letters, not just numbers)
            if not re.search(r'[A-Za-z]{3,}', line): continue
            if not re.match(r'[A-Za-z]', line): continue
            # Clean
            line_clean = re.sub(r'[^\w\s\-/().]', ' ', line).strip()
            if len(line_clean) < 3 or len(line_clean) > 60: continue
            # Skip if mostly numbers
            if sum(c.isdigit() for c in line_clean) > len(line_clean) * 0.5: continue

            words = line_clean.split()
            # Single meaningful words
            for w in words:
                w_clean = w.strip(".-/()")
                # Capitalized words = likely technical terms, keep original case
                if re.match(r'^[A-Z][a-z]{2,}', w_clean) and w_clean.lower() not in STOP:
                    terms[w_clean] += 1
                elif re.match(r'^[a-z]{4,}', w_clean) and w_clean not in STOP:
                    terms[w_clean] += 1
            # Multi-word phrases (2-4 words, all English)
            if 2 <= len(words) <= 5 and all(re.match(r'^[A-Za-z]', w) for w in words):
                phrase = " ".join(words)
                if len(phrase) >= 5:
                    phrases[phrase.lower()] += 1

    processed += 1
    if processed % 500 == 0:
        print(f"  {processed}/{len(nodes)}...")

print(f"Done: {processed} files, {errors} errors")

# Filter: keep phrases seen 2+ times, single words 5+ times
top_phrases = [(p, c) for p, c in phrases.most_common(500) if c >= 2]
top_terms   = [(t, c) for t, c in terms.most_common(300) if c >= 5]

print(f"Phrases (2+): {len(top_phrases)}")
print(f"Terms (5+):   {len(top_terms)}")

# Save JSON
out = {"phrases": top_phrases, "terms": top_terms}
OUT_JSON = os.path.join(HERE, "glossary_terms.json")
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

# Build HTML page
ROOT    = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT_DIR = os.path.join(ROOT, "public", "vse-tools")
os.makedirs(OUT_DIR, exist_ok=True)

# Combine: capitalized single terms + phrases, deduplicate
combined = []
seen = set()
# Capitalized single terms first
for term, count in terms.most_common():
    if count < 3: continue
    if re.match(r'^[A-Z]', term) and term.lower() not in seen:
        combined.append((term, count))
        seen.add(term.lower())
# Then phrases
for phrase, count in top_phrases:
    if phrase.lower() not in seen:
        combined.append((phrase, count))
        seen.add(phrase.lower())
combined.sort(key=lambda x: -x[1])

rows_html = ""
for i, (phrase, count) in enumerate(combined):
    rows_html += f"""
<tr>
  <td class="tc">{count}</td>
  <td><b>{phrase}</b></td>
  <td><input class="tr-inp" data-idx="{i}" type="text" placeholder="перевод..."
      style="width:260px;padding:4px 8px;border:1px solid #C8A84B;border-radius:3px;font-size:13px"></td>
</tr>"""

html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>VSE — Глоссарий</title>
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: Arial, sans-serif; font-size: 13px; background: #f5f2ee; }}
header {{ padding: 16px 32px; background: #1a1a1a; color: #C8A84B; font-size: 16px; font-weight: 700; }}
.sub {{ font-size: 12px; color: #aaa; margin-top: 4px; }}
.toolbar {{ padding: 12px 32px; background: #fff; border-bottom: 1px solid #e0d8cc; display:flex; gap:12px; align-items:center; }}
table {{ width: 100%; border-collapse: collapse; background: #fff; }}
th {{ background: #1a1a1a; color: #C8A84B; padding: 8px 12px; font-size: 11px; text-align: left; position:sticky; top:0; }}
td {{ padding: 7px 12px; border-bottom: 1px solid #eee; vertical-align: middle; }}
.tc {{ text-align: center; width: 60px; }}
tr:hover td {{ background: #faf8f5; }}
tr.done td {{ background: #f0faf0; }}
.save-btn {{ padding: 8px 20px; background: #C8A84B; color: #fff; border: none; border-radius: 4px; font-size: 13px; font-weight: 700; cursor: pointer; }}
#status {{ font-size: 12px; color: #888; }}
input {{ outline: none; }}
input:focus {{ border-color: #1a1a1a !important; }}
</style>
</head>
<body>
<header>VSE — Глоссарий терминов
  <div class="sub">{len(combined)} терминов из {processed} файлов · Впиши перевод → Сохранить</div>
</header>
<div class="toolbar">
  <button class="save-btn" onclick="saveJSON()">Сохранить глоссарий</button>
  <span id="status"></span>
</div>
<table>
<thead><tr><th>Кол-во</th><th>Английский термин</th><th>Перевод (RU)</th></tr></thead>
<tbody>{rows_html}</tbody>
</table>
<script>
const data = {json.dumps(combined, ensure_ascii=False)}.map(([phrase, count]) => ({{phrase, count, ru: ''}}));

document.querySelectorAll('.tr-inp').forEach(inp => {{
  inp.addEventListener('input', () => {{
    inp.closest('tr').classList.toggle('done', inp.value.trim() !== '');
    data[inp.dataset.idx].ru = inp.value.trim();
  }});
}});

function saveJSON() {{
  document.querySelectorAll('.tr-inp').forEach(inp => {{
    data[inp.dataset.idx].ru = inp.value.trim();
  }});
  const assigned = data.filter(d => d.ru);
  const blob = new Blob([JSON.stringify(assigned, null, 2)], {{type: 'application/json'}});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'glossary.json';
  a.click();
  document.getElementById('status').textContent = `Сохранено: ${{assigned.length}} переводов`;
}}
</script>
</body>
</html>"""

OUT_HTML = os.path.join(OUT_DIR, "glossary.html")
with open(OUT_HTML, "w", encoding="utf-8") as f:
    f.write(html)
print(f"-> {OUT_HTML}")
