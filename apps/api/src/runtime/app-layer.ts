import { DatabaseLayer } from "@/db/db.layer.js";
import { AccountRepositoryPostgresLayer } from "@/modules/accounts/accounts.repository.postgres.js";
import { AuthRepositoryPostgresLayer } from "@/modules/auth/auth.repository.postgres.js";
import { CategoryRepositoryPostgresLayer } from "@/modules/categories/categories.repository.postgres.js";
import { TransactionRepositoryPostgresLayer } from "@/modules/transactions/transactions.repository.postgres.js";
import { UserRepositoryPostgresLayer } from "@/modules/users/users.repository.postgres.js";
import { Layer } from "effect";

export const AppLayer = Layer.mergeAll(
  UserRepositoryPostgresLayer,
  AuthRepositoryPostgresLayer,
  AccountRepositoryPostgresLayer,
  TransactionRepositoryPostgresLayer,
  CategoryRepositoryPostgresLayer,
).pipe(Layer.provide(DatabaseLayer));
