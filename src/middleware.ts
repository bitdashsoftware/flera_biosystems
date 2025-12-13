import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  // Handle case-insensitive routing for /cbd and /CBD -> / (homepage)
  const url = context.url;
  const pathname = url.pathname;
  
  if (pathname === '/CBD' || pathname === '/CBD/' || 
      pathname === '/cbd' || pathname === '/cbd/') {
    return Response.redirect(new URL('/', url), 301);
  }
  
  return next();
};

