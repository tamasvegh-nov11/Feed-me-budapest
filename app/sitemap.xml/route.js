export const dynamic = "force-static";

export async function GET() {
  const baseUrl = "https://www.feedme-budapest.com";

  const urls = [
    {
      loc: baseUrl,
      changefreq: "weekly",
      priority: "1.0",
    },
    {
      loc: `${baseUrl}/how-it-works`,
      changefreq: "monthly",
      priority: "0.8",
    },
    {
      loc: `${baseUrl}/about`,
      changefreq: "monthly",
      priority: "0.8",
    },
    {
      loc: `${baseUrl}/contact`,
      changefreq: "monthly",
      priority: "0.6",
    },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (item) => `  <url>
    <loc>${item.loc}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
