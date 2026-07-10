export function isTaggedError(error: unknown, tag: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === tag
  );
}

export function isUnauthorized(error: unknown): boolean {
  return isTaggedError(error, "Unauthorized");
}
