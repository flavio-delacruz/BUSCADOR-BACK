# BUSCADOR-BACK

Backend de demostración de **Buscador**, construido con Express, TypeScript y preparado para MongoDB. **No recibe ni almacena contenidos de notificaciones o pulsaciones de teclado.**

## Ejecutar desde Termux

```bash
pkg install nodejs-lts git -y
git clone https://github.com/flavio-delacruz/BUSCADOR-BACK.git
cd BUSCADOR-BACK
npm install
cp .env.example .env
npm run dev
```

Prueba local:

```bash
curl http://127.0.0.1:4000/api/health
curl 'http://127.0.0.1:4000/api/search?q=react'
```

Si quieres MongoDB Atlas, configura `MONGODB_URI` **solo en `.env`**. Nunca subas claves a GitHub. La API puede funcionar sin MongoDB en modo demostración.

## Rutas actuales

- `GET /api/health`: estado de la API.
- `GET /api/search?q=texto&category=Educación`: busca en un catálogo de ejemplo.

## Privacidad

El almacenamiento de datos personales requerirá autenticación, control de acceso y consentimiento explícito antes de habilitar endpoints adicionales.
