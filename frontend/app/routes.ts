import { type RouteConfig, layout, index, route } from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", [
    index("routes/_layout.sandbox.tsx"),
  ]),
] satisfies RouteConfig;
