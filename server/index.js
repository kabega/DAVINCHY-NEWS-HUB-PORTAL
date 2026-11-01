import express from "express";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import Parser from "rss-parser";

const app = express();
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const distPath = resolve(projectRoot, "dist");
const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "DavinchyNews/1.0 (+local news reader)" },
});
const feeds = [
  { name: "NTV Uganda", url: "https://ntv.co.ug/feed", homepage: "https://ntv.co.ug/" },
  { name: "Uganda Broadcasting Corporation", url: "https://ubc.go.ug/feed/", homepage: "https://ubc.go.ug/" },
];
const cacheDurationMs = 45_000;
let cachedResponse;
let cachedAt = 0;

app.get("/healthz", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

function plainText(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeItem(item, source) {
  const link = item.link?.trim();
  const title = plainText(item.title);
  if (!link || !title) return null;

  let publishedAt = null;
  const dateValue = item.isoDate || item.pubDate;
  if (dateValue && !Number.isNaN(Date.parse(dateValue))) {
    publishedAt = new Date(dateValue).toISOString();
  }

  const mediaUrl = (media) => {
    const entries = Array.isArray(media) ? media : [media];
    return entries.map((entry) => entry?.url || entry?.$?.url).find((url) => typeof url === "string") || "";
  };
  const enclosure = item.enclosure;
  const enclosureImage = enclosure?.type?.toLowerCase().startsWith("image/") ? enclosure.url : "";
  const content = item["content:encoded"] || item.content || "";
  const embeddedImage = [...(typeof content === "string" ? content : "").matchAll(/<img\b[^>]*>/gi)]
    .map(([tag]) => tag.match(/\b(?:src|data-src)=["']([^"']+)["']/i)?.[1])
    .find((url) => typeof url === "string" && /^https?:\/\//i.test(url)) || "";
  const image = [
    mediaUrl(item["media:content"]),
    mediaUrl(item["media:thumbnail"]),
    enclosureImage,
    embeddedImage,
  ].find((url) => typeof url === "string" && /^https?:\/\//i.test(url)) || "";
  let articleUrl;
  try {
    articleUrl = new URL(link);
  } catch {
    return null;
  }
  if (articleUrl.protocol !== "https:" && articleUrl.protocol !== "http:") return null;

  return {
    id: articleUrl.href,
    title,
    summary: plainText(item.contentSnippet || item.summary || item.content || ""),
    source,
    category: item.categories?.[0] || "Uganda",
    publishedAt,
    url: articleUrl.href,
    image: typeof image === "string" && /^https?:\/\//i.test(image) ? image : "",
  };
}

async function loadFeed(feed) {
  const parsed = await parser.parseURL(feed.url);
  const articles = (parsed.items || [])
    .map((item) => normalizeItem(item, feed.name))
    .filter(Boolean);

  return {
    articles,
    source: { name: feed.name, status: "ok", count: articles.length },
  };
}

app.get("/api/news", async (_request, response) => {
  if (cachedResponse && Date.now() - cachedAt < cacheDurationMs) {
    response.set("Cache-Control", "no-store").json(cachedResponse);
    return;
  }

  const results = await Promise.allSettled(feeds.map(loadFeed));
  const articles = [];
  const sources = results.map((result, index) => {
    if (result.status === "rejected") {
      const error = result.reason instanceof Error ? result.reason.message : "The feed could not be loaded.";
      return { name: feeds[index].name, status: "error", error };
    }

    articles.push(...result.value.articles);
    return result.value.source;
  });

  articles.sort((left, right) => {
    if (Boolean(left.image) !== Boolean(right.image)) return left.image ? -1 : 1;
    if (!left.publishedAt) return 1;
    if (!right.publishedAt) return -1;
    return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
  });

  const payload = { articles: articles.slice(0, 40), sources, updatedAt: new Date().toISOString() };
  if (articles.length === 0) {
    response.status(502).json({ ...payload, error: "No articles could be loaded from the available publisher feeds." });
    return;
  }

  cachedResponse = payload;
  cachedAt = Date.now();
  response.set("Cache-Control", "no-store").json(payload);
});

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API endpoint not found." });
});

app.use(express.static(distPath));
app.get("*", (_request, response, next) => {
  response.sendFile(resolve(distPath, "index.html"), (error) => {
    if (error) next(error);
  });
});

const port = Number(process.env.PORT || process.env.API_PORT || 5175);
app.listen(port, "0.0.0.0", () => {
  console.log(`Davinchy News listening on port ${port}`);
});
