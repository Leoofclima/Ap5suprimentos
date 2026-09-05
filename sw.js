// Service worker do AP5 — Suprimentos.
// Guarda o "esqueleto" do site (HTML, manifest, ícones) para ele continuar abrindo
// mesmo sem internet. Os dados (solicitações) continuam vindo do Supabase quando
// há conexão; sem conexão, o site mostra a última versão salva no navegador.

var CACHE_NAME = 'ap5-shell-v1';
var SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){ return n !== CACHE_NAME; }).map(function(n){ return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  var req = event.request;

  // Só cuidamos de pedidos GET do próprio site (o "esqueleto"). Chamadas para o
  // Supabase, fontes do Google, etc. seguem direto para a rede, sem cache.
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin){
    return;
  }

  event.respondWith(
    caches.match(req).then(function(cached){
      var network = fetch(req).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){
        // Sem internet: cai para a cópia salva, se existir.
        return cached || caches.match('./index.html');
      });
      // Mostra a versão em cache na hora (rápido), atualiza em segundo plano.
      return cached || network;
    })
  );
});
