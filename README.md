# BUSCADOR-BACK

API construida con **Node.js, Express 5, TypeScript y MongoDB/Mongoose**.
Conserva la búsqueda editorial de demostración y añade endpoints privados para
sincronizar las notificaciones que el usuario elija enviar desde Buscador Kotlin.

> Importante: el servicio Android puede leer notificaciones nuevas mostradas por
> Android, no los mensajes salientes de WhatsApp/Facebook/TikTok, ni el historial
> de las aplicaciones. Este backend no recibe nada automáticamente: hasta
> conectar una pantalla de consentimiento y el envío voluntario, la captura
> local permanece en el teléfono.

## Desarrollo en Termux o PC

```sh
cd ~/BUSCADOR/backend
npm install
cp .env.example .env
# Configura MONGODB_URI, SYNC_API_TOKEN y SYNC_ENCRYPTION_KEY en .env
npm run build
npm run test
npm run dev
```

Crea los dos secretos con comandos Node.js ejecutados separadamente:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Pega el primero como `SYNC_API_TOKEN` y el segundo como
`SYNC_ENCRYPTION_KEY` en `.env`, sin comillas ni espacios.
Configura `MONGODB_URI` con las credenciales de tu MongoDB Atlas o local.
No publiques claves, tokens ni enlaces completos de MongoDB.

Sin las tres variables configuradas y la conexión a MongoDB funcionando,
los endpoints privados devuelven HTTP 503.

## Endpoints

- `GET /api/health`: prueba de estado.
- `GET /api/search?q=...`: buscador editorial ficticio.
- `POST /api/notifications/sync`: sincroniza hasta 40 notificaciones con token.
- `GET /api/notifications?limit=50`: recupera hasta 100 eventos propios.
- `DELETE /api/notifications`: borra todo el historial del servidor.

Todos los endpoints de `/api/notifications` requieren
`Authorization: Bearer <SYNC_API_TOKEN>`.

### Ejemplo de una sincronización autorizada

Solo para pruebas con contenido ficticio, desde la máquina que ejecuta la API:

```sh
curl -X POST 'http://127.0.0.1:4000/api/notifications/sync' \
  -H "Authorization: Bearer $SYNC_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"id":"demo-1","source":"com.whatsapp","title":"Prueba ficticia","message":"Mensaje de ejemplo","time":1794919200000}]}'
```

En lugar de un ejemplo de fecha fija, usa una marca temporal actual
(`Date.now()`) para evitar que el servidor descarte mensajes antiguos.

## Privacidad y límites

- **Sincronización desactivada por defecto**; se requiere interfaz de consentimiento
  explícito y una acción de activación en la app Android para transmitir contenidos.
- El servidor cifra el título y la vista previa con **AES-256-GCM** antes de
  escribir en MongoDB. La clave está solo en las variables del servidor.
- Límite de 500 registros; expiración aproximada a los 30 días mediante
  índice TTL, además del límite de retención aplicado al importar.
- Se permiten solo los identificadores de paquetes de WhatsApp, Facebook,
  Messenger y TikTok; no se almacenan pulsaciones de teclado ni chats completos.
- Los registros pueden consultarse o eliminarse únicamente mediante token.
- **Usar HTTPS** si el servidor es accesible desde otro dispositivo o por Internet.
  No incrustes un token global del servidor en una APK distribuida.
- **Prototipo de usuario único.** Antes de ofrecerlo a más personas se necesitan
  autenticación individual, revocación de sesiones, control de acceso por cuenta,
  límites de peticiones y gestión de claves. El token existente protege
  una sola colección privada; cualquiera que lo obtenga podría leerla.
- El almacenamiento remoto aumenta los riesgos de privacidad. No subas textos
  personales de terceros sin la autorización correspondiente.
- Si pierdes o cambias `SYNC_ENCRYPTION_KEY`, no podrás descifrar el contenido anterior.

El archivo local de la app Android no se modifica con estas rutas.

## Cuentas de Buscador (inicio de sesión real)

Con `MONGODB_URI` configurado y conectado, el backend ofrece:

- `POST /api/auth/register`: correo y contraseña (mínimo 10 caracteres).
- `POST /api/auth/login`: valida las credenciales.
- `GET /api/auth/me`: valida una sesión con `Authorization: Bearer <token>`.
- `POST /api/auth/logout`: revoca esa sesión.

Las contraseñas se guardan mediante scrypt y sal aleatoria. Los tokens de
sesión son aleatorios; MongoDB solo almacena un hash y una expiración de 7 días.
Son cuentas reales del servidor, no un login simulado. No hay recuperación
de contraseña, verificación de correo ni OAuth todavía; para cuentas públicas
hacen falta esos módulos y protección de tasas distribuida.

**Privacidad:** las sesiones de inicio de sesión son independientes del token
privado `SYNC_API_TOKEN` que controla el respaldo de notificaciones de esta
fase de un solo propietario. Iniciar sesión **no activa** el acceso a las
notificaciones ni la sincronización remota. Ninguna notificación personal se
sube por el mero hecho de crear una cuenta.
