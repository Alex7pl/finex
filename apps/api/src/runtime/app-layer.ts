import { DatabaseLayer } from "@/db/db.layer.js";
import { AccountRepositoryPostgresLayer } from "@/modules/accounts/accounts.repository.postgres.js";
import { AuthRepositoryPostgresLayer } from "@/modules/auth/auth.repository.postgres.js";
import { BudgetRepositoryPostgresLayer } from "@/modules/budgets/budgets.repository.postgres.js";
import { CategoryRepositoryPostgresLayer } from "@/modules/categories/categories.repository.postgres.js";
import { SavingsRepositoryPostgresLayer } from "@/modules/savings/savings.repository.postgres.js";
import { TransactionRepositoryPostgresLayer } from "@/modules/transactions/transactions.repository.postgres.js";
import { UserRepositoryPostgresLayer } from "@/modules/users/users.repository.postgres.js";
import { LedgerRepositoryPostgresLayer } from "@/modules/ledger/ledger.repository.postgres.js";
import { Layer } from "effect";

export const AppLayer = Layer.mergeAll(
  UserRepositoryPostgresLayer,
  AuthRepositoryPostgresLayer,
  AccountRepositoryPostgresLayer,
  TransactionRepositoryPostgresLayer,
  CategoryRepositoryPostgresLayer,
  BudgetRepositoryPostgresLayer,
  SavingsRepositoryPostgresLayer,
  LedgerRepositoryPostgresLayer,
).pipe(Layer.provide(DatabaseLayer));
