# FineX Web

Aplicación React Router que actúa como Backend For Frontend de FineX.

El navegador habla únicamente con esta aplicación. Los loaders y actions de
servidor se comunican con Express mediante `app/libs/http.server.ts` y propagan
las cookies de sesión.

```bash
pnpm --filter @finex/web dev
pnpm --filter @finex/web check:architecture
pnpm --filter @finex/web test
pnpm --filter @finex/web typecheck
pnpm --filter @finex/web build
```

Variables:

```bash
API_URL=http://localhost:3000
```

Consulta [la arquitectura frontend](../../docs/frontend-architecture.md) antes
de añadir rutas, módulos de API o estado global.
