import { Schema } from "effect";

export class LoginInput extends Schema.Class<LoginInput>("LoginInput")({
  email: Schema.String,
  password: Schema.String,
}) {}

export class LoginResponse extends Schema.Class<LoginResponse>("LoginResponse")({
  id: Schema.String,
  email: Schema.String,
}) {}

export class RegisterInput extends Schema.Class<RegisterInput>("RegisterInput")({
  username: Schema.String,
  email: Schema.String,
  password: Schema.String,
}) {}

export class RegisterResponse extends Schema.Class<RegisterResponse>("RegisterResponse")({
  id: Schema.String,
  email: Schema.String,
  username: Schema.String,
}) {}

export class RefreshResponse extends Schema.Class<RefreshResponse>("RefreshResponse")({
  success: Schema.Literal(true),
}) {}
