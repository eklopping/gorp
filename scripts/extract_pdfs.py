from pypdf import PdfReader
from pathlib import Path

paths = [
    Path(r"c:\Users\User\Downloads\SRR Vol.3 Gear.pdf"),
    Path(r"c:\Users\User\Downloads\SRR Vol.2 Rules.pdf"),
    Path(r"c:\Users\User\Downloads\SRR Vol.1 Characters.pdf"),
]
out = Path(r"C:\Users\User\Projects\sessionnote\tmp-pdf-extract")
out.mkdir(exist_ok=True)

for p in paths:
    print("===", p.name, "exists", p.exists(), "===")
    if not p.exists():
        continue
    reader = PdfReader(str(p))
    print("pages", len(reader.pages))
    chunks = []
    for i, page in enumerate(reader.pages):
        t = page.extract_text() or ""
        chunks.append(f"\n\n----- PAGE {i+1} -----\n{t}")
    target = out / (p.stem.replace(" ", "_") + ".txt")
    text = "".join(chunks)
    target.write_text(text, encoding="utf-8")
    print("wrote", target.name, "chars", len(text))
