'use strict';

/**
 * server.js — Orquestador del servidor Expo en Railway
 *
 * Problema: Metro genera URLs con ":8082" que Railway no expone externamente
 * (Railway solo acepta HTTPS en puerto 443 → nuestro puerto interno 8081).
 *
 * Solución:
 *  - Metro corre en puerto 8082 (interno)
 *  - Este proceso escucha en puerto 8081 (el que Railway expone)
 *  - Intercepta el manifest JSON y reescribe las URLs:
 *      http://host:8082/bundle → https://PUBLIC_HOST/bundle
 *  - Todas las demás peticiones (bundles, assets, WebSocket) se tunelean.
 */

const http = require('http');
const net  = require('net');
const { spawn } = require('child_process');

const PUBLIC_HOST = 'exhaustmarket-production.up.railway.app';
const METRO_PORT  = 8082;   // Puerto INTERNO de Metro
const PROXY_PORT  = 8081;   // Puerto que Railway expone públicamente

// ── URL estable para los beta testers ────────────────────────
console.log('============================================');
console.log('  ABRE EN EXPO GO (URL permanente):');
console.log(`  exp://${PUBLIC_HOST}`);
console.log('============================================');

// ── Reescribir URLs del manifest JSON ───────────────────────
// Expo SDK 50+ usa "New Manifest" con launchAsset.url (no bundleUrl).
// La URL ya llega como https:// — solo hay que eliminar :METRO_PORT.
//
// Ejemplo:  "https://host:8082/bundle"  →  "https://host/bundle"
// Cubre TODOS los campos del manifest sin parsear JSON.
function rewriteManifest(body) {
  // Quita :METRO_PORT cuando va seguido de / " o ? (delimitadores de URL/JSON)
  return body.replace(new RegExp(`:${METRO_PORT}(?=[/"?])`, 'g'), '');
}

// ── Iniciar Metro ────────────────────────────────────────────
const metro = spawn(
  'npx',
  ['expo', 'start', '--port', String(METRO_PORT), '--max-workers', '2'],
  {
    env: {
      ...process.env,
      CI: 'false',
      REACT_NATIVE_PACKAGER_HOSTNAME: PUBLIC_HOST,
    },
    stdio: 'inherit',
  }
);

metro.on('error', (e) => {
  console.error('Metro error:', e.message);
  process.exit(1);
});

metro.on('exit', (code, signal) => {
  console.error(`Metro stopped (code=${code} signal=${signal}) — restarting container`);
  process.exit(code || 1);
});

// ── Esperar a que Metro esté listo ───────────────────────────
function waitForMetro() {
  return new Promise((resolve) => {
    const attempt = () => {
      const s = net.createConnection({ port: METRO_PORT, host: '127.0.0.1' });
      s.on('connect', () => { s.destroy(); resolve(); });
      s.on('error',   () => setTimeout(attempt, 2000));
    };
    attempt();
  });
}

// ── Iniciar proxy una vez que Metro arranque ─────────────────
waitForMetro().then(() => {
  console.log(`Metro listo en :${METRO_PORT} — iniciando proxy en :${PROXY_PORT}`);

  const server = http.createServer((req, res) => {
    const opts = {
      hostname: '127.0.0.1',
      port: METRO_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${METRO_PORT}` },
    };

    const pr = http.request(opts, (mr) => {
      const ct = mr.headers['content-type'] || '';
      const isManifest = ct.includes('json') || ct.includes('expo');

      if (isManifest) {
        // Interceptar y reescribir el manifest
        let body = '';
        mr.setEncoding('utf8');
        mr.on('data', (d) => (body += d));
        mr.on('end', () => {
          const out = rewriteManifest(body);
          const headers = { ...mr.headers };
          delete headers['transfer-encoding'];
          headers['content-length'] = String(Buffer.byteLength(out, 'utf8'));
          res.writeHead(mr.statusCode || 200, headers);
          res.end(out);
        });
      } else {
        // Pasar el resto (bundles, assets…) directamente
        res.writeHead(mr.statusCode || 200, mr.headers);
        mr.pipe(res);
      }
    });

    pr.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });

    // Pasar el cuerpo de la petición (para POST/PUT)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      req.pipe(pr);
    } else {
      req.resume();
      pr.end();
    }
  });

  // ── Túnel TCP para WebSocket (hot-reload) ────────────────
  server.on('upgrade', (req, clientSocket, head) => {
    const remote = net.createConnection(
      { port: METRO_PORT, host: '127.0.0.1' },
      () => {
        // Reenviar la petición de upgrade a Metro
        let raw = `${req.method} ${req.url} HTTP/1.1\r\n`;
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
          const k = req.rawHeaders[i].toLowerCase();
          raw += k === 'host'
            ? `${req.rawHeaders[i]}: localhost:${METRO_PORT}\r\n`
            : `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
        }
        raw += '\r\n';
        remote.write(raw);
        if (head && head.length) remote.write(head);
        remote.pipe(clientSocket);
        clientSocket.pipe(remote);
      }
    );
    remote.on('error',       () => clientSocket.destroy());
    clientSocket.on('error', () => remote.destroy());
  });

  server.listen(PROXY_PORT, '0.0.0.0', () => {
    console.log(`Proxy listo en :${PROXY_PORT}`);
  });
});
