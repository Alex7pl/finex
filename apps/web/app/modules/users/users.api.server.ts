import { Schema } from "effect";
import {
  UserProfile,
  type UpdateUserProfileInput,
} from "@finex/shared/users/users.schema.js";
import { ApiError } from "@/libs/api-error.js";
import { serverHttp, type ServerHttpClient } from "@/libs/http.server.js";

export function createUsersApi(client: ServerHttpClient) {
  return {
    async updateProfile(request: Request, input: UpdateUserProfileInput) {
      const result = await client<unknown>("/users/me", {
        request,
        method: "PATCH",
        body: input,
      });
      try {
        return {
          data: Schema.decodeUnknownSync(UserProfile)(result.data),
          headers: result.headers,
        };
      } catch {
        throw new ApiError(
          502,
          "InvalidApiResponse",
          undefined,
          result.headers,
        );
      }
    },
  };
}
export const usersApi = createUsersApi(serverHttp);
