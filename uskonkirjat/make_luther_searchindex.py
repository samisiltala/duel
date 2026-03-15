import json
import os
import re

BASE = os.path.dirname(__file__)
folder = os.path.join(BASE,"data","json")

index = {}

for file in sorted(os.listdir(folder)):

    if file.endswith(".json") and file[0].isdigit():

        with open(os.path.join(folder,file),encoding="utf-8") as f:

            data=json.load(f)

            id=int(data["id"])
            text=(data["title"]+" "+data["text"]).lower()

            words=re.findall(r"\b[a-zåäö]+\b",text)

            for w in words:

                if len(w)<3:
                    continue

                if w not in index:
                    index[w]=[]

                if id not in index[w]:
                    index[w].append(id)

with open("data/luther_search_index.json","w",encoding="utf-8") as f:
    json.dump(index,f,ensure_ascii=False)

print("Index valmis:",len(index),"sanaa")