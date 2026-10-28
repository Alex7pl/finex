# FineX

Monorepo de la aplicación financiera FineX.

```bash
pnpm install
docker compose up -d postgres
pnpm dev
```

El PostgreSQL de Docker está disponible en `127.0.0.1:5433`, con usuario `app`, contraseña `app` y base `finex_db`. Configura `apps/api/.env` siguiendo `apps/api/.env.example`. El puerto 5433 evita conflictos con otros servicios locales que usan 5432. Tras cambiar `.env`, reinicia el proceso de desarrollo.

Para añadir datos mock al usuario existente `test@gmail.com` en PostgreSQL local:

```bash
pnpm --filter @finex/api db:seed:demo
```

Requiere las migraciones aplicadas y usa `apps/api/.env`. Conserva la contraseña
y los datos existentes; las filas mock tienen IDs estables para evitar duplicados
al repetir la carga. Incluye 12 meses de movimientos, cuentas, categorías,
presupuestos, objetivos de ahorro y deudas, identificados con `Mock ·`.

Documentación principal:

- [Arquitectura frontend y BFF](docs/frontend-architecture.md)
- [Guía de desarrollo](docs/dev-guide.md)
- [Composición de componentes](apps/web/COMPONENT_COMPOSITION.md)
