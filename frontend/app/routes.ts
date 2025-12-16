import { type RouteConfig, layout, index, route } from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", [
    index("routes/_index.tsx"),
    route("login", "routes/_layout.login.tsx"),
    route("signup", "routes/_layout.signup.tsx"),
    route("problems", "routes/_layout.problems.tsx"),
    route("problems/:id", "routes/_layout.problems.$id.tsx"),
    route("sandbox", "routes/_layout.sandbox.tsx"),
  ]),
] satisfies RouteConfig;
