import { Layer } from "effect";
import { DatabaseLayer } from "../db/db.layer.js";

export const AppLayer = Layer.mergeAll(DatabaseLayer);
