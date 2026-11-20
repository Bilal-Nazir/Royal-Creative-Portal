/** Next.js server-boot hook — fails fast on invalid env instead of surfacing later inside a DB/session call. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./src/server/env");
  }
}
