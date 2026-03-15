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

return query.value.every(w => text.includes(w));

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

if(lutherSearchIndex[w]){
sets.push(lutherSearchIndex[w]);
}

});

if(!sets.length) return [];

let ids = sets.reduce((a,b)=>a.filter(x=>b.includes(x)));

return ids.slice(0,20).map(id=>{

let book = lutherIndex.find(b => b.id == id);

return {
collection:"luther",
id:id,
title:book.title
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

let ok = query.value.every(w => text.includes(w));

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

return results.slice(0,20);

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

let q=this.value.trim();

if(q.length<2){

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

let library = document.getElementById("sermonList");

library.innerHTML = `
<h3>
<label>
<input type="checkbox" id="toggleBible">
Raamattu
</label>
</h3>
<div id="bibleBooks"></div>

<h3>
<label>
<input type="checkbox" id="toggleLuther">
Luther
</label>
</h3>
<div id="lutherBooks"></div>

<h3>
<label>
<input type="checkbox" id="toggleLestadius">
Lestadius
</label>
</h3>
<div id="sermonList"></div>
`;

/* rakennetaan sisältö */

buildBibleBooks();
buildLestadiusMenu();

return;

}

let results = searchAll(q);

showSearchResults(results);

}

async function openLutherResult(id,query){

let r = await fetch("data/json/"+String(id).padStart(3,"0")+".json");
let book = await r.json();

document.getElementById("toggleLuther").checked = true;
updatePanels();

let text = book.text.toLowerCase();
let pos = text.indexOf(query.toLowerCase());

let snippet = book.text;

if(pos !== -1){

let start = Math.max(0,pos-400);
let end = Math.min(book.text.length,pos+800);

snippet = book.text.substring(start,end);

}

snippet = highlightWords(snippet,[query]);

let html = "<div class='sermonTitle'>"+book.title+"</div>";
html += snippet.replace(/\n/g,"<br>");

document.querySelector("#lutherPanel .text").innerHTML = html;

}

