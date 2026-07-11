import { Schema } from "effect";

export class LoginInput extends Schema.Class<LoginInput>("LoginInput")({
  email: Schema.String,
  password: Schema.String,
}) {}

export class LoginResponse extends Schema.Class<LoginResponse>("LoginResponse")({
  id: Schema.String,
  email: Schema.String,
  accessToken: Schema.String,
  refreshToken: Schema.String,
}) {}
