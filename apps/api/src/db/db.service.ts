import { Context } from "effect";
import { db } from "./client.js";

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  typeof db
>() {}
