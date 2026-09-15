const CACHE="plantgroove-0.5.5-v1";
const ASSETS=["./","./index.html","./style.css","./app.js","./manifest.webmanifest","./icon-192.png","./icon-512.png",
  "./assets/nav-home-off.svg","./assets/nav-home-on.svg","./assets/nav-plants-off.svg","./assets/nav-plants-on.svg","./assets/nav-props-off.svg","./assets/nav-props-on.svg",
  "./assets/nav-tc-off.svg","./assets/nav-tc-on.svg","./assets/nav-growth-off.svg","./assets/nav-growth-on.svg","./assets/stat-plants.svg","./assets/stat-props.svg","./assets/stat-rooted.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
