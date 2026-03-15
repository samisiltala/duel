import json
import os

folder = "data/json"

corpus = []

for file in sorted(os.listdir(folder)):

    if file.endswith(".json") and file[0].isdigit():

        with open(os.path.join(folder,file),encoding="utf-8") as f:
            data=json.load(f)

            corpus.append({
                "id":data["id"],
                "title":data["title"],
                "text":data["text"]
            })

with open("data/luther_corpus.json","w",encoding="utf-8") as f:
    json.dump(corpus,f,ensure_ascii=False)

print("Corpus valmis:",len(corpus),"teosta")