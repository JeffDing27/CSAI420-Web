import {
  matchers,
  routes
} from "@vercel/config/v1";

export const config = {
  framework: "nextjs",
  rewrites: [
    routes.rewrite("/:path*", "/:path*", {
      has: [matchers.header("suresteps.session.token")],
      requestHeaders: {
        "x-suresteps-session-token": "legacy-header-present",
      },
      responseHeaders: {
        "x-legacy-header-detected": "1",
      },
    }),
  ],
};
