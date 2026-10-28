# Usuario y perfil

Estas rutas trabajan exclusivamente con el usuario de la sesión. No aceptan un
ID de usuario del cliente ni permiten consultar perfiles de otras personas.
El alta sigue disponible en `POST /auth/register`.

## Consultar el perfil

`GET /users/me`

Devuelve el perfil persistido en la base de datos, con nombre, correo y fechas:

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "email": "ana@example.com",
  "username": "Ana López",
  "created_at": "2026-10-19T12:00:00.000Z",
  "updated_at": "2026-10-19T12:00:00.000Z"
}
```

Las fechas son ISO en UTC. No se devuelven contraseñas, hashes ni tokens. El
nombre y el correo se leen de la base de datos; no dependen de los datos antiguos
de la cookie. El contrato compartido es `UserProfile`, exportado desde
`@finex/shared/users/users.schema.js`.

## Editar el perfil

`PATCH /users/me`

Requiere sesión y `Origin` o `Referer` del `WEB_ORIGIN` autorizado. Acepta un
subconjunto no vacío de estos campos:

```json
{ "username": "Ana Paniagua" }
```

`username` se recorta y debe tener entre 2 y 40 caracteres, igual que en el alta.
Para cambiar el correo de acceso se exige la contraseña actual:

```json
{
  "email": "ana.nueva@example.com",
  "current_password": "contraseña actual"
}
```

El correo se recorta, se convierte a minúsculas y debe tener formato válido y
como máximo 254 caracteres. Si coincide con el correo guardado tras normalizarlo,
no se exige contraseña. `current_password` no se guarda ni se incluye en la
respuesta. Los campos desconocidos, como `id`, `password` o `role`, se rechazan.

La respuesta es el mismo `UserProfile` actualizado, con HTTP 200. Se renueva la
cookie `accessToken` httpOnly con el correo actualizado; se conserva la cookie de
refresh. El BFF debe propagar el encabezado `Set-Cookie` al navegador, como en el
resto de operaciones de autenticación.

Errores con el contrato común `{ "error": { "code": "…", "requestId": "…" } }`:

| Estado | Código | Motivo |
| --- | --- | --- |
| 400 | `ValidationError` | Input inválido, vacío o contraseña actual ausente al cambiar correo. |
| 401 | `UnauthorizedError` | Sin sesión, origen no autorizado o contraseña actual incorrecta. |
| 404 | `UserNotFound` | La sesión identifica un usuario que ya no existe. |
| 409 | `UserAlreadyExists` | El correo o nombre de usuario ya está ocupado. |
| 500 | `DatabaseError` | Fallo de persistencia; sin detalles internos en la respuesta. |

No se requieren cambios de esquema ni migraciones nuevas para estas rutas.
Los datos disponibles en el modelo actual son nombre de usuario y correo; no se
introducen avatar, preferencias ni otras propiedades de perfil sin definir.

## Verificación

```bash
pnpm typecheck
pnpm --filter @finex/api test
# Activa la prueba PostgreSQL de perfiles con tablas TEMP aisladas:
USERS_TEST_DATABASE_URL=postgres://usuario:clave@localhost/base_de_pruebas pnpm --filter @finex/api test
```

La integración de usuarios también acepta `TRANSACTIONS_TEST_DATABASE_URL`, para
poder ejecutar juntas todas las pruebas de SQL. Sin ambas variables, solo se
omite la integración PostgreSQL del perfil.
