// Vitest stub for the `server-only` package. The real package
// unconditionally throws unless a bundler (Next's webpack/Turbopack build)
// specially aliases it away for server-side code — Vitest has no such
// aliasing, so we provide a no-op here instead. Wired in via
// `resolve.alias` in vitest.config.mts.
export {};
