import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const pageUrl = (page, id) => `/?page=${page}${id ? `&id=${encodeURIComponent(id)}` : ""}`;

function hashString(value) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

function headlineLines(headline, maxCharacters = 29) {
  const words = headline.trim().split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (line && `${line} ${word}`.length > maxCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > 4) {
    lines.length = 4;
    lines[3] = `${lines[3].replace(/[.,;:!?]+$/, "")}…`;
  }
  return lines;
}

function HeadlineArtwork({ story, className = "", showHeadline = true }) {
  const seed = hashString(`${story.source || ""} ${story.category || ""} ${story.title}`);
  const palettes = [
    ["#172554", "#285b78", "#f0bb62"],
    ["#352044", "#76506a", "#f3bb72"],
    ["#123a3a", "#27726c", "#e7c56e"],
    ["#492a1c", "#925039", "#efc578"],
    ["#1e2b47", "#52678f", "#e8b866"],
  ];
  const [start, end, accent] = palettes[seed % palettes.length];
  const gradientId = `art-${seed.toString(16)}`;
  const lines = showHeadline ? headlineLines(story.title) : [];
  const lineHeight = lines.length > 3 ? 49 : 57;
  const fontSize = lines.length > 3 ? 39 : 45;
  const textStart = lines.length > 3 ? 310 : 330;
  const displaySource = (story.source || story.category || "UGANDA").toUpperCase();

  return (
    <svg className={className} viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${story.title} — Davinchy News artwork`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={start} />
          <stop offset="100%" stopColor={end} />
        </linearGradient>
        <pattern id={`${gradientId}-dots`} width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="#fff" opacity=".16" />
        </pattern>
      </defs>
      <rect width="800" height="500" fill={`url(#${gradientId})`} />
      <rect width="800" height="500" fill={`url(#${gradientId}-dots)`} />
      <circle cx="665" cy="142" r="176" fill="none" stroke={accent} strokeWidth="1" opacity=".4" />
      <circle cx="665" cy="142" r="129" fill="none" stroke={accent} strokeWidth="22" opacity=".12" />
      <circle cx="665" cy="142" r="76" fill={accent} opacity=".13" />
      <path d={`M${420 + seed % 120} 0 L800 0 L800 500 L${690 + seed % 80} 500 Z`} fill="#fff" opacity=".035" />
      <path d="M56 61h54" stroke={accent} strokeWidth="4" />
      <text x="56" y="91" fill="#fff" opacity=".83" fontFamily="Arial,sans-serif" fontSize="13" fontWeight="700" letterSpacing="3">{displaySource.slice(0, 27)}</text>
      {lines.map((line, index) => (
        <text key={`${index}-${line}`} x="56" y={textStart + index * lineHeight} fill="#fff" fontFamily="Georgia,serif" fontSize={fontSize} fontWeight="700" letterSpacing="-.7">{line}</text>
      ))}
      <text x="56" y="457" fill={accent} fontFamily="Arial,sans-serif" fontSize="12" fontWeight="700" letterSpacing="3">DAVINCHY NEWS</text>
      <path d="M680 428h64" stroke={accent} strokeWidth="2" opacity=".85" />
      <circle cx="751" cy="428" r="4" fill={accent} />
    </svg>
  );
}

function StoryArtwork({ story, className = "", showHeadline = true, loading = "lazy" }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (!story.image || imageFailed) {
    return <HeadlineArtwork story={story} className={className} showHeadline={showHeadline} />;
  }
  return <img className={className} src={story.image} alt={story.title} loading={loading} decoding="async" onError={() => setImageFailed(true)} />;
}

function Brand() {
  return <a className="brand" href="/" aria-label="Davinchy News home"><span>DAVINCHY</span><b>NEWS</b></a>;
}

function Header({ page, query, setQuery, stories, onSearch }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return stories
      .filter((story) => `${story.title} ${story.source || ""} ${story.category || ""}`.toLowerCase().includes(term))
      .slice(0, 6);
  }, [query, stories]);
  const nav = [
    ["Home", "home"],
    ["Latest", "category"],
    ["Contact", "contact"],
  ];
  return (
    <>
      <div className="topline"><div className="wrap topline-inner"><span>Independent perspectives. Informed every day.</span><span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span></div></div>
      <header className="header wrap">
        <Brand />
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-controls="main-navigation" aria-expanded={menuOpen}>☰</button>
        <nav id="main-navigation" className={menuOpen ? "navigation open" : "navigation"} aria-label="Main navigation">
          {nav.map(([label, target]) => <a key={target} onClick={() => setMenuOpen(false)} className={(page === target || (page === "story" && target === "category")) ? "active" : ""} href={pageUrl(target)}>{label}</a>)}
          <form className="search" role="search" onSubmit={(event) => { onSearch(event, activeSuggestion >= 0 ? suggestions[activeSuggestion].title : query); setSuggestionsOpen(false); setActiveSuggestion(-1); setMenuOpen(false); }}>
            <label className="sr-only" htmlFor="search">Search stories</label>
            <input id="search" type="search" value={query} onFocus={() => setSuggestionsOpen(true)} onChange={(event) => { setQuery(event.target.value); setSuggestionsOpen(true); setActiveSuggestion(-1); }} onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 120)} onKeyDown={(event) => {
              if (event.key === "ArrowDown" && suggestions.length) {
                event.preventDefault();
                setSuggestionsOpen(true);
                setActiveSuggestion((activeSuggestion + 1) % suggestions.length);
              } else if (event.key === "ArrowUp" && suggestions.length) {
                event.preventDefault();
                setSuggestionsOpen(true);
                setActiveSuggestion((activeSuggestion - 1 + suggestions.length) % suggestions.length);
              } else if (event.key === "Escape") {
                setSuggestionsOpen(false);
                setActiveSuggestion(-1);
              } else if (event.key === "Enter" && activeSuggestion >= 0 && suggestions[activeSuggestion]) {
                event.preventDefault();
                onSearch(event, suggestions[activeSuggestion].title);
                setSuggestionsOpen(false);
                setActiveSuggestion(-1);
                setMenuOpen(false);
              }
            }} role="combobox" aria-autocomplete="list" aria-expanded={suggestionsOpen && query.trim().length >= 2} aria-controls="search-suggestions" aria-activedescendant={suggestionsOpen && activeSuggestion >= 0 ? `search-suggestion-${activeSuggestion}` : undefined} placeholder="Search stories" />
            <button type="submit" aria-label="Search"><span aria-hidden="true">⌕</span></button>
            {suggestionsOpen && query.trim().length >= 2 && <div className="search-suggestions" id="search-suggestions" role="listbox" aria-label="Matching headlines">
              {suggestions.length ? suggestions.map((story, index) => <button className={activeSuggestion === index ? "search-suggestion active" : "search-suggestion"} id={`search-suggestion-${index}`} key={story.id} type="button" role="option" aria-selected={activeSuggestion === index} onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(story.title); setSuggestionsOpen(false); setActiveSuggestion(-1); setMenuOpen(false); onSearch(null, story.title); }}>
                <span>{story.title}</span><small>{story.source || story.category}</small>
              </button>) : <p className="search-suggestions-empty" role="status">No matching headlines. Press Enter to search.</p>}
            </div>}
          </form>
        </nav>
      </header>
    </>
  );
}

