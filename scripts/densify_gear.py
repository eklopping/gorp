from pathlib import Path
import re

src = Path(r"C:\Users\User\Projects\sessionnote\tmp-pdf-extract\SRR_Vol.3_Gear.txt")
text = src.read_text(encoding="utf-8")

def densify(s: str) -> str:
    return re.sub(r"(?<=\b\w) (?=\w\b)", "", s)

dense = densify(text)
dense = re.sub(r"[ \t]+", " ", dense)
out = Path(r"C:\Users\User\Projects\sessionnote\tmp-pdf-extract\gear_dense.txt")
out.write_text(dense, encoding="utf-8")
print("chars", len(dense))
for needle in ["Value :", "Tag Rarity", "Item Profiles", "One-Handed", "Starting Wear"]:
    print(needle, dense.find(needle))
