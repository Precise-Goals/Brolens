# Coding Standard

- Preserve the existing Next.js `src/app` structure.
- Keep business logic in `src/lib` and UI composition in `src/components`.
- Server-only secrets stay outside Client Components and outside `NEXT_PUBLIC_*`.
- Treat logs, AI output, and fetched content as untrusted data.
