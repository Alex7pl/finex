import { UserRepositoryPostgresLayer } from "@/modules/users/users.repository.postgres.js";
import { Layer } from "effect";

export const AppLayer = Layer.mergeAll(UserRepositoryPostgresLayer);
