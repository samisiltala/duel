let lutherSearchIndex = {};
let lutherTextCache = {};
let lutherReady = false;
const bookMap = {

    // VANHA TESTAMENTTI
    "1moos": ["1moos", "1 moos", "1. moos", "1. mooseksen kirja"],
    "2moos": ["2moos", "2 moos", "2. moos"],
    "3moos": ["3moos", "3 moos"],
    "4moos": ["4moos", "4 moos"],
    "5moos": ["5moos", "5 moos"],

    "ps": ["ps", "ps.", "psalmi", "psalmit"],
    "sananl": ["sananl", "sananl.", "sananlaskut"],
    "saarn": ["saarn", "saarn.", "saarnaja"],
    "laulujen": ["laulujen laulu", "laulujen", "laulu"],

    "jes": ["jes", "jes.", "jesaja"],
    "jer": ["jer", "jer.", "jeremia"],
    "hes": ["hes", "hes.", "hesekiel"],
    "dan": ["dan", "dan.", "daniel"],

    // UUSI TESTAMENTTI
    "matt": ["matt", "matt.", "matteus"],
    "mark": ["mark", "mark.", "markus"],
    "luuk": ["luuk", "luuk.", "luukas"],
    "joh": ["joh", "joh.", "johannes"],

    "apt": ["apt", "apt.", "apostolien teot"],

    "room": ["room", "room.", "rom", "rom.", "roomalaiskirje"],
    "1kor": ["1kor", "1 kor", "1. kor"],
    "2kor": ["2kor", "2 kor", "2. kor"],
    "gal": ["gal", "gal.", "galatalaiskirje"],
    "ef": ["ef", "ef.", "efesolaiskirje"],
    "fil": ["fil", "fil.", "filippilaiskirje"],
    "kol": ["kol", "kol.", "kolossalaiskirje"],

    "1tess": ["1tess", "1 tess"],
    "2tess": ["2tess", "2 tess"],

    "1tim": ["1tim", "1 tim"],
    "2tim": ["2tim", "2 tim"],
    "tit": ["tit", "tit."],
    "filem": ["filem", "filem."],

    "hepr": ["hepr", "hepr.", "hebrealaiskirje"],
    "jaak": ["jaak", "jaak.", "jaakob"],
    "1piet": ["1piet", "1 piet"],
    "2piet": ["2piet", "2 piet"],
    "1joh": ["1joh", "1 joh"],
    "2joh": ["2joh", "2 joh"],
    "3joh": ["3joh", "3 joh"],
    "juud": ["juud", "juud."],
    "ilm": ["ilm", "ilm.", "ilmestyskirja"]

};

fetch("data/luther_search_index.json")
.then(r => r.json())
.then(data => {


    lutherSearchIndex = data;

    console.log("Luther search index ladattu:",Object.keys(data).length,"sanaa");
    // 🔥 LISÄÄ TÄSTÄ ALKAEN

    console.log("Aloitetaan Luther-tekstien esilataus...");

        console.log("Luther cache lataus käynnistetty");


});

async function preloadLuther(){

    for(const book of lutherIndex){

        let file = String(book.id).padStart(3,"0");

        let r = await fetch("data/json/"+file+".json");
        let json = await r.json();

        lutherTextCache[Number(book.id)] = json.text.toLowerCase();
    }

    lutherReady = true;

    console.log("Luther cache valmis");
}

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

function makeSnippet(text, query){

text = text.toLowerCase();

let idx = -1;

// 🔹 fraasi
if(query.type === "phrase"){
    idx = text.indexOf(query.value);
}

// 🔹 sanat
if(idx === -1 && query.type === "words"){
    for(let w of query.value){
        idx = text.indexOf(w);
        if(idx !== -1) break;
    }
}

if(idx === -1) return "";

// 🔹 ota ympäriltä tekstiä
let start = Math.max(0, idx - 60);
let end = Math.min(text.length, idx + 60);

let snippet = text.slice(start, end);

// siisti alku/loppu
if(start > 0) snippet = "..." + snippet;
if(end < text.length) snippet = snippet + "...";

return snippet;
}

