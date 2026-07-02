import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  // Handle case-insensitive routing for /cbd and /CBD -> / (homepage)
  const url = context.url;
  const pathname = url.pathname;
  
  if (pathname === '/CBD' || pathname === '/CBD/' ||
      pathname === '/cbd' || pathname === '/cbd/') {
    return Response.redirect(new URL('/', url), 301);
  }

  // Normalize a mis-cased pelvic wand path (e.g. /PelvicWand) to the canonical
  // lowercase /pelvicwand. Only redirect when the path actually contains
  // uppercase letters — never the canonical page itself (which Astro serves at
  // /pelvicwand/ with a trailing slash), or we'd redirect the real page away.
  // The deploy step emits a PelvicWand static route so this baked redirect is
  // reachable on static GitHub Pages — see .github/workflows/deploy.yml.
  if (pathname.replace(/\/$/, '').toLowerCase() === '/pelvicwand' &&
      pathname !== pathname.toLowerCase()) {
    return Response.redirect(new URL('/pelvicwand', url), 301);
  }

  return next();
};

