# Dashboard conectado

`GET /dashboard` carga el perfil y los datos desde Express a través del BFF. El
navegador no conoce la dirección interna de la API ni accede a la base de datos.

| Vista | API real |
| --- | --- |
| Nombre, iniciales y perfil | `GET /users/me` |
| Edición del perfil | `PATCH /users/me`, mediante la action de `/dashboard` |
| Cuentas y saldos actuales | `GET /accounts` |
| Gráfico y balance del mes | `GET /accounts/balance-history` |
| Movimientos, búsqueda y paginación | `GET /transactions` |
| Detalle y transferencias internas | `GET /transactions/:id` |
| Presupuestos y consumo | `GET /budgets` |
| Objetivos y progreso | `GET /savings` |

El dashboard ya no monta ni ofrece insights en el catálogo. Las preferencias
antiguas descartan ese widget al hidratarse. Se conservan las opciones de
personalización de tamaño, orden y visibilidad de los demás widgets.

## Filtros y periodos

`month=YYYY-MM`, `accountId`, `search`, `page` y `range=week|month|year` viven en
la URL. La búsqueda solo afecta al listado de movimientos; la cuenta afecta al
saldo del periodo, al consumo de presupuestos, a los movimientos y a los
objetivos. La lista de cuentas muestra siempre todos los saldos actuales.

Los meses usan calendario `Europe/Madrid`, incluido el cambio de hora. Por defecto
se muestra el mes actual hasta el instante de carga; los meses anteriores se
muestran completos. No se admiten meses futuros. El gráfico de semana cubre los
últimos siete días hasta ese cierre; el de año empieza once meses antes del mes
seleccionado y usa puntos mensuales. El balance de ingresos/gastos y los
presupuestos conservan el mes seleccionado aunque cambie el periodo del gráfico.

El detalle de movimiento usa `transactionId` en la URL. Las transferencias se
muestran con origen y destinos, en una sola fila y sin signo de ingreso/gasto.
El perfil se abre como diálogo y se guarda con un fetcher; el loader revalida
los datos después del cambio.

## Sesión, errores y estados vacíos

El loader del dashboard se autentica por sí mismo, sin depender del orden de
los loaders. Primero lee `/users/me` y reenvía las cookies renovadas a las
peticiones posteriores. Estas se realizan en paralelo; las cookies recibidas
se conservan también si falla otro widget. Las respuestas son privadas y no
se almacenan en caché.

Las respuestas de Express se validan con los schemas compartidos. Un fallo de
API o un DTO inválido se muestra mediante la frontera de error existente; no
se sustituye por cifras inventadas ni por ceros de reserva. Las respuestas
válidas sin registros muestran estados vacíos. Los importes se mantienen como
texto decimal y se formatean con céntimos exactos; solo el gráfico y las
proporciones visuales convierten sus valores a números.

## API de cuentas completada para esta conexión

- `GET /accounts`: array `UpdatedAccount`, con emoji/color y tipos de interés
  nullable. Los tipos de interés son texto decimal, igual que PostgreSQL.
- `GET /accounts/:accountId`: detalle exclusivo del propietario.
- `GET /accounts/balance-history?dateFrom=<ISO>&dateTo=<ISO>&interval=day|month&accountId=<uuid>`:
  `HistoryBalance`. Los instantes requieren zona horaria, `dateFrom` es inclusivo
  y `dateTo` exclusivo. Periodo positivo de hasta 367 días. Cuenta opcional propia.

El histórico conserva `total_balance`, `initial_balance`, `last_period_balance`
y `history[].acumulated_balance` por compatibilidad. `last_period_balance` sigue
representando el cambio del periodo anterior de la misma duración; el dashboard
no lo interpreta como saldo. Se añaden `income` y `expenses` para el periodo.

Los saldos solo cuentan splits `Completed`. Cada parte completada de una
transferencia acredita el destino y debita el origen por el mismo importe:
las transferencias internas se compensan en el saldo consolidado y no cuentan
como ingresos o gastos. Los pendientes no afectan al saldo. Se aplica el mismo
control de propiedad de todas las cuentas que en el listado de transacciones.
La fecha disponible es `transactions.created_at`.

## Verificación

```bash
pnpm typecheck
pnpm --filter @finex/web test
TRANSACTIONS_TEST_DATABASE_URL=postgres://usuario:clave@localhost/base_de_pruebas pnpm --filter @finex/api test
pnpm --filter @finex/web build
```

La integración de navegador se comprobó con una API y PostgreSQL temporales:
login, carga completa, búsqueda, filtro por cuenta, detalle de transferencia y
edición del perfil. No requiere nuevas migraciones respecto al esquema de
categorías y presupuestos ya creado.
