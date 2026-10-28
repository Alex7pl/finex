import { Outlet } from "react-router";

// Each private loader authenticates its own request through the BFF. Parent and
// child loaders run concurrently, so session refresh must have one owner.
export default function AuthLayout() {
  return <Outlet />;
}
