import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseService } from "@/db/db.service.js";
import { user_tokens } from "@/db/schema/tokens.js";
import { Context, Effect, Layer } from "effect";
import { DatabaseError } from "@/shared/errors.js";

process.env.DATABASE_URL = "postgres://test:test@localhost/test";
process.env.JWT_ACCESS_SECRET = "access-secret-at-least-thirty-two-characters";
process.env.JWT_REFRESH_SECRET = "refresh-secret-at-least-thirty-two-characters";
process.env.JWT_ISSUER = "finex-test";
process.env.JWT_AUDIENCE = "finex-test-api";
process.env.JWT_ACCESS_EXPIRES_IN_SECONDS = "900";
process.env.JWT_REFRESH_EXPIRES_IN_SECONDS = "604800";

const [{ AuthRepositoryPostgresLayer }, { AuthRepository }] = await Promise.all([
  import("./auth.repository.postgres.js"),
  import("./auth.repository.js"),
]);

test("maps refresh-token fields to the user_tokens insert", async () => {
  const expiresAt = new Date("2030-01-02T03:04:05.000Z");
  let insertedTable: unknown;
  let insertedValues: unknown;
  const fakeDb = {
    insert: (table: unknown) => {
      insertedTable = table;
      return {
        values: (values: unknown) => {
          insertedValues = values;
          return Promise.resolve();
        },
      };
    },
  };

  const program = Effect.gen(function* () {
    const repository = yield* AuthRepository;
    yield* repository.saveRefreshToken({
      userId: "8eb5a286-0d46-4f0e-a93f-f1681a6cb021",
      familyId: "846dd67f-277a-4373-bf11-26fbf8bbdcf4",
      tokenHash: "hashed-refresh-token",
      expiresAt,
    });
  }).pipe(
    Effect.provide(AuthRepositoryPostgresLayer),
    Effect.provide(Layer.succeed(DatabaseService, fakeDb as never)),
  );

  await Effect.runPromise(program);

  assert.equal(insertedTable, user_tokens);
  assert.deepEqual(insertedValues, {
    user_id: "8eb5a286-0d46-4f0e-a93f-f1681a6cb021",
    family_id: "846dd67f-277a-4373-bf11-26fbf8bbdcf4",
    token_hash: "hashed-refresh-token",
    expires_at: expiresAt,
  });
});

test("AppLayer resolves repository database dependencies", async () => {
  const [{ AppLayer }, { UserRepository }] = await Promise.all([
    import("@/runtime/app-layer.js"),
    import("../users/users.repository.js"),
  ]);

  const context = await Effect.runPromise(
    Layer.build(AppLayer).pipe(Effect.scoped),
  );

  assert.ok(Context.get(context, AuthRepository));
  assert.ok(Context.get(context, UserRepository));
});

test("maps insert rejection to DatabaseError while preserving its cause", async () => {
  const cause = new Error("insert rejected");
  const fakeDb = {
    insert: () => ({ values: () => Promise.reject(cause) }),
  };
  const program = Effect.gen(function* () {
    const repository = yield* AuthRepository;
    yield* repository.saveRefreshToken({
      userId: "8eb5a286-0d46-4f0e-a93f-f1681a6cb021",
      familyId: "846dd67f-277a-4373-bf11-26fbf8bbdcf4",
      tokenHash: "hashed-refresh-token",
      expiresAt: new Date("2030-01-02T03:04:05.000Z"),
    });
  }).pipe(
    Effect.provide(AuthRepositoryPostgresLayer),
    Effect.provide(Layer.succeed(DatabaseService, fakeDb as never)),
    Effect.either,
  );

  const result = await Effect.runPromise(program);

  assert.equal(result._tag, "Left");
  if (result._tag === "Left") {
    assert.ok(result.left instanceof DatabaseError);
    assert.equal(result.left.message, "Failed to persist refresh token");
    assert.equal(result.left.cause, cause);
  }
});
