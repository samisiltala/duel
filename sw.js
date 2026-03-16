const CACHE="sanakko-v1"

const FILES=[
"./",
"./sanakko.html",
"./sanat.txt",
"./papyrus.jpg"
]

self.addEventListener("install",e=>{
e.waitUntil(
caches.open(CACHE).then(cache=>{
return cache.addAll(FILES)
})
)
})

self.addEventListener("fetch",e=>{
e.respondWith(
caches.match(e.request).then(res=>{
return res || fetch(e.request)
})
)
})