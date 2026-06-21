import { Context } from "effect";

export type AuthenticatedUser = {
  id: string;
  email: string;
};

export class RequestContext extends Context.Tag("RequestContext")<
  RequestContext,
  {
    requestId: string;
    user: AuthenticatedUser | null;
  }
>() {}

export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  AuthenticatedUser
>() {}
