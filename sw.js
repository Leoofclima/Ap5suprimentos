// Service worker do AP5 — Suprimentos.
// Guarda o "esqueleto" do site (HTML, manifest, ícones) para ele continuar abrindo
// mesmo sem internet. Os dados (solicitações) continuam vindo do Supabase quando
// há conexão; sem conexão, o site mostra a última versão salva no navegador.
//
// Estratégia: SEMPRE tenta buscar a versão mais nova na rede primeiro. Só usa a
// cópia salva localmente se a rede falhar de verdade (sem internet). Isso evita
// o problema clássico de "atualizei o site mas continuo vendo a versão antiga".

var CACHE_NAME = 'ap5-shell-v3';
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
    fetch(req).then(function(res){
      if(res && res.status === 200){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
      }
      return res;
    }).catch(function(){
      // Sem internet de verdade: cai para a cópia salva, se existir.
      return caches.match(req).then(function(cached){
        return cached || caches.match('./index.html');
      });
    })
  );
});

// ---------- notificações push ----------
self.addEventListener('push', function(event){
  var data = { title: 'AP5 — Suprimentos', body: 'Há novidade no registro de bordo.' };
  try{ if(event.data) data = event.data.json(); }catch(e){}
  event.waitUntil(
    self.registration.showNotification(data.title || 'AP5 — Suprimentos', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      data: { url: data.url || './' }
    })
  );
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients){
      for(var i=0;i<windowClients.length;i++){
        var client = windowClients[i];
        if('focus' in client) return client.focus();
      }
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});
