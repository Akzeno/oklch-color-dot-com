/**
 * Resolver hook that lets plain Node load this project's `.ts` sources, which
 * use extensionless relative imports (Vite/Astro resolve those; Node does not).
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // Only retry bare relative specifiers that failed on the extension.
    if (!specifier.startsWith('.')) throw err;
    const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
    const base = new URL(specifier, new URL('file:///' + parentPath.replace(/\\/g, '/')));

    for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
      const candidate = new URL(base.href + ext);
      if (existsSync(fileURLToPath(candidate))) {
        return nextResolve(candidate.href, context);
      }
    }
    throw err;
  }
}