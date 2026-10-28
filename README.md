# FineX

Monorepo de la aplicación financiera FineX.

```bash
pnpm install
pnpm dev
```

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
