export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
    readonly headers: Headers = new Headers(),
  ) {
    super(`API request failed with ${status} ${code}`);
    this.name = "ApiError";
  }
}
