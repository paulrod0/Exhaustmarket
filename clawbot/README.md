# clawbot 🤖

Puente entre **WhatsApp** y la sesión de **Claude Code**, **sin usar la API de pago**.

El bot (`bridge.js`) solo hace de cartero: recibe mensajes de WhatsApp y los deja en
`inbox/` como archivos `.md`. La inteligencia (construir webs, desplegar en Netlify)
la pone la sesión de Claude Code, que vigila esa carpeta y responde escribiendo en
`outbox/`. El bot envía esas respuestas de vuelta por WhatsApp.

## Cómo funciona

```
Eviiita (WhatsApp) → "clawbot hazme una web de X"
   → bridge.js escribe inbox/<id>.md
   → Claude Code (esta sesión) lo lee, construye, despliega en Netlify
   → Claude Code escribe outbox/<id>.md con la URL
   → bridge.js lo envía a Eviiita por WhatsApp
```

Solo se atienden mensajes que:
1. vienen del número de la **lista blanca** (`ALLOWED` en `bridge.js`), y
2. contienen la palabra **`clawbot`**.

Cualquier otro mensaje se ignora.

## Arranque

```bash
cd clawbot
npm install          # solo la primera vez
npm start            # = node bridge.js
```

La primera vez genera `qr.png`. Escanéalo desde WhatsApp en el móvil:
**Ajustes → Dispositivos vinculados → Vincular un dispositivo**.
Tras vincular, la sesión queda guardada y no hace falta volver a escanear.

> ⚠️ Mantén la sesión viva al menos 5 minutos tras escanear el QR la primera vez.

## Uso

Desde el número vinculado en la lista blanca, escribe por WhatsApp:

```
clawbot hazme una landing para una cafetería llamada "El Túnel"
```

El bot confirma "Recibido…", Claude lo construye y despliega, y recibes la URL.

## Carpetas

| Carpeta | Qué es |
|---------|--------|
| `inbox/` | peticiones entrantes (cada mensaje un `.md`) |
| `inbox/done/` | peticiones ya procesadas |
| `outbox/` | respuestas que Claude deja para enviar |
| `outbox/sent/` | respuestas ya enviadas |
| `clientes/` | webs generadas (una carpeta por trabajo) |
| `registro.md` | log legible de todo lo pedido |

## Cambiar quién puede usarlo

Edita `ALLOWED` en `bridge.js` (formato `<código país><número>@c.us`, sin `+` ni espacios):

```js
const ALLOWED = ['34605331123@c.us']; // Eviiita
```

## Notas

- open-wa automatiza WhatsApp Web (no es oficial): riesgo de baneo del número.
- El bot usa el Chrome del sistema (`useChrome: true`) con un perfil propio aislado.
- No toca credenciales; Netlify debe estar autenticado aparte (`netlify login`).
