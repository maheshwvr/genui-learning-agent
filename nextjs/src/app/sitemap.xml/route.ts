export async function GET(request: Request) {
  // Build absolute origin from the incoming request so this works in dev and production
  const url = new URL(request.url);
  const origin = url.origin;

  // Static routes to include in the sitemap. Extend this array as you add pages.
  const staticPaths = [
    '/',
    '/marketing',
    '/legal',
    '/learn',
    '/app',
  ];

  const urls = staticPaths
    .map((path) => {
      return `  <url>\n    <loc>${origin}${path}</loc>\n  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
