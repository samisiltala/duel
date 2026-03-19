let lutherSearchIndex = {};

fetch("data/luther_search_index.json")
.then(r => r.json())
.then(data => {

    lutherSearchIndex = data;

    console.log("Luther search index ladattu:",Object.keys(data).length,"sanaa");

});

async function loadJSON(path){
    const res = await fetch(path);
    return await res.json();
}

function parseQuery(q){

q = q.trim().toLowerCase();

if(q.startsWith('"') && q.endsWith('"')){
return { type:"phrase", value:q.slice(1,-1) };
}

let words = q.split(/\s+/);

return { type:"words", value:words };

}

function matchText(text,query){

text = text.toLowerCase();

if(query.type==="phrase"){
return text.includes(query.value);
}


return query.value.every(w => {

    if(w.includes("*")){

        let pattern = new RegExp(w.replace(/\*/g,".*"), "i");
        return pattern.test(text);

    } else {

        return text.includes(w);

    }

});

}

function searchAll(query){

return {
bible: searchBible(query),
luther: searchLuther(query),
lestadius: searchLestadius(query)
};

}

function searchLuther(q){

let words = q.toLowerCase().split(/\s+/);

let sets = [];

words.forEach(w => {

    // 🔥 wildcard-tuki
    if(w.includes("*")){

        let pattern = new RegExp("^" + w.replace(/\*/g, ".*") + "$");

        let matches = Object.keys(lutherSearchIndex)
            .filter(k => pattern.test(k));

        let ids = [];

        matches.forEach(m => {
            ids = ids.concat(lutherSearchIndex[m]);
        });

        if(ids.length){
            sets.push(ids);
        }

    } else {

        if(lutherSearchIndex[w]){
            sets.push(lutherSearchIndex[w]);
        }

    }

});

if(!sets.length) return [];

let ids = sets.reduce((a,b)=>a.filter(x=>b.includes(x)));



return ids.slice(0,resultLimit).map(id=>{

let book = lutherIndex.find(b => b.id == id);

/* laske osumien määrä */

let count = 0;

words.forEach(w=>{
if(lutherSearchIndex[w]){
count += lutherSearchIndex[w].filter(x=>x==id).length;
}
});

return {
collection:"luther",
id:id,
title:book.title,
count:count
};

});

}

function searchBible(q){

let query = parseQuery(q);

let results = [];

bible.forEach(v => {

let text = v.text.toLowerCase();

if(query.type === "phrase"){

if(text.includes(query.value)){

results.push({
book:v.book,
chapter:v.chapter,
verse:v.verse,
text:v.text
});

}

}else{

let ok = query.value.every(w => {

    if(w.includes("*")){

        let pattern = new RegExp(w.replace(/\*/g,".*"), "i");
        return pattern.test(text);

    } else {

        return text.includes(w);

    }

});

if(ok){

results.push({
collection:"bible",
book:v.book,
chapter:v.chapter,
verse:v.verse,
text:v.text
});

}

}

});

return results.slice(0,20);

}
function searchLestadius(q){

q=q.toLowerCase();

let results=[];

sermons.forEach(s=>{

let text=(s.title+" "+s.text).toLowerCase();

if(matchText(text,parseQuery(q)))
    {

results.push({
collection:"lestadius",
id:s.id,
title:s.title
});

}

});

return results.slice(0,resultLimit);

}

function showSearchResults(res){

let container = document.getElementById("sermonList");

container.innerHTML="";

function section(title,list){

let div=document.createElement("div");

div.innerHTML = `
<h3>
<label>
<input type="checkbox" checked disabled>
${title} (${list.length})
</label>
</h3>
`;

let box=document.createElement("div");

box.style.maxHeight="105px";
box.style.overflowY="auto";
box.style.paddingRight="6px";
box.style.fontSize="14px";

list.forEach(item=>{

let row=document.createElement("div");

row.style.cursor="pointer";
row.style.padding="3px 0";
row.style.marginBottom="6px";
row.onmouseover=()=>row.style.background="#f0f0f0";
row.onmouseout=()=>row.style.background="";

let snippet = item.snippet || item.text || "";
if(item.collection==="lestadius"){
snippet = item.title;
}

let q = document.getElementById("search").value.trim().toLowerCase();

if(q){
let re = new RegExp("("+q.replace(/\*/g,"\\w*")+")","gi");
snippet = snippet.replace(re,"<mark>$1</mark>");
}

let source = "";

if(item.collection==="bible"){
source = item.book+" "+item.chapter+":"+item.verse;
}

if(item.collection==="luther"){
source = item.title;
}

if(item.collection==="lestadius"){
source = item.id+" "+item.title;
}

row.innerHTML = "<b>"+source+"</b><br>"+snippet;


row.onclick = function(){

if(item.collection === "bible"){

document.getElementById("toggleBible").checked = true;
document.getElementById("toggleLuther").checked = false;
document.getElementById("toggleLestadius").checked = false;

updatePanels();

showBibleChapter(item.book, item.chapter);

return;
}

if(item.collection === "luther"){

    
document.getElementById("toggleBible").checked = false;
document.getElementById("toggleLuther").checked = true;
document.getElementById("toggleLestadius").checked = false;

updatePanels();

openLutherResult(item.id, document.getElementById("search").value);

return;
}

if(item.collection === "lestadius"){

document.getElementById("toggleBible").checked = false;
document.getElementById("toggleLuther").checked = false;
document.getElementById("toggleLestadius").checked = true;

updatePanels();

showSermon(item.id);

return;
}

};

box.appendChild(row);

});

div.appendChild(box);

container.appendChild(div);

}

section("Raamattu",res.bible);
section("Luther",res.luther);
section("Lestadius",res.lestadius);

}


document.getElementById("search").addEventListener("input",function(){

let q = this.value.trim();

// 🔥 poistetaan tähdet tarkistusta varten
let clean = q.replace(/\*/g, "");

// ei hakua jos ei ole oikeita kirjaimia
if(clean.length < 2){
    runSearch("");
    return;
}

let results=searchAll(q);

showSearchResults(results);

});

function runSearch(q){

q = q.trim();

if(q.length < 2){

/* palautetaan normaali kirjasto */

if(q.length < 2){

    // palautetaan normaali näkymä ilman DOM-rikkomista
    buildBibleBooks();
    buildLutherMenu();
    buildLestadiusMenu();
    
    updatePanels();
    return;
}

/* rakennetaan sisältö */

buildBibleBooks();
buildLestadiusMenu();

return;

}

let results = searchAll(q);

showSearchResults(results);

}



