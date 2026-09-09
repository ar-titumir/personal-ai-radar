import { readFile, writeFile } from 'node:fs/promises';

const feeds = [
  ['MIT Technology Review', 'https://www.technologyreview.com/feed/'],
  ['TechCrunch AI', 'https://techcrunch.com/category/artificial-intelligence/feed/'],
  ['Hugging Face', 'https://huggingface.co/blog/feed.xml'],
  ['The Verge AI', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml'],
  ['Ars Technica AI', 'https://feeds.arstechnica.com/arstechnica/technology-lab']
];

const decode = (value = '') => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'").replace(/&#0*8217;/g, '’');
const strip = (value = '') => decode(value.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
const tag = (xml, name) => strip(xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? '');
const validUrl = (value) => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
const itemLink = (item) => validUrl(tag(item, 'link') || item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || '');
const items = (xml) => [...xml.matchAll(/<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi)].map(({ 0: item }) => ({ title: tag(item, 'title'), url: itemLink(item), summary: tag(item, 'description') || tag(item, 'summary') || tag(item, 'content'), date: tag(item, 'pubDate') || tag(item, 'published') || tag(item, 'updated') })).filter((item) => item.title && item.url);
const articleText = (html = '') => {
  const jsonLd = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => { try { return JSON.parse(match[1]); } catch { return null; } })
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => value?.articleBody || '')
    .find(Boolean);
  if (jsonLd) return strip(jsonLd);
  const meta = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const article = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || html;
  return strip(article.replace(/<(script|style|nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ')) || strip(meta || '');
};
const summarize = (text = '', fallback = '') => {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g)?.map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 45) || [];
  const selected = [];
  let length = 0;
  for (const sentence of sentences) {
    if (selected.length >= 3 || length + sentence.length > 560) break;
    selected.push(sentence);
    length += sentence.length;
  }
  return (selected.join(' ') || fallback).replace(/\s+/g, ' ').trim().slice(0, 560);
};
const fetchArticleSummary = async (item) => {
  const fallback = item.summary || `This article examines ${item.title}.`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(item.url, { headers: { 'user-agent': 'personal-ai-radar/0.1', accept: 'text/html' }, signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return summarize(item.summary, fallback);
    const html = await response.text();
    return summarize(articleText(html), fallback);
  } catch {
    return summarize(item.summary, fallback);
  }
};

const resultsByFeed = [];
for (const [source, url] of feeds) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, { headers: { 'user-agent': 'personal-ai-radar/0.1', accept: 'application/rss+xml, application/atom+xml, text/xml' }, signal: controller.signal });
    clearTimeout(timeout);
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || (!contentType.includes('xml') && !contentType.includes('rss') && !contentType.includes('atom') && !contentType.includes('text'))) continue;
    const body = await response.arrayBuffer();
    if (body.byteLength > 1_000_000) continue;
    const feedStories = [];
    for (const item of items(new TextDecoder().decode(body)).slice(0, 3)) {
      feedStories.push({ ...item, source, category: /security|risk|safety/i.test(item.title) ? 'Security' : /device|edge|chip|pc/i.test(item.title) ? 'Edge AI' : /business|startup|fund/i.test(item.title) ? 'Business' : 'Tools' });
    }
    if (feedStories.length) resultsByFeed.push(feedStories);
  } catch (error) {
    console.warn(`Feed skipped: ${source} (${error.name === 'AbortError' ? 'timeout' : error.message})`);
  }
}

const existing = JSON.parse(await readFile('data/news.json', 'utf8'));
const now = new Date();
const bdParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
const bd = (type) => bdParts.find((part) => part.type === type)?.value;
const today = `${bd('year')}-${bd('month')}-${bd('day')}`;
const currentTime = `${bd('hour')}:${bd('minute')}`;
const results = resultsByFeed.flatMap((feed) => feed.map((story, index) => ({ story, index }))).sort((a, b) => a.index - b.index).map(({ story }) => story);
const fresh = await Promise.all(results.slice(0, 12).map(async (item, index) => ({
  id: `feed-${today}-${index}`,
  title: item.title,
  source: item.source,
  date: today,
  time: currentTime,
  category: item.category,
  tag: index < 3 ? 'Fresh signal' : 'From the radar',
  summary: await fetchArticleSummary(item),
  readTime: '5 min',
  impact: index < 4 ? 'High' : 'Medium',
  url: item.url
})));

const byUrl = new Map();
for (const story of [...existing.stories, ...fresh]) {
  if (story.url) byUrl.set(story.url, story);
}
const enriched = await Promise.all([...byUrl.values()].map(async (story) => story.summary?.trim() ? story : { ...story, summary: await fetchArticleSummary(story) }));
const stories = enriched.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
await writeFile('data/news.json', JSON.stringify({ updatedAt: now.toISOString(), stories }, null, 2) + '\n');
console.log(`Saved ${fresh.length} fresh stories; archive now contains ${stories.length} stories.`);
