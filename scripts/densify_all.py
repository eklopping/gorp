from pathlib import Path
import re

for name in ["SRR_Vol.1_Characters.txt", "SRR_Vol.2_Rules.txt"]:
    src = Path(r"C:\Users\User\Projects\sessionnote\tmp-pdf-extract") / name
    text = src.read_text(encoding="utf-8")
    dense = re.sub(r"(?<=\b\w) (?=\w\b)", "", text)
    dense = re.sub(r"[ \t]+", " ", dense)
    out = Path(r"C:\Users\User\Projects\sessionnote\tmp-pdf-extract") / (name.replace(".txt", "_dense.txt"))
    out.write_text(dense, encoding="utf-8")
    print(name, "->", out.name, len(dense))
