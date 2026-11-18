export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Guards against open-redirect: only a same-site relative path is a safe `returnTo` target. */
export function isSafeReturnTo(path: string | null): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/api");
}
