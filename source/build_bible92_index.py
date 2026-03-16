import json
import re

with open("bible92.json",encoding="utf8") as f:
    bible=json.load(f)

index={}

for i,v in enumerate(bible):

    book=v["book"].lower()
    chapter=v["chapter"]
    verse=v["verse"]

    key1=f"{book} {chapter}"
    key2=f"{book} {chapter}:{verse}"

    index.setdefault(key1,[]).append(i)
    index[key2]=i

with open("bible92_index.json","w",encoding="utf8") as f:
    json.dump(index,f,ensure_ascii=False)

print("Indeksi valmis:",len(index))