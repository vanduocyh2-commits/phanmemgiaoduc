(function portalConnectionResilience() {
  'use strict';

  function markConnected() {
    var badge = document.getElementById('cloud-status-badge');
    if (!badge) return;
    badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>Trực tuyến (Cloud Sync)';
    badge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/20 text-emerald-200 border-emerald-400/30';
  }

  // Restore the online indicator only after a successful, valid server response.
  var originalFetch = window.fetch.bind(window);
  window.fetch = async function(input, init) {
    var response = await originalFetch(input, init);
    var path = '';
    try {
      var requestUrl = typeof input === 'string' ? input : input.url;
      path = new URL(requestUrl, window.location.href).pathname;
    } catch (_) {}
    var method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var isPortalRead = method === 'GET' && (path === '/api/state' || path === '/api/session');
    var isLogin = method === 'POST' && path === '/api/login';
    if (response.ok && (isPortalRead || isLogin)) {
      response.clone().json().then(function(data) {
        if (data && data.view) markConnected();
      }).catch(function() {});
    }
    return response;
  };

  // The state refresh is asynchronous; avoid overlapping requests and poll less aggressively.
  var nativeSetInterval = window.setInterval.bind(window);
  var pollInFlight = false;
  window.setInterval = function(callback, delay) {
    if (typeof callback === 'function') {
      var source = '';
      try { source = Function.prototype.toString.call(callback); } catch (_) {}
      if (source.indexOf('onlineRequest') !== -1 && source.indexOf('/api/state') !== -1) {
        var guardedPoll = async function() {
          if (pollInFlight) return;
          pollInFlight = true;
          try { return await callback.apply(this, arguments); }
          finally { pollInFlight = false; }
        };
        return nativeSetInterval(guardedPoll, Math.max(Number(delay) || 0, 20000));
      }
    }
    return nativeSetInterval.apply(window, arguments);
  };
})();