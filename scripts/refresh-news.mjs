import { readFile, writeFile } from 'node:fs/promises';

const feeds = [
  ['MIT Technology Review', 'https://www.technologyreview.com/feed/'],
  ['TechCrunch AI', 'https://techcrunch.com/category/artificial-intelligence/feed/'],
  ['Hugging Face', 'https://huggingface.co/blog/feed.xml'],
  ['The Verge AI', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml'],
  ['Ars Technica AI', 'https://feeds.arstechnica.com/arstechnica/technology-lab']
];

const strip = (value = '') => value.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
const tag = (xml, name) => strip(xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? '');
const items = (xml) => [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map(({ 0: item }) => ({ title: tag(item, 'title'), url: tag(item, 'link'), summary: tag(item, 'description'), date: tag(item, 'pubDate') })).filter((item) => item.title);

const results = [];
for (const [source, url] of feeds) {
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'personal-ai-radar/0.1' } });
    if (!response.ok) continue;
    for (const item of items(await response.text()).slice(0, 3)) {
      results.push({ ...item, source, category: /security|risk|safety/i.test(item.title) ? 'Security' : /device|edge|chip|pc/i.test(item.title) ? 'Edge AI' : /business|startup|fund/i.test(item.title) ? 'Business' : 'Tools' });
    }
  } catch (error) {
    console.warn(`Feed skipped: ${source} (${error.message})`);
  }
}

const existing = JSON.parse(await readFile('data/news.json', 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const fresh = results.slice(0, 12).map((item, index) => ({
  id: `feed-${today}-${index}`,
  title: item.title,
  source: item.source,
  date: today,
  time: new Date().toISOString().slice(11, 16),
  category: item.category,
  tag: index < 3 ? 'Fresh signal' : 'From the radar',
  summary: item.summary.replace(/\s+/g, ' ').slice(0, 240),
  readTime: '5 min',
  impact: index < 4 ? 'High' : 'Medium',
  url: item.url
}));

await writeFile('data/news.json', JSON.stringify({ updatedAt: new Date().toISOString(), stories: fresh.length ? fresh : existing.stories }, null, 2) + '\n');
console.log(`Saved ${fresh.length || existing.stories.length} stories.`);