function StoryLink({ story, children, className = "" }) {
  if (story.url) return <a className={className} href={story.url} target="_blank" rel="noreferrer">{children}</a>;
  return <a className={className} href={pageUrl("story", story.id)}>{children}</a>;
}

function Feature({ story }) {
  return (
    <StoryLink story={story} className="feature">
      <StoryArtwork story={story} className="feature-artwork" showHeadline={false} loading="eager" />
      <div className="feature-shade" />
      <div className="feature-copy"><span className="eyebrow">{story.category} · EDITOR'S PICK</span><h1>{story.title}</h1><p>{story.summary}</p><span className="feature-cta">Read the story <span aria-hidden="true">→</span></span></div>
    </StoryLink>
  );
}

function StoryCard({ story, compact = false }) {
  return (
    <article className={compact ? "story-card compact" : "story-card"}>
      <StoryLink story={story} className="story-image"><StoryArtwork story={story} className="story-artwork" /></StoryLink>
      <div className="story-content"><span className="eyebrow">{story.source || story.category}</span><StoryLink story={story} className="story-title">{story.title}</StoryLink><p>{story.summary}</p><div className="byline">{story.date}<span>·</span>{story.read}</div></div>
    </article>
  );
}

function FeedStatus({ loading, error, sources, updatedAt }) {
  if (loading) return <p className="feed-notice" role="status">Loading the latest stories from broadcaster feeds…</p>;
  const unavailable = sources.filter((source) => source.status === "error");
  if (error) return <p className="feed-notice feed-error" role="alert">{error}{unavailable.length ? ` ${unavailable.map((source) => `${source.name}: ${source.error}`).join(" ")}` : ""}</p>;
  if (unavailable.length) return <p className="feed-notice" role="status">Some feeds are unavailable: {unavailable.map((source) => `${source.name} (${source.error})`).join("; ")}.</p>;
  return updatedAt ? <p className="feed-notice" role="status">Updated {new Date(updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Stories refresh automatically every minute.</p> : null;
}

function Home({ filteredStories, loading, error, sources, updatedAt }) {
  const featured = filteredStories[0];
  const rest = filteredStories.filter((story) => story.id !== featured?.id);
  return (
    <main>
      <section className="wrap hero-section"><div className="section-heading"><span className="eyebrow">THE DAILY BRIEF</span><span className="heading-rule" /></div><FeedStatus loading={loading} error={error} sources={sources} updatedAt={updatedAt} />{featured && <Feature story={featured} />}</section>
      <section className="wrap latest-section"><div className="section-heading"><div><span className="eyebrow">WHAT'S HAPPENING</span><h2>Latest stories</h2></div><a className="text-link" href={pageUrl("category")}>Explore all stories <span aria-hidden="true">→</span></a></div>
        {rest.length ? <div className="story-grid">{rest.map((story) => <StoryCard key={story.id} story={story} />)}</div> : !featured && !loading && !error && <p className="empty-state">No stories match your search. Try another keyword.</p>}
      </section>
      <Newsletter />
    </main>
  );
}

function Category({ filteredStories, loading, error, sources, updatedAt }) {
  return <main className="wrap inner-page"><div className="page-intro"><span className="eyebrow">THE LATEST</span><h1>Stories worth your time.</h1><p>Reporting and perspectives on the people, ideas and events shaping our world.</p></div>
    <FeedStatus loading={loading} error={error} sources={sources} updatedAt={updatedAt} />{filteredStories.length ? <div className="story-grid category-grid">{filteredStories.map((story) => <StoryCard key={story.id} story={story} />)}</div> : !loading && !error && <p className="empty-state">No stories match your search. Try another keyword.</p>}
  </main>;
}

function StoryPage({ story }) {
  if (!story) return <main className="wrap inner-page"><div className="page-intro"><span className="eyebrow">STORY NOT FOUND</span><h1>We couldn't find that story.</h1><a className="text-link" href={pageUrl("category")}>Browse the latest stories →</a></div></main>;
  return <main className="wrap article-page"><a className="back-link" href={pageUrl("category")}>← Back to latest</a><article><span className="eyebrow">{story.category} · {story.date}</span><h1>{story.title}</h1><p className="article-deck">{story.summary}</p><div className="byline article-byline">By {story.author}<span>·</span>{story.read}</div><StoryArtwork className="article-image" story={story} /><p className="article-body">{story.summary} Davinchy News brings context, curiosity and clear reporting to the stories that shape our lives. We speak with the people closest to the news and look beyond the headlines to understand what comes next.</p><p className="article-body">As the conversation continues, one thing is clear: thoughtful reporting and open dialogue help us all see the bigger picture. Follow Davinchy News for more updates and perspectives.</p></article></main>;
}

function Contact() {
  const [sent, setSent] = useState(false);
  function submit(event) {
    event.preventDefault();
    setSent(true);
  }
  return <main className="wrap inner-page contact-page"><div className="page-intro"><span className="eyebrow">GET IN TOUCH</span><h1>We'd love to hear from you.</h1><p>Have a story tip, a question or feedback? Send a note to our editorial team.</p></div>
    <form className="contact-form" onSubmit={submit}><label htmlFor="name">Your name</label><input id="name" name="name" required maxLength="100" /><label htmlFor="email">Email address</label><input id="email" name="email" type="email" required maxLength="254" /><label htmlFor="message">Message</label><textarea id="message" name="message" rows="6" required maxLength="2000" /><button className="button" type="submit">Send message <span aria-hidden="true">→</span></button>{sent && <p className="success-message" role="status">Thanks for reaching out. Your message is ready for our team.</p>}<p className="form-note">This demo form doesn't send data to a server.</p></form>
  </main>;
}

function Newsletter() {
  const [subscribed, setSubscribed] = useState(false);
  return <section className="newsletter"><div className="wrap newsletter-inner"><div><span className="eyebrow">THE DAVINCHY BRIEF</span><h2>Good journalism, straight to your inbox.</h2><p>A thoughtful roundup of the stories that matter. No noise.</p></div><form onSubmit={(event) => { event.preventDefault(); setSubscribed(true); }}><label className="sr-only" htmlFor="newsletter-email">Your email address</label><input id="newsletter-email" type="email" placeholder="Your email address" required /><button type="submit" aria-label="Subscribe">Subscribe <span aria-hidden="true">→</span></button>{subscribed && <span className="subscribe-status" role="status">You're on the list. Thanks for subscribing!</span>}</form></div></section>;
}

function Footer() {
  return <footer className="footer"><div className="wrap footer-inner"><Brand /><p>Independent perspectives. Informed every day.</p><span>© {new Date().getFullYear()} Davinchy News</span></div></footer>;
}

function App() {
  const [query, setQuery] = useState(new URLSearchParams(window.location.search).get("q") || "");
  const [stories, setStories] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [sources, setSources] = useState([]);
  const [feedUpdatedAt, setFeedUpdatedAt] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let firstRequest = true;
    async function refreshNews() {
      try {
        const response = await fetch("/api/news", { signal: controller.signal, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `News feed request failed (${response.status}).`);
        setSources(payload.sources || []);
        setStories((payload.articles || []).map((article) => ({
          ...article,
          date: article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "Recently",
          read: "Latest update",
        })));
        setFeedUpdatedAt(payload.updatedAt || new Date().toISOString());
        setFeedError("");
      } catch (error) {
        if (error.name !== "AbortError") setFeedError(error.message || "Could not refresh the news feeds.");
      } finally {
        if (firstRequest && !controller.signal.aborted) setFeedLoading(false);
        firstRequest = false;
      }
    }

    refreshNews();
    const intervalId = window.setInterval(refreshNews, 60_000);
    return () => {
      window.clearInterval(intervalId);
      controller.abort();
    };
  }, []);
  const filteredStories = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return stories;
    return stories.filter((story) => `${story.title} ${story.summary} ${story.source} ${story.category}`.toLowerCase().includes(term));
  }, [query, stories]);
  function search(event, searchTerm = query) {
    event?.preventDefault();
    setQuery(searchTerm);
    const next = new URL(window.location.href);
    if (searchTerm.trim()) next.searchParams.set("q", searchTerm.trim());
    else next.searchParams.delete("q");
    next.searchParams.set("page", "home");
    window.history.pushState({}, "", next);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  const [locationKey, setLocationKey] = useState(window.location.href);
  React.useEffect(() => {
    const updateLocation = () => { setLocationKey(window.location.href); setQuery(new URLSearchParams(window.location.search).get("q") || ""); };
    window.addEventListener("popstate", updateLocation);
    return () => window.removeEventListener("popstate", updateLocation);
  }, []);
  const currentParams = new URLSearchParams(new URL(locationKey).search);
  const currentPage = currentParams.get("page") || "home";
  const selectedStory = stories.find((story) => story.id === currentParams.get("id"));
  return <><Header page={currentPage} query={query} setQuery={setQuery} stories={stories} onSearch={search} />{currentPage === "category" ? <Category filteredStories={filteredStories} loading={feedLoading} error={feedError} sources={sources} updatedAt={feedUpdatedAt} /> : currentPage === "story" ? <StoryPage story={selectedStory} /> : currentPage === "contact" ? <Contact /> : <Home filteredStories={filteredStories} loading={feedLoading} error={feedError} sources={sources} updatedAt={feedUpdatedAt} />}<Footer /><button className="to-top" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button></>;
}

createRoot(document.getElementById("root")).render(<App />);
