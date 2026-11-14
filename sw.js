// Ubah angka versi ini setiap kali file aplikasi diganti agar cache lama dibuang
const CACHE='constant-modul-v8';
const SHELL=['./','index.html','manifest.webmanifest','config.json','icon-192.png','icon-512.png'];
const NET_TIMEOUT=4000;

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

function offlineFallback(req){
  return caches.match(req).then(r=>{
    if(r) return r;
    if(req.mode==='navigate') return caches.match('index.html');
    return Response.error();
  });
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin) return;

  // Jaringan dulu (agar pembaruan cepat), lalu cache saat offline/lambat.
  const network=fetch(req).then(res=>{
    if(!res||!res.ok) throw new Error('HTTP '+(res&&res.status));
    const copy=res.clone();
    caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
    return res;
  });

  const timeout=new Promise((_,reject)=>{
    setTimeout(()=>reject(new Error('network timeout')),NET_TIMEOUT);
  });

  e.respondWith(
    Promise.race([network,timeout]).catch(()=>offlineFallback(req))
  );
});
