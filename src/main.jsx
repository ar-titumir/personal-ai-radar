import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight, Bell, Bookmark, ChevronLeft, ChevronRight, CircleDot, Clock3, Compass, Cpu,
  ExternalLink, Flame, LayoutDashboard, ListFilter, ListTodo, Loader2, Map, Menu, MessageSquare,
  Radar, Search, ShieldCheck, Sparkles, X
} from 'lucide-react';
import './styles.css';

/* ---------------------------------------------------------------------- */
/* Data layer                                                              */
/*                                                                         */
/* Every day of news lives in its own permanent file: data/news_YYYY-MM-  */
/* DD.json. Hermes creates today's file each morning and never rewrites a */
/* previous day's file, so the archive only grows. The date itself comes  */
/* from the filename (the single source of truth) rather than a field    */
/* repeated on every story, which is what caused the old single-file      */
/* dataset to drift out of sync with its own ids.                         */
/* ---------------------------------------------------------------------- */

const dayFiles = import.meta.glob('../data/news_*.json');
const DATE_RE = /news_(\d{4}-\d{2}-\d{2})\.json$/;
const availableDates = Object.keys(dayFiles)
  .map((path) => path.match(DATE_RE)?.[1])
  .filter(Boolean)
  .sort()
  .reverse();

const loadDay = async (date) => {
  const path = Object.keys(dayFiles).find((key) => key.endsWith(`news_${date}.json`));
  if (!path) return [];
  const mod = await dayFiles[path]();
  const body = mod?.default ?? mod;
  return (body?.stories ?? []).map((story) => ({ ...story, date }));
};

const RECENT_WINDOW = 3;
const PRIORITY_CATEGORIES = new Set(['Edge AI', 'Security', 'Robotics']);

