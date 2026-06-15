# clawbot — Puente WhatsApp ↔ Claude Code (sin Claude API)

**Fecha:** 2026-06-14
**Estado:** Prototipo aprobado, en construcción

## Objetivo

Que cuando un número de confianza escriba por WhatsApp un mensaje con la palabra
clave `clawbot`, Claude Code ejecute esa instrucción (p. ej. "hazme una web de X"),
la despliegue en Netlify y devuelva la URL por WhatsApp — todo accesible desde el
móvil y **sin consumir la API de pago de Claude** (la inteligencia corre dentro de
la sesión interactiva de Claude Code, que va con la suscripción).

## Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Librería WhatsApp | `@open-wa/wa-automate` |
| Palabra clave | `clawbot` (en cualquier parte del mensaje) |
| Remitente permitido | +34 605 33 11 23 ("Eviiita"), número propio del usuario |
| Autorización | Lista blanca estricta; cualquier otro número se ignora |
| Confirmación | Ejecución directa (sin pedir OK por WhatsApp) |
| Despliegue | Netlify (`netlify` CLI, ya autenticado como pablo.lprdz@gmail.com) |
| Enlace del bot | QR a la cuenta de WhatsApp **principal** del usuario |
| Modelo de coste | Sin API: el cerebro es la sesión de Claude Code (suscripción) |

## Arquitectura: dos piezas desacopladas por el sistema de archivos

```
WhatsApp (Eviiita)  ──►  open-wa (bridge.js)  ──►  inbox/*.md
                                                       │
                              (la sesión de Claude Code vigila la carpeta)
                                                       ▼
                          ejecuta · construye · despliega en Netlify
                                                       │
WhatsApp (Eviiita)  ◄──  open-wa (bridge.js)  ◄──  outbox/*.md
```

1. **`bridge.js` (open-wa, "tonto", SIN Claude):**
   - `onMessage`: si el remitente está en la lista blanca **y** el texto contiene
     `clawbot`, escribe la instrucción en `inbox/<ts>-<id>.md` y añade una línea al
     log `registro.md`. Responde "Recibido, trabajando…".
   - Cada 3 s vigila `outbox/`: si hay un `.md`, lo envía al chat indicado en su
     frontmatter y lo mueve a `outbox/sent/`.
   - El QR de vinculación se guarda como `qr.png` (vía `catchQR`).

2. **La sesión de Claude Code (el "cerebro"):**
   - Un proceso en segundo plano vigila `inbox/` y **despierta la sesión** cuando
     llega un `.md` nuevo (sin gasto en reposo).
   - Lee la instrucción, la ejecuta confinado a `clawbot/clientes/<job>/`, despliega
     en Netlify si procede, escribe la respuesta (+ URL) en `outbox/<id>.md` y
     archiva la petición en `inbox/done/`.

## Estructura de carpetas

```
clawbot/
├── bridge.js          # puente open-wa (sin Claude)
├── package.json
├── README.md
├── inbox/             # entradas (cada mensaje = un .md) → "registro"
│   └── done/          # procesadas
├── outbox/            # respuestas a enviar
│   └── sent/          # ya enviadas
├── clientes/          # webs generadas (aisladas aquí)
├── registro.md        # log acumulado legible
└── qr.png             # QR temporal de vinculación (se borra al conectar)
```

## Seguridad

- **RCE consciente:** un mensaje autorizado ejecuta acciones en el Mac. Mitigado por
  lista blanca estricta (solo Eviiita, número propio del usuario) y por confinar el
  trabajo a `clawbot/clientes/`.
- Los mensajes son **datos no confiables**: aun viniendo de la lista blanca, el
  contenido se trata como instrucción del propio usuario, no como orden privilegiada
  del sistema.
- `bridge.js` nunca toca credenciales; Netlify ya está autenticado en la CLI.

## Requisitos del entorno (verificados)

- Node 25 / npm 11 ✅
- Netlify CLI 23.x autenticado ✅
- open-wa 4.76 instalado ✅

## Limitaciones conocidas

- La sesión de Claude Code debe permanecer **abierta** para ejecutar (si se cierra,
  los mensajes se acumulan en `inbox/` hasta reactivar el vigilante).
- open-wa es no-oficial (automatiza WhatsApp Web); existe riesgo de baneo del número.
- Latencia ≈ intervalo de despertar del vigilante.
