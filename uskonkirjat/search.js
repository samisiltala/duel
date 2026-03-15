let lutherCorpus = [];

fetch("data/luther_corpus.json")
.then(r => r.json())
.then(data => {

    lutherCorpus = data;

    console.log("Luther corpus ladattu:", lutherCorpus.length);

});

function searchLuther(query){

query = query.toLowerCase();

let results = [];

lutherCorpus.forEach(book => {

    let textLower = book.text.toLowerCase();

    let pos = textLower.indexOf(query);

    if(pos !== -1){

        let start = Math.max(0, pos - 80);
        let end = Math.min(book.text.length, pos + 80);

        let snippet = book.text.substring(start,end);

        results.push({
            title: book.title,
            id: book.id,
            snippet: snippet
        });

    }

});

return results;

}

async function loadJSON(path){
    const res = await fetch(path);
    return await res.json();
}

async function doSearch(){

    const query = document.getElementById("searchBox").value;

    const results = await searchText(query);

    const container = document.getElementById("results");

    container.innerHTML = "";

    for(const r of results){

        const div = document.createElement("div");

        div.innerHTML = `
            <h3>${r.title}</h3>
            <p>${r.snippet}...</p>
            <hr>
        `;

        container.appendChild(div);

    }

}

async function searchText(query){

    query = query.toLowerCase();

    const lutherIndex = await loadJSON("data/json/luther_index.json");

    let results = [];

    for(const book of lutherIndex){

        const bookData = await loadJSON("data/json/" + book.file);

        const text = bookData.text;
        const textLower = text.toLowerCase();

        let pos = textLower.indexOf(query);

        if(pos !== -1){

            const start = Math.max(0, pos - 80);
            const end = Math.min(text.length, pos + 80);

            const snippet = text.substring(start, end);

            results.push({
                title: bookData.title,
                id: bookData.id,
                collection: "Luther",
                snippet: snippet
            });

        }

    }

    return results;

}

document.getElementById("search").addEventListener("input", async function(){

    let q = this.value.toLowerCase().trim();

    if(q.length < 3){
        document.getElementById("lutherResults").innerHTML = "";
        return;
    }

    let results = await searchText(q);

    let container = document.getElementById("lutherResults");

    container.innerHTML = "";

   results.slice(0,20).forEach(r => {

let div = document.createElement("div");

div.innerHTML =
"<b>"+r.title+"</b><br>" +
r.snippet + "...";

div.onclick = function(){

openLutherResult(r.id, q);

};

container.appendChild(div);

});


  function openLutherResult(id,query){

let book = lutherCorpus.find(b => b.id == id);

if(!book) return;

document.getElementById("toggleLuther").checked = true;
updatePanels();

let text = book.text;

let pos = text.toLowerCase().indexOf(query.toLowerCase());

if(pos !== -1){

let start = Math.max(0,pos-200);
text = text.substring(start);

}

text = highlightWords(text,[query]);

document.querySelector("#lutherPanel .text").innerHTML =
text.replace(/\n/g,"<br>");

}

});