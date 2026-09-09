import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, Bell, Bookmark, ChevronRight, CircleDot, Clock3, Compass, Cpu, ExternalLink, LayoutDashboard, ListFilter, Menu, Radar, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import data from '../data/news.json';
import './styles.css';

const nav = [
  { label: 'Today', icon: LayoutDashboard },
  { label: 'AI Radar', icon: Radar },
  { label: 'Business signals', icon: Compass },
  { label: 'Saved', icon: Bookmark },
];
const categories = ['All signals', 'Edge AI', 'Models', 'Tools', 'Security', 'Devices', 'Business'];
const signalColors = { 'Edge AI': 'teal', Security: 'rose', Tools: 'violet', Models: 'blue', Devices: 'amber', Business: 'green' };

function App() {
  const [active, setActive] = useState('Today');
  const [category, setCategory] = useState('All signals');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const stories = useMemo(() => data.stories.filter((story) => (category === 'All signals' || story.category === category) && `${story.title} ${story.summary} ${story.source}`.toLowerCase().includes(query.toLowerCase())), [category, query]);
  const today = new Date(data.updatedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const save = (id) => setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Radar size={19} strokeWidth={2.4} /></div><span>signal<span className="brand-dot">/</span></span></div>
      <div className="profile"><div className="avatar">AT</div><div><strong>Titumir</strong><span>Personal radar</span></div><button className="icon-button"><Bell size={16} /></button></div>
      <p className="eyebrow nav-label">Workspace</p>
      <nav>{nav.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => { setActive(label); setMenuOpen(false); }}><Icon size={17} /><span>{label}</span>{label === 'Today' && <span className="nav-count">{data.stories.filter((s) => s.date === data.updatedAt.slice(0, 10)).length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="focus-card"><div className="focus-icon"><Sparkles size={16} /></div><strong>Focus for today</strong><p>Understand where edge AI meets useful automation.</p><button>Open focus <ArrowUpRight size={14} /></button></div><div className="system-status"><CircleDot size={13} /> Radar synced <span>{new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></div>
    </aside>
    {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{active}</strong></div><div className="top-actions"><div className="search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the radar" /></div><button className="date-chip"><Clock3 size={15} /> {today}</button></div></header>
      <section className="hero"><div><div className="live-label"><span className="pulse" /> Daily intelligence brief</div><h1>Stay close to<br /><em>what is changing.</em></h1><p className="hero-copy">A calm signal layer for the AI and automation world — curated for builders, operators and curious minds.</p></div><div className="hero-meta"><div className="orbit"><div className="orbit-core"><Radar size={25} /></div><span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><span className="orbit-dot dot-three" /></div><div><strong>{data.stories.length} signals</strong><span>across {new Set(data.stories.map((s) => s.source)).size} trusted sources</span></div></div></section>
      <section className="priority-strip"><div className="priority-heading"><span className="priority-icon"><ShieldCheck size={17} /></span><div><strong>Priority lens</strong><span>Following the shifts that matter most</span></div></div><div className="priority-tags"><span>Edge AI</span><span>AI security</span><span>Agents</span><span>Devices</span></div><button className="tune-button">Tune lens <ChevronRight size={15} /></button></section>
      <div className="section-heading"><div><p className="eyebrow">{active === 'Business signals' ? 'Opportunity desk' : 'The daily brief'}</p><h2>{active === 'Business signals' ? 'Business signals worth watching' : 'Today in AI'}</h2></div><div className="section-tools"><span className="updated">Updated {new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><ListFilter size={17} /></div></div>
      <div className="filter-row">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}{item === 'All signals' && <span className="filter-count">{stories.length}</span>}</button>)}</div>
      <section className="content-grid"><div className="story-feed">{stories.map((story, index) => <StoryCard key={story.id} story={story} featured={index === 0 && category === 'All signals'} isSaved={saved.includes(story.id)} onSave={() => save(story.id)} />)}{!stories.length && <div className="empty-state"><Search size={22} /><strong>No signals found</strong><span>Try another search or clear the category filter.</span></div>}</div><aside className="right-rail"><div className="rail-card business-card"><div className="card-head"><div><p className="eyebrow">Business insight</p><h3>Where attention<br />could become value</h3></div><div className="insight-icon"><Cpu size={19} /></div></div><p>Small teams are building durable businesses around the messy middle: connecting models to real systems, permissions and outcomes.</p><div className="idea-list"><div><span className="idea-number">01</span><span><strong>AI ops for local businesses</strong><small>High urgency · Low tooling</small></span></div><div><span className="idea-number">02</span><span><strong>Private edge assistants</strong><small>Growing capability · New channel</small></span></div><div><span className="idea-number">03</span><span><strong>Agent observability</strong><small>Early market · Clear pain</small></span></div></div><button className="text-button">Explore all opportunities <ArrowUpRight size={14} /></button></div><div className="rail-card learn-card"><div className="learn-top"><div className="learn-icon"><Sparkles size={16} /></div><span>Suggested next</span></div><h3>Map the local<br />AI stack</h3><p>Understand models, runtimes and hardware before choosing your next build.</p><div className="progress"><span /><span /><span /><span /><span /><b>2/5</b></div><button>Continue learning <ChevronRight size={14} /></button></div></aside></section>
      <footer><span>signal / personal intelligence</span><span>Built for a clearer morning · {new Date(data.updatedAt).getFullYear()}</span></footer>
    </main>
  </div>;
}

function StoryCard({ story, featured, isSaved, onSave }) {
  const color = signalColors[story.category] || 'blue';
  return <article className={`story-card ${featured ? 'featured' : ''}`}><div className={`story-accent ${color}`} /><div className="story-body"><div className="story-top"><span className={`category-dot ${color}`} /> <span className="story-category">{story.category}</span><span className="story-tag">{story.tag}</span><button className={`save-button ${isSaved ? 'saved' : ''}`} onClick={onSave} aria-label={isSaved ? 'Remove bookmark' : 'Save story'}><Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} /></button></div><h3><a href={story.url} target="_blank" rel="noreferrer">{story.title}</a></h3><p>{story.summary}</p><div className="story-foot"><span className="source">{story.source}</span><span>{story.date} · {story.time}</span><span>{story.readTime} read</span><span className={`impact ${story.impact.toLowerCase()}`}>{story.impact} impact</span><a className="read-link" href={story.url} target="_blank" rel="noreferrer">Read <ExternalLink size={13} /></a></div></div></article>;
}

createRoot(document.getElementById('root')).render(<App />);
