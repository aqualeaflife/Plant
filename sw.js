const CACHE="plantgroove-0.5.7-v1";
const ASSETS=[
  "./",
  "./index.html",
  "./style-v057.css?v=057",
  "./app-v057.js?v=057",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/nav-growth-off-color-v057.svg",
  "./assets/nav-growth-on-color-v057.svg",
  "./assets/nav-home-off-color-v057.svg",
  "./assets/nav-home-on-color-v057.svg",
  "./assets/nav-plants-off-color-v057.svg",
  "./assets/nav-plants-on-color-v057.svg",
  "./assets/nav-props-off-color-v057.svg",
  "./assets/nav-props-on-color-v057.svg",
  "./assets/nav-tc-off-color-v057.svg",
  "./assets/nav-tc-on-color-v057.svg",
  "./assets/stat-plants-color-v057.svg",
  "./assets/stat-props-color-v057.svg",
  "./assets/stat-rooted-color-v057.svg"
];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{for(const k of await caches.keys()) if(k!==CACHE) await caches.delete(k);await self.clients.claim();})())});
self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.mode==="navigate"){
    e.respondWith(fetch(req,{cache:"no-store"}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put("./index.html",copy));return r;}).catch(()=>caches.match("./index.html")));return;
  }
  if(req.url.includes("style-v057.css")||req.url.includes("app-v057.js")){e.respondWith(fetch(req,{cache:"no-store"}).catch(()=>caches.match(req)));return;}
  e.respondWith(caches.match(req).then(r=>r||fetch(req)));
});