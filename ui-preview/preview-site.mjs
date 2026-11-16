import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist", import.meta.url));
const port = Number(process.env.ONESIGHT_PREVIEW_PORT || 5174);
const pages = new Set(["/index.html", "/work/index.html"]);
const mime = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".mp4": "video/mp4", ".webm": "video/webm",
};
const embed = `<style id="onesight-preview-theme">
:root{
  --background:#f4f2ec;--foreground:#191919;
  --card:#e2e2e2;--card-foreground:#191919;
  --popover:#f4f2ec;--popover-foreground:#191919;
  --primary:#e83024;--primary-foreground:#fff;
  --secondary:#181515;--secondary-foreground:#f4f2ec;
  --muted:#e0ded9;--muted-foreground:#68645e;
  --accent:#e7c9c1;--accent-foreground:#302522;
  --destructive:#b72720;--border:#c3c3c3;--input:#c3c3c3;--ring:#e83024;--radius:1rem;
  --font-sans:DM, "DM Sans", Arial, sans-serif;
  --paper:var(--background);--ink:var(--foreground);--red:var(--primary);
  --line:var(--border);--white:var(--background);--black:var(--foreground)
}
body{background:var(--background);color:var(--foreground);font-family:var(--font-sans)}
#home :is(.services,.studio-intro,.faq),body>header{background:var(--background);color:var(--foreground)}
#home .services .service-list details[open]{background:var(--card);color:var(--card-foreground)}
#home .services .service-body p{color:var(--muted-foreground)}
#home .services .service-body .tags>span{background:var(--accent);color:var(--accent-foreground)}
#home :is(.reviews,.process-preview,.about),.chapter-cut,.editorial-work,body>footer{background:var(--secondary);color:var(--secondary-foreground)}
#home :is(.about-copy,.process-lines) p,.chapter-cut span{color:var(--secondary-foreground)}
.interactive-cta.interactive-cta{--cta-accent:var(--primary);border-radius:calc(var(--radius) * 2)}
.interactive-cta .cta-reveal{color:var(--primary-foreground)}
:where(input,textarea,select):focus-visible{outline-color:var(--ring)}
</style>
<script src="https://tweakcn.com/live-preview.min.js" defer></script>`;

await stat(resolve(root, "index.html"));
await stat(resolve(root, "work/index.html"));
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Content-Security-Policy", "frame-ancestors https://tweakcn.com");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  try {
    let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname === "/work") pathname += "/";
    if (pathname.startsWith("/api/")) {
      const isReviews = pathname === "/api/reviews";
      res.writeHead(isReviews ? 200 : 503, { "Content-Type": "application/json" });
      res.end(req.method === "HEAD" ? undefined : JSON.stringify(isReviews ? { reviews: [] } : { ready: false }));
      return;
    }
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = resolve(root, "." + pathname);
    if (!file.startsWith(root + sep)) { res.writeHead(404).end(); return; }
    let body = await readFile(file);
    if (pages.has(pathname)) {
      const html = body.toString("utf8");
      if (!/<\/head>/i.test(html)) throw new Error("Missing HTML head");
      body = html.replace(/<\/head>/i, () => embed + "\n</head>");
    }
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    res.writeHead(error.code === "ENOENT" || error.code === "EISDIR" ? 404 : 500).end();
  }
});
server.on("error", error => {
  console.error(error.code === "EADDRINUSE" ? "Preview port is already in use. Set ONESIGHT_PREVIEW_PORT to a free port." : error.message);
  process.exitCode = 1;
});
server.listen(port, "localhost", () => {
  console.log("OneSight website: http://localhost:" + port + "/");
  console.log("Portfolio: http://localhost:" + port + "/work/");
  console.log("Paste either URL into tweakcn → Custom. Forms do not submit in this preview.");
});
