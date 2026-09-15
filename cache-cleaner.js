// PlantGroove v10 cache cleaner. Safe for saved PlantGroove data.
(async()=>{try{if('serviceWorker'in navigator){const r=await navigator.serviceWorker.getRegistrations();await Promise.all(r.map(x=>x.unregister()));}if('caches'in window){const k=await caches.keys();await Promise.all(k.map(x=>caches.delete(x)));}}catch(e){console.warn('PlantGroove cache cleanup skipped:',e);}})();
