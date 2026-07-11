import { DatabaseLayer } from "@/db/db.layer.js";
import { AuthRepositoryPostgresLayer } from "@/modules/auth/auth.repository.postgres.js";
import { UserRepositoryPostgresLayer } from "@/modules/users/users.repository.postgres.js";
import { Layer } from "effect";

export const AppLayer = Layer.mergeAll(
  UserRepositoryPostgresLayer,
  AuthRepositoryPostgresLayer,
).pipe(Layer.provide(DatabaseLayer));