function highlightSnippet(snippet, query){

    if(!snippet) return snippet;

    // FRAASI
    if(query.type === "phrase"){

        let safe = query.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        let re = new RegExp("(" + safe + ")", "gi");

        return snippet.replace(re, "<mark>$1</mark>");
    }

    // SANAT + wildcard
    query.value.forEach(w => {

        if(w.includes("*")){

            let prefix = w.replace("*","");

            let safe = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            let re = new RegExp("\\b(" + safe + "\\w*)", "gi");

            snippet = snippet.replace(re, "<mark>$1</mark>");

        } else {

            let safe = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            let re = new RegExp("\\b(" + safe + ")", "gi");

            snippet = snippet.replace(re, "<mark>$1</mark>");
        }

    });

    return snippet;
}



function buildBibleRefRegex(book, chapter, verse){

    let key = book.toLowerCase().replace(".", "");

    let variants = bookMap[key] || [book];

    let bookPattern = variants
        .map(v => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");

    return new RegExp(
        "\\b(" + bookPattern + ")\\.?\\s*" + chapter + "\\s*:\\s*" + verse + "\\b",
        "gi" // 🔥 nyt g mukana (multi highlight)
    );
}

function searchAll(query){

    let refMatch = query.toLowerCase().match(/^([A-Za-zÅÄÖåäö0-9]+)\.?\s*(\d+):(\d+)/i);

    if(refMatch){

        let book = refMatch[1];
        let chapter = Number(refMatch[2]);
        let verse = Number(refMatch[3]);

        let regex = buildBibleRefRegex(book, chapter, verse);

        let refResults = searchBibleReferenceAll(regex, book, chapter, verse);

        // 🔥 lisää itse jae mukaan
        let verseResult = bible.find(v =>
            v.book.toLowerCase().startsWith(book.toLowerCase()) &&
            v.chapter === chapter &&
            v.verse === verse
        );

        if(verseResult){
            refResults.bible.unshift({
                collection:"bible",
                book:verseResult.book,
                chapter:chapter,
                verse:verse,
                text:verseResult.text
            });
        }

        return refResults;
    }

    return {
        bible: searchBible(query),
        luther: searchLuther(query),
        lestadius: searchLestadius(query)
    };
}

function searchBibleReferenceAll(regex, book, chapter, verse){

    let lutherResults = [];
    let bibleResults = [];
    let lestadiusResults = [];

    // 🔥 LUTHER
    for(let id in lutherTextCache){

        let text = lutherTextCache[id];

        let match = text.match(regex);

        if(match){

            let bookObj = lutherIndex.find(b => Number(b.id) === Number(id));
            if(!bookObj) continue;

            let idx = text.search(regex);

            let snippet = "";

            if(idx !== -1){
                let start = Math.max(0, idx - 60);
                let end = Math.min(text.length, idx + 60);

                snippet = text.slice(start, end);

                if(start > 0) snippet = "..." + snippet;
                if(end < text.length) snippet += "...";
            }

            lutherResults.push({
                collection:"luther",
                id:id,
                title:bookObj.title,
                snippet:snippet
            });
        }
    }

    // 🔥 BIBLE (vain viitteet tekstissä, ei itse jae)
    bible.forEach(v => {

        let text = v.text.toLowerCase();

        if(regex.test(text)){
            bibleResults.push({
                collection:"bible",
                book:v.book,
                chapter:v.chapter,
                verse:v.verse,
                text:v.text
            });
        }
    });

    // 🔥 LESTADIUS
    sermons.forEach(s => {

        let text = (s.title + " " + s.text).toLowerCase();

        let match = text.match(regex);

        if(match){
            lestadiusResults.push({
                collection:"lestadius",
                id:s.id,
                title:s.title,
                snippet:text // 🔥 tärkeä fix
            });
        }
    });

    return {
        bible: bibleResults.slice(0,20),
        luther: lutherResults.slice(0,resultLimit),
        lestadius: lestadiusResults.slice(0,resultLimit)
    };
}

function splitLutherToPages(text){

    if(!text || typeof text !== "string"){
        return [];
    }

    let parts = text.split(/\[page:(\d+)\]/g);

    let pages = [];

    for(let i = 1; i < parts.length; i += 2){

        let pageNum = parseInt(parts[i]);
        let content = parts[i+1] || "";

        if(!isNaN(pageNum) && content){

            pages.push({
                page: pageNum,
                text: content
            });

        }

    }

    return pages;
}

function searchLuther(q){

    if(!lutherReady){
    console.log("Luther cache ei valmis vielä");
    return [];
}

    let query = parseQuery(q);

    // 🔴 estä tyhjät haut
    if(
        (query.type === "phrase" && !query.value.trim()) ||
        (query.type === "words" && query.value.length === 0)
    ){
        return [];
    }

    let results = [];

    // =========================
    // 🔥 FRAASIHAKU (cache + sivujako)
    // =========================
    if(query.type === "phrase"){

        Object.keys(lutherTextCache).forEach(id => {

            let text = lutherTextCache[id];
            if(!text) return;

            let pages = splitLutherToPages(text);

            // 🔁 fallback jos ei sivuja
            if(!pages.length){

                if(text.includes(query.value)){

                let book = lutherIndex.find(b => Number(b.id) === Number(id));
if(!book) return;

                    results.push({
                        collection:"luther",
                        id:id,
                        title:book.title,
                        snippet: makeSnippet(text, query)
                    });

                }

                return;
            }

            // 🔥 sivukohtainen haku
            pages.forEach(p => {

                if(p.text && p.text.includes(query.value)){

                    let book = lutherIndex.find(b => Number(b.id) === Number(id));
if(!book) return;

                    results.push({
                        collection:"luther",
                        id:id,
                        title:book.title + " (s. " + p.page + ")",
                        snippet: makeSnippet(p.text, query)
                    });

                }

            });

        });

        return results.slice(0, resultLimit);
    }

    // =========================
    // 🔥 SANAHAAKU (indeksi + AND)
    // =========================
    let sets = [];

    query.value.forEach(w => {

        if(w.includes("*")){

    let prefix = w.replace("*","");

    let matches = Object.keys(lutherSearchIndex)
        .filter(k => k.startsWith(prefix));

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

    let ids = sets.reduce((a,b) => {
    let setB = new Set(b);
    return a.filter(x => setB.has(x));
});

    // 🔥 rakennetaan tulokset + snippet
    ids.slice(0, resultLimit).forEach(id => {

        let text = lutherTextCache[id];
        if(!text) return;

        let snippet = makeSnippet(text, query);

        let book = lutherIndex.find(b => Number(b.id) === Number(id));
if(!book) return;

        results.push({
            collection:"luther",
            id:id,
            title:book.title,
            snippet:snippet
        });

    });

    return results;
}
/******************************************
 * RAAMATTUHAKU
 * ****************************************/
function searchBible(q){

let query = parseQuery(q);

let results = [];

bible.forEach(v => {

let text = v.text.toLowerCase();

if(matchText(text, query)){

    results.push({
        collection:"bible",
        book:v.book,
        chapter:v.chapter,
        verse:v.verse,
        text:v.text
    });

}

});

return results.slice(0,20);

}


/*******************************************
 * LESTADIUSHAKU
 * *****************************************/
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
    snippet = item.snippet || item.title; // 🔥 FIX
}

let q = document.getElementById("search").value.trim();

if(q){

    let refMatch = q.toLowerCase().match(/^([A-Za-zÅÄÖåäö0-9]+)\.?\s*(\d+):(\d+)/i);

    if(refMatch){

        let book = refMatch[1];
        let chapter = refMatch[2];
        let verse = refMatch[3];

        let regex = buildBibleRefRegex(book, chapter, verse);

        // 🔥 MULTI highlight
        snippet = snippet.replace(regex, "<mark>$&</mark>");

    } else {

        let query = parseQuery(q);
        snippet = highlightSnippet(snippet, query);

    }
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


let searchTimeout;

document.getElementById("search").addEventListener("input", function(){

    clearTimeout(searchTimeout);

    let q = this.value.trim();

    searchTimeout = setTimeout(() => {
        document.getElementById("sermonList").innerHTML = "";
        document.getElementById("sermonList").innerHTML = "Haetaan...";

        let clean = q.replace(/\*/g, "");

        if(clean.length < 2){
            runSearch("");
            return;
        }

        let results = searchAll(q);
        showSearchResults(results);

    }, 120); // säädä 80–200ms

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



