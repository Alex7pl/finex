import { isRouteErrorResponse } from "react-router";

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;
  let requestId: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      message = "404";
      details = "The requested page could not be found.";
    } else if (error.status >= 500) {
      message = "Something went wrong";
      details = "The service is temporarily unavailable. Please try again.";
    } else {
      message = "Request failed";
      details = "We could not complete your request.";
    }

    if (
      typeof error.data === "object" &&
      error.data !== null &&
      "requestId" in error.data &&
      typeof error.data.requestId === "string"
    ) {
      requestId = error.data.requestId;
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {requestId && <p>Request ID: {requestId}</p>}
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
