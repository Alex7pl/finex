import { Layer } from "effect";
import { db } from "./client.js";
import { DatabaseService } from "./db.service.js";

export const DatabaseLayer = Layer.succeed(DatabaseService, db);
