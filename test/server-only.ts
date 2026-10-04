// Next.js resolves `import "server-only"` itself (the package is not
// installed). Vitest runs server modules directly, so it maps the import to
// this empty module (vitest.config.mts).
export {};
