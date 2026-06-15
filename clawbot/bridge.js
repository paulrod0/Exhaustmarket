/**
 * clawbot/bridge.js
 *
 * Puente WhatsApp <-> carpeta .md. NO usa Claude (ni API).
 *   - Escucha mensajes del numero permitido (Eviiita) que contengan "clawbot".
 *   - Cada peticion -> archivo en inbox/  (esto es el "registro" .md).
 *   - Vigila outbox/ -> envia por WhatsApp las respuestas que deje el cerebro (la sesion de Claude Code).
 *
 * El cerebro (construir webs, desplegar en Netlify) vive en la sesion de Claude Code,
 * que lee inbox/ y escribe outbox/. Aqui no hay inteligencia, solo transporte.
 *
 * Libreria: whatsapp-web.js (gratis, mantenida, multi-dispositivo).
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const BASE = __dirname;
const INBOX = path.join(BASE, 'inbox');
const INBOX_DONE = path.join(INBOX, 'done');
const OUTBOX = path.join(BASE, 'outbox');
const OUTBOX_SENT = path.join(OUTBOX, 'sent');
const REGISTRO = path.join(BASE, 'registro.md');
const QR_FILE = path.join(BASE, 'qr.png');

// --- MODO PRUEBAS: cualquiera que escriba "clawbot" dispara el bot ---
// Pon ALLOW_ALL = false para volver a restringir a la lista ALLOWED.
// Nota: WhatsApp ya identifica a algunos contactos por "@lid" (id privado), no por numero.
const ALLOW_ALL = true;
const ALLOWED = ['34605331123@c.us', '249232825024653@lid']; // Eviiita (numero + lid)
const TRIGGER = /clawbot/i;

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

for (const d of [INBOX, INBOX_DONE, OUTBOX, OUTBOX_SENT]) {
  fs.mkdirSync(d, { recursive: true });
}

function sanitize(s) {
  return String(s).replace(/[^a-zA-Z0-9]/g, '').slice(-10);
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'clawbot', dataPath: path.join(BASE, '.wwebjs_auth') }),
  puppeteer: {
    headless: true,
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', async (qr) => {
  try {
    await qrcode.toFile(QR_FILE, qr, { width: 512, margin: 2 });
    console.log('[clawbot] QR actualizado -> qr.png (escanealo con WhatsApp)');
  } catch (e) {
    console.error('[clawbot] error guardando QR:', e.message);
  }
});

client.on('authenticated', () => console.log('[clawbot] autenticado'));
client.on('auth_failure', (m) => console.error('[clawbot] fallo de auth:', m));
client.on('disconnected', (r) => console.error('[clawbot] desconectado:', r));

client.on('ready', () => {
  try { if (fs.existsSync(QR_FILE)) fs.unlinkSync(QR_FILE); } catch (_) {}
  console.log('[clawbot] CONECTADO y escuchando. Esperando mensajes con "clawbot" de', ALLOWED.join(', '));
  startOutboxWatcher();
});

// --- Entrada: WhatsApp -> inbox/*.md ---
client.on('message', async (message) => {
  try {
    if (message.from && message.from.endsWith('@g.us')) return;   // ignora grupos
    if (!TRIGGER.test(message.body || '')) return;                // ignora si no dice "clawbot"
    if (!ALLOW_ALL && !ALLOWED.includes(message.from)) return;    // lista blanca (salvo modo pruebas)
    console.log('[clawbot] mensaje aceptado de ' + message.from);

    const instruction = (message.body || '')
      .replace(TRIGGER, '')
      .replace(/^[\s,:.\-]+/, '')
      .trim();
    if (!instruction) {
      await client.sendMessage(message.from, '🤖 Dime que quieres despues de "clawbot".');
      return;
    }

    const id = `${message.timestamp}-${sanitize(message.id._serialized || message.id.id)}`;
    const file = path.join(INBOX, `${id}.md`);
    const md =
      `---\n` +
      `from: ${message.from}\n` +
      `chatId: ${message.from}\n` +
      `msgId: ${message.id._serialized || ''}\n` +
      `ts: ${message.timestamp}\n` +
      `---\n\n` +
      `${instruction}\n`;
    fs.writeFileSync(file, md);

    fs.appendFileSync(
      REGISTRO,
      `\n## ${new Date(message.timestamp * 1000).toISOString()} — ${message.from}\n\n${instruction}\n`
    );

    console.log('[clawbot] nueva peticion ->', `${id}.md`);
    await client.sendMessage(message.from, '🤖 Recibido. Trabajando en ello...');
  } catch (e) {
    console.error('[clawbot] error procesando mensaje:', e.message);
  }
});

// --- Salida: outbox/*.md -> WhatsApp ---
function startOutboxWatcher() {
  setInterval(async () => {
    let files;
    try {
      files = fs.readdirSync(OUTBOX).filter((f) => f.endsWith('.md'));
    } catch (_) {
      return;
    }
    for (const f of files) {
      const full = path.join(OUTBOX, f);
      try {
        const content = fs.readFileSync(full, 'utf8');
        const m = content.match(/chatId:\s*(\S+)/);
        const chatId = m ? m[1] : ALLOWED[0];
        const body = content.replace(/^---[\s\S]*?---\s*/, '').trim();
        if (body) await client.sendMessage(chatId, body);
        fs.renameSync(full, path.join(OUTBOX_SENT, f));
        console.log('[clawbot] respuesta enviada ->', f);
      } catch (e) {
        console.error('[clawbot] error enviando', f, ':', e.message);
      }
    }
  }, 3000);
}

client.initialize();