const nav = [
  { label: 'Today', icon: LayoutDashboard },
  { label: 'AI Radar', icon: Radar },
  { label: 'Business signals', icon: Compass },
  { label: 'Saved', icon: Bookmark },
  { label: 'Roadmap', icon: Map },
];
const categories = ['All signals', 'Edge AI', 'Models', 'Tools', 'Security', 'Devices', 'Business', 'Robotics'];
const signalColors = { 'Edge AI': 'teal', Security: 'rose', Tools: 'violet', Models: 'blue', Devices: 'amber', Business: 'green', Robotics: 'amber' };
const safeHttpUrl = (value) => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : '#'; } catch { return '#'; } };
const feedbackRepo = import.meta.env.VITE_GITHUB_REPO || 'ar-titumir/personal-ai-radar';
const BD_TIME_ZONE = 'Asia/Dhaka';
const formatBdDate = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: BD_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const formatArchiveDate = (date) => new Intl.DateTimeFormat('en-US', { timeZone: BD_TIME_ZONE, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00+06:00`));
const sortWithinDay = (stories) => [...stories].sort((a, b) => {
  const priorityDiff = (PRIORITY_CATEGORIES.has(b.category) ? 1 : 0) - (PRIORITY_CATEGORIES.has(a.category) ? 1 : 0);
  if (priorityDiff !== 0) return priorityDiff;
  return `${b.time || ''}`.localeCompare(`${a.time || ''}`);
});

function BdClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: BD_TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value || '--';
  return <div className="bd-clock" aria-label="Current Bangladesh time"><span className="clock-label">BD TIME</span><strong>{get('hour')}:{get('minute')}<span className="clock-seconds">:{get('second')}</span></strong></div>;
}

function App() {
  const [active, setActive] = useState('Today');
  const [category, setCategory] = useState('All signals');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('Correction');
  const [feedbackText, setFeedbackText] = useState('');
  const [cache, setCache] = useState({});
  const [pendingDates, setPendingDates] = useState(() => new Set());
  const [browseDate, setBrowseDate] = useState(null); // null => "recent" 3-day view

  const recentDates = useMemo(() => availableDates.slice(0, RECENT_WINDOW), []);
  const latestDate = availableDates[0];

  const ensureLoaded = useCallback((dates) => {
    setPendingDates((prevPending) => {
      const missing = dates.filter((date) => !(date in cache) && !prevPending.has(date));
      if (!missing.length) return prevPending;
      missing.forEach(async (date) => {
        const dayStories = await loadDay(date);
        setCache((prev) => ({ ...prev, [date]: dayStories }));
        setPendingDates((prev) => { const next = new Set(prev); next.delete(date); return next; });
      });
      return new Set([...prevPending, ...missing]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache]);

  useEffect(() => { ensureLoaded(recentDates); }, []); // initial 3-day load
  useEffect(() => { if (browseDate) ensureLoaded([browseDate]); }, [browseDate]);

  const datesInView = browseDate ? [browseDate] : recentDates;
  const isLoading = datesInView.some((date) => pendingDates.has(date) || !(date in cache));

  const allLoadedStories = useMemo(() => {
    const orderedDates = browseDate ? [browseDate] : recentDates;
    return orderedDates.flatMap((date) => sortWithinDay(cache[date] || []));
  }, [cache, browseDate, recentDates]);

  const stories = useMemo(() => allLoadedStories.filter((story) => {
    const sectionMatch = active === 'Saved' ? saved.includes(story.id)
      : active === 'Business signals' ? story.category === 'Business'
      : active === 'AI Radar' ? story.category !== 'Business'
      : true;
    return sectionMatch
      && (category === 'All signals' || story.category === category)
      && `${story.title} ${story.summary} ${story.source}`.toLowerCase().includes(query.toLowerCase());
  }), [allLoadedStories, active, category, query, saved]);

  const savedStories = useMemo(() => {
    if (active !== 'Saved') return [];
    // Saved items may live outside the current 3-day / single-day window, so
    // pull them from whatever has been cached so far this session.
    return Object.values(cache).flat().filter((story) => saved.includes(story.id));
  }, [cache, saved, active]);

  const visibleStories = active === 'Saved' ? savedStories.filter((story) =>
    `${story.title} ${story.summary} ${story.source}`.toLowerCase().includes(query.toLowerCase())
    && (category === 'All signals' || story.category === category)
  ) : stories;

  const heading = browseDate ? formatArchiveDate(browseDate) : `Latest ${recentDates.length === 1 ? 'day' : `${recentDates.length} days`}`;
  const save = (id) => setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  const browseIndex = browseDate ? availableDates.indexOf(browseDate) : -1;
  const goOlder = () => { const next = availableDates[(browseIndex === -1 ? 0 : browseIndex) + 1]; if (next) setBrowseDate(next); };
  const goNewer = () => {
    if (browseIndex <= 0) { setBrowseDate(null); return; }
    setBrowseDate(availableDates[browseIndex - 1]);
  };
  const submitFeedback = (event) => {
    event.preventDefault();
    const text = feedbackText.trim();
    if (!text) return;
    const title = `[${feedbackType}] Radar feedback`;
    const body = `## Feedback\n\n${text}\n\n---\nSubmitted from Signal / Personal AI Radar. Please verify this feedback before changing future briefs.`;
    window.open(`https://github.com/${feedbackRepo}/issues/new?labels=feedback&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
    setFeedbackText('');
    setFeedbackOpen(false);
  };

  const totalKnownStories = Object.values(cache).flat().length;
  const totalSources = new Set(Object.values(cache).flat().map((s) => s.source)).size;

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Radar size={19} strokeWidth={2.4} /></div><span>signal<span className="brand-dot">/</span></span></div>
      <div className="profile"><div className="avatar">AT</div><div><strong>Titumir</strong><span>Personal radar</span></div><button className="icon-button"><Bell size={16} /></button></div>
      <p className="eyebrow nav-label">Workspace</p>
      <nav>{nav.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => { setActive(label); setMenuOpen(false); }}><Icon size={17} /><span>{label}</span>{label === 'Today' && latestDate && <span className="nav-count">{(cache[latestDate] || []).length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="focus-card"><div className="focus-icon"><Sparkles size={16} /></div><strong>Focus for today</strong><p>Understand where edge AI meets useful automation.</p><button>Open focus <ArrowUpRight size={14} /></button></div><button className="feedback-link" onClick={() => setFeedbackOpen(true)}><MessageSquare size={15} /> Give feedback</button><div className="system-status"><CircleDot size={13} /> Radar synced <span>{latestDate ? formatArchiveDate(latestDate) : '—'}</span></div></div>
    </aside>
    {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{active}</strong></div><div className="top-actions"><div className="search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the radar" /></div><BdClock /></div></header>
      {active === 'Roadmap' ? <RoadmapView /> : <>
        <section className="hero"><div><div className="live-label"><span className="pulse" /> Daily intelligence brief</div><h1>Stay close to<br /><em>what is changing.</em></h1><p className="hero-copy">A calm signal layer for the AI and automation world — curated for builders, operators and curious minds.</p></div><div className="hero-meta"><div className="orbit"><div className="orbit-core"><Radar size={25} /></div><span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><span className="orbit-dot dot-three" /></div><div><strong>{totalKnownStories} signals</strong><span>across {totalSources} trusted sources</span></div></div></section>
        <section className="priority-strip"><div className="priority-heading"><span className="priority-icon"><ShieldCheck size={17} /></span><div><strong>Priority lens</strong><span>Following the shifts that matter most</span></div></div><div className="priority-tags"><span>Edge AI</span><span>AI security</span><span>Agents</span><span>Devices</span></div><button className="tune-button">Tune lens <ChevronRight size={15} /></button></section>
        <div className="section-heading"><div><p className="eyebrow">{active === 'Business signals' ? 'Opportunity desk' : 'The daily brief'}</p><h2>{active === 'Business signals' ? 'Business signals worth watching' : 'AI news archive'}</h2></div><div className="section-tools">
          {active !== 'Saved' && <div className="day-pager"><button onClick={goOlder} disabled={availableDates.length === 0 || browseIndex === availableDates.length - 1} aria-label="Older day"><ChevronLeft size={14} /></button><label className="archive-picker"><Clock3 size={15} /><span>Date</span><select aria-label="Browse news by date" value={browseDate ?? 'recent'} onChange={(event) => setBrowseDate(event.target.value === 'recent' ? null : event.target.value)}><option value="recent">Latest {recentDates.length} days</option>{availableDates.map((date) => <option key={date} value={date}>{formatArchiveDate(date)}</option>)}</select></label><button onClick={goNewer} disabled={browseDate === null} aria-label="Newer day"><ChevronRight size={14} /></button></div>}
          <span className="updated">{active === 'Saved' ? `${savedStories.length} saved` : heading}</span><ListFilter size={17} /></div></div>
        <div className="filter-row">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}{item === 'All signals' && <span className="filter-count">{visibleStories.length}</span>}</button>)}</div>
        <section className="content-grid">
          <div className="story-feed">
            {isLoading && active !== 'Saved' && <div className="loading-state"><Loader2 size={18} className="spin" /> Loading signals…</div>}
            {!isLoading && visibleStories.map((story, index) => <StoryCard key={story.id} story={story} featured={index === 0 && category === 'All signals' && active !== 'Saved'} isSaved={saved.includes(story.id)} onSave={() => save(story.id)} />)}
            {!isLoading && !visibleStories.length && <div className="empty-state"><Search size={22} /><strong>{active === 'Saved' ? 'Nothing saved yet' : `No signals found for ${heading}`}</strong><span>{active === 'Saved' ? 'Bookmark a story to find it here later.' : 'Try another date, search, or category filter.'}</span></div>}
          </div>
          <aside className="right-rail">
            <div className="rail-card business-card"><div className="card-head"><div><p className="eyebrow">Business insight</p><h3>Where attention<br />could become value</h3></div><div className="insight-icon"><Cpu size={19} /></div></div><p>Small teams are building durable businesses around the messy middle: connecting models to real systems, permissions and outcomes.</p><div className="idea-list"><div><span className="idea-number">01</span><span><strong>AI ops for local businesses</strong><small>High urgency · Low tooling</small></span></div><div><span className="idea-number">02</span><span><strong>Private edge assistants</strong><small>Growing capability · New channel</small></span></div><div><span className="idea-number">03</span><span><strong>Agent observability</strong><small>Early market · Clear pain</small></span></div></div><button className="text-button">Explore all opportunities <ArrowUpRight size={14} /></button></div>
            <div className="rail-card learn-card"><div className="learn-top"><div className="learn-icon"><Sparkles size={16} /></div><span>Suggested next</span></div><h3>Map the local<br />AI stack</h3><p>Understand models, runtimes and hardware before choosing your next build.</p><div className="progress"><span /><span /><span /><span /><span /><b>2/5</b></div><button>Continue learning <ChevronRight size={14} /></button></div>
          </aside>
        </section>
        <footer><span>signal / personal intelligence</span><span>Built for a clearer morning · {new Date().getFullYear()}</span></footer>
      </>}
    </main>
    {feedbackOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFeedbackOpen(false); }}><section className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title"><button className="modal-close" onClick={() => setFeedbackOpen(false)} aria-label="Close feedback"><X size={18} /></button><p className="eyebrow">Help improve the radar</p><h2 id="feedback-title">What should Hermes verify?</h2><p className="modal-copy">Your note opens a GitHub feedback issue. Hermes reviews these issues before the next daily update.</p><form onSubmit={submitFeedback}><label>Feedback type<select value={feedbackType} onChange={(event) => setFeedbackType(event.target.value)}><option>Correction</option><option>Source suggestion</option><option>Missing topic</option><option>Other</option></select></label><label>Your feedback<textarea value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} placeholder="Tell Hermes what to check..." rows="5" required /></label><button className="modal-submit" type="submit">Continue to GitHub <ArrowUpRight size={15} /></button></form></section></div>}
  </div>;
}

function StoryCard({ story, featured, isSaved, onSave }) {
  const color = signalColors[story.category] || 'blue';
  const isPriority = PRIORITY_CATEGORIES.has(story.category);
  return <article className={`story-card ${featured ? 'featured' : ''} ${isPriority ? 'priority' : ''}`}><div className={`story-accent ${color}`} /><div className="story-body"><div className="story-top"><span className={`category-dot ${color}`} /> <span className="story-category">{story.category}</span>{isPriority && <span className="priority-badge"><Flame size={11} /> Priority</span>}<span className="story-tag">{story.tag}</span><button className={`save-button ${isSaved ? 'saved' : ''}`} onClick={onSave} aria-label={isSaved ? 'Remove bookmark' : 'Save story'}><Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} /></button></div><h3><a href={safeHttpUrl(story.url)} target="_blank" rel="noreferrer">{story.title}</a></h3><div className="summary-label">Summary</div><p>{story.summary || 'Open the source article for the full verified report; a summary was not provided by the publisher feed.'}</p><div className="story-foot"><span className="source">{story.source}</span><span>{story.date} · {story.time}</span><span>{story.readTime} read</span><span className={`impact ${story.impact.toLowerCase()}`}>{story.impact} impact</span><a className="read-link" href={safeHttpUrl(story.url)} target="_blank" rel="noreferrer">Read <ExternalLink size={13} /></a></div></div></article>;
}

/* Future personal-dashboard sections from the original brief. Phase one is
   AI news and business signals only, so these are honest "coming soon"
   placeholders rather than fake interactive widgets. */
const roadmapSections = [
  { icon: ListTodo, title: 'Upcoming tasks', copy: 'A scheduled task list that sits next to the news, so nothing important gets buried under the daily brief.' },
  { icon: Cpu, title: 'Current projects', copy: 'A working view of active projects — status, next action, and how each one ties back to the radar.' },
  { icon: Sparkles, title: 'Productivity', copy: 'A restrained view of focus time and progress. No arbitrary charts — only numbers that change a decision.' },
  { icon: Compass, title: 'Skills to learn', copy: 'A learning queue for the edge AI, automation and security stack, pulled from what the radar keeps surfacing.' },
];
function RoadmapView() {
  return <section className="roadmap">
    <div className="section-heading"><div><p className="eyebrow">Personal dashboard</p><h2>What comes after the radar</h2></div></div>
    <p className="roadmap-copy">Phase one is the AI &amp; automation news feed and the business-signals desk on the left — deliberately built first and built well. These sections are next, once the daily brief is solid.</p>
    <div className="roadmap-grid">{roadmapSections.map(({ icon: Icon, title, copy }) => <div key={title} className="roadmap-card"><div className="roadmap-icon"><Icon size={18} /></div><strong>{title}</strong><p>{copy}</p><span className="roadmap-status">Coming soon</span></div>)}</div>
  </section>;
}

createRoot(document.getElementById('root')).render(<App />);
