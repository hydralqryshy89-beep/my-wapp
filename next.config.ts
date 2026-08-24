import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app renders every page from the database on every request
  // (see `dynamic = "force-dynamic"` in the root layout). Disable the
  // client-side Router Cache's stale window so mutations (create/update/
  // delete) are always reflected immediately after a redirect, with no
  // stale flash before a manual refresh.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
};

export default nextConfig;
