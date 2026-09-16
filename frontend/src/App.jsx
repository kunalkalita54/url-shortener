import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const initialRegister = { username: '', email: '', password: '' };
const LINKS_STORAGE_KEY = 'shortly-links';

function noticeFrom(error) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function readSavedLinks() {
  try {
    return JSON.parse(localStorage.getItem(LINKS_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLink(link) {
  const existing = readSavedLinks().filter((item) => item.shortCode !== link.shortCode);
  localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify([link, ...existing].slice(0, 20)));
}

function LinkIcon() {
  return <span className="link-icon">↗</span>;
}

function MetricCard({ label, value, detail }) {
  return (
    <div className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-orb">↗</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function DistributionList({ title, items, total, emptyLabel = 'No data yet.' }) {
  return (
    <div className="chart-card">
      <div className="card-title-row">
        <div>
          <p className="eyebrow">BREAKDOWN</p>
          <h3>{title}</h3>
        </div>
      </div>
      {items?.length ? (
        <div className="distribution-list">
          {items.map((item, index) => {
            const label = item._id || 'Unknown';
            const percentage = total ? Math.round((item.count / total) * 100) : 0;
            return (
              <div className="distribution-row" key={`${label}-${index}`}>
                <div className="distribution-meta">
                  <span>{label}</span>
                  <strong>{item.count}</strong>
                </div>
                <div className="progress-track"><span style={{ width: `${Math.max(percentage, item.count ? 3 : 0)}%` }} /></div>
                <small>{percentage}%</small>
              </div>
            );
          })}
        </div>
      ) : <p className="muted">{emptyLabel}</p>}
    </div>
  );
}

function ClickChart({ data }) {
  const points = data || [];
  const max = Math.max(...points.map((item) => item.count), 1);
  const width = 760;
  const height = 240;
  const padX = 28;
  const padY = 26;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const coords = points.map((item, index) => {
    const x = points.length === 1 ? width / 2 : padX + (index / (points.length - 1)) * plotW;
    const y = padY + plotH - (item.count / max) * plotH;
    return { x, y, ...item };
  });

  const polyline = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const area = coords.length
    ? `${padX},${height - padY} ${coords.map((point) => `${point.x},${point.y}`).join(' ')} ${coords.at(-1).x},${height - padY}`
    : '';

  return (
    <div className="chart-card wide-chart">
      <div className="card-title-row">
        <div>
          <p className="eyebrow">TRAFFIC</p>
          <h3>Clicks over time</h3>
        </div>
        <span className="chart-note">{points.length ? `${points.length} day${points.length === 1 ? '' : 's'}` : 'No clicks yet'}</span>
      </div>
      {points.length ? (
        <>
          <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Clicks over time line chart">
            <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} className="grid-line" />
            <line x1={padX} y1={padY} x2={padX} y2={height - padY} className="grid-line" />
            <line x1={padX} y1={padY + plotH / 2} x2={width - padX} y2={padY + plotH / 2} className="grid-line" />
            {area && <polygon points={area} className="area-fill" />}
            {coords.length > 1 && <polyline points={polyline} fill="none" className="line-path" />}
            {coords.map((point) => (
              <g key={point._id}>
                <circle cx={point.x} cy={point.y} r="5" className="point-dot" />
              </g>
            ))}
          </svg>
          <div className="chart-labels">
            <span>{points[0]._id}</span>
            <span>{points.at(-1)._id}</span>
          </div>
        </>
      ) : <EmptyState title="No traffic yet" text="Clicks will appear here as people use your short link." />}
    </div>
  );
}

function Dashboard({ selectedCode, setSelectedCode, links, setLinks, onBack }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [customCode, setCustomCode] = useState(selectedCode || '');

  useEffect(() => {
    if (links.length && !selectedCode) {
      setSelectedCode(links[0].shortCode);
    }
  }, [links, selectedCode, setSelectedCode]);

  useEffect(() => {
    if (!selectedCode) return;
    setCustomCode(selectedCode);
    load(selectedCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCode]);

  async function load(code) {
    if (!code?.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await api.analytics(code.trim());
      setAnalytics(result);
      setSelectedCode(code.trim());
      if (!links.some((item) => item.shortCode === code.trim())) {
        const item = { shortCode: code.trim(), shortURL: `${api.apiBase}/${code.trim()}` };
        const updated = [item, ...links.filter((link) => link.shortCode !== item.shortCode)].slice(0, 20);
        setLinks(updated);
        localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (error) {
      setAnalytics(null);
      setMessage(noticeFrom(error));
    } finally {
      setLoading(false);
    }
  }

  const selectedLink = useMemo(() => links.find((item) => item.shortCode === selectedCode), [links, selectedCode]);
  const referrers = analytics?.topReferrers || [];
  const devices = analytics?.deviceBreakdown || [];
  const browsers = analytics?.browserBreakdown || [];
  const total = analytics?.totalClicks || 0;

  return (
    <main className="shell dashboard-shell">
      <header>
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); onBack(); }} aria-label="Shortly home"><span>↗</span> Shortly</a>
        <a className="top-link" href="/" onClick={(event) => { event.preventDefault(); onBack(); }}>← Back to links</a>
      </header>

      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">ANALYTICS DASHBOARD</p>
          <h1>See what your links are doing.</h1>
          <p>Track clicks, traffic sources, devices, and browsers for each short link.</p>
        </div>
        <div className="dashboard-picker">
          <label htmlFor="dashboard-code">Short code</label>
          <div className="picker-row">
            <input id="dashboard-code" value={customCode} onChange={(event) => setCustomCode(event.target.value)} placeholder="e.g. 1" />
            <button onClick={() => load(customCode)} disabled={loading || !customCode.trim()}>{loading ? 'Loading…' : 'View analytics'}</button>
          </div>
        </div>
      </section>

      {links.length > 0 && (
        <section className="saved-links">
          <div className="section-heading"><div><p className="eyebrow">YOUR LINKS</p><h2>Saved links</h2></div><span>{links.length} saved locally</span></div>
          <div className="link-strip">
            {links.map((link) => (
              <button key={link.shortCode} className={`link-chip ${link.shortCode === selectedCode ? 'active' : ''}`} onClick={() => setSelectedCode(link.shortCode)}>
                <LinkIcon />
                <span>{link.shortURL || link.shortCode}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {message && <p className="message error dashboard-message">{message}</p>}

      {analytics ? (
        <>
          <section className="metrics-grid">
            <MetricCard label="Total clicks" value={total.toLocaleString()} detail="All recorded visits" />
            <MetricCard label="Active days" value={analytics.clicksOverTime?.length || 0} detail="Days with traffic" />
            <MetricCard label="Top referrer" value={referrers[0]?._id || 'Direct'} detail={referrers[0] ? `${referrers[0].count} clicks` : 'No referral data'} />
            <MetricCard label="Top device" value={devices[0]?._id || 'Unknown'} detail={devices[0] ? `${devices[0].count} clicks` : 'No device data'} />
          </section>

          <div className="dashboard-grid">
            <ClickChart data={analytics.clicksOverTime} />
            <DistributionList title="Devices" items={devices} total={total} />
            <DistributionList title="Browsers" items={browsers} total={total} />
            <DistributionList title="Top referrers" items={referrers} total={total} />
          </div>

          <section className="selected-link-panel">
            <div>
              <p className="eyebrow">SELECTED LINK</p>
              <h2>{selectedLink?.shortURL || `${api.apiBase}/${analytics.shortCode}`}</h2>
            </div>
            <button className="secondary-button" onClick={() => navigator.clipboard.writeText(selectedLink?.shortURL || `${api.apiBase}/${analytics.shortCode}`)}>Copy link</button>
          </section>
        </>
      ) : (
        <section className="panel dashboard-empty-panel">
          <EmptyState title="Pick a short link to begin" text="Create a link on the home page, then come back here to view its analytics." />
        </section>
      )}

      <footer>Analytics endpoint · <code>{api.apiBase}/api/url/getUrlAnalytics/:shortCode</code></footer>
    </main>
  );
}

export default function App() {
  const [mode, setMode] = useState('login');
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [longUrl, setLongUrl] = useState('');
  const [shortened, setShortened] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [busy, setBusy] = useState('');
  const [analyticsCode, setAnalyticsCode] = useState('');
  const [links, setLinks] = useState(readSavedLinks);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [selectedDashboardCode, setSelectedDashboardCode] = useState(() => localStorage.getItem('shortly-selected-code') || readSavedLinks()[0]?.shortCode || '');

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function navigate(path) {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  }

  function openDashboard(code) {
    if (code) {
      setSelectedDashboardCode(code);
      localStorage.setItem('shortly-selected-code', code);
    }
    navigate('/dashboard');
  }

  async function register(event) {
    event.preventDefault();
    setBusy('register'); setAuthMessage('');
    try {
      const result = await api.register(registerForm);
      setAuthMessage(`${result.message}. You can log in now.`);
      setMode('login');
      setRegisterForm(initialRegister);
    } catch (error) { setAuthMessage(noticeFrom(error)); }
    finally { setBusy(''); }
  }

  async function login(event) {
    event.preventDefault();
    setBusy('login'); setAuthMessage('');
    try {
      const result = await api.login(loginForm);
      setIsAuthenticated(true);
      setAuthMessage(`Welcome, ${result.user.username}. Your session cookie is set.`);
    } catch (error) { setAuthMessage(noticeFrom(error)); }
    finally { setBusy(''); }
  }

  async function shorten(event) {
    event.preventDefault();
    setBusy('shorten'); setShortened(null);
    try {
      const result = await api.shorten(longUrl);
      setShortened(result.URL);
      const shortCode = result.URL.shortURL.split('/').pop();
      setAnalyticsCode(shortCode);
      const item = { shortCode, shortURL: result.URL.shortURL, longURL: result.URL.longURL };
      setLinks((current) => {
        const next = [item, ...current.filter((link) => link.shortCode !== shortCode)].slice(0, 20);
        localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    } catch (error) { setShortened({ error: noticeFrom(error) }); }
    finally { setBusy(''); }
  }

  if (currentPath === '/dashboard') {
    return (
      <Dashboard
        selectedCode={selectedDashboardCode}
        setSelectedCode={(code) => { setSelectedDashboardCode(code); localStorage.setItem('shortly-selected-code', code); }}
        links={links}
        setLinks={setLinks}
        onBack={() => navigate('/')}
      />
    );
  }

  const shortLink = shortened?.shortURL;

  return (
    <main className="shell">
      <header>
        <a className="brand" href="/" aria-label="Shortly home"><span>↗</span> Shortly</a>
        <div className="header-actions">
          <a className="dashboard-link" href="/dashboard" onClick={(event) => { event.preventDefault(); openDashboard(analyticsCode || links[0]?.shortCode); }}>Analytics dashboard</a>
          <span className={isAuthenticated ? 'session active' : 'session'}>{isAuthenticated ? 'Session active' : 'Not signed in'}</span>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">URL SHORTENER</p>
        <h1>Short links, <em>without</em> the noise.</h1>
        <p>Create a compact link, share it anywhere, and use the analytics dashboard to understand the traffic.</p>
      </section>

      <section className="grid">
        <article className="panel primary-panel">
          <div className="panel-heading"><div><p className="eyebrow">CREATE</p><h2>Make a short link</h2></div><span className="step">01</span></div>
          {!isAuthenticated && <p className="hint">Sign in first — the backend protects link creation with its JWT cookie.</p>}
          <form onSubmit={shorten} className="shorten-form">
            <label htmlFor="long-url">Destination URL</label>
            <div className="url-row">
              <input id="long-url" type="url" value={longUrl} onChange={(e) => setLongUrl(e.target.value)} placeholder="https://example.com/a/very/long/link" required disabled={!isAuthenticated || busy === 'shorten'} />
              <button disabled={!isAuthenticated || busy === 'shorten'}>{busy === 'shorten' ? 'Shortening…' : 'Shorten it'}</button>
            </div>
          </form>
          {shortened?.error && <p className="message error">{shortened.error}</p>}
          {shortLink && <div className="result"><p>Your short URL</p><a href={shortLink} target="_blank" rel="noreferrer">{shortLink}</a><button className="copy" onClick={() => navigator.clipboard.writeText(shortLink)}>Copy</button><button className="result-analytics" onClick={() => openDashboard(analyticsCode)}>Open analytics →</button></div>}
        </article>

        <article className="panel auth-panel">
          <div className="tabs"><button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Log in</button><button className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>Register</button></div>
          {mode === 'login' ? <form onSubmit={login} className="form"><h2>Welcome back</h2><label>Email<input type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required /></label><label>Password<input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required /></label><button disabled={busy === 'login'}>{busy === 'login' ? 'Logging in…' : 'Log in'}</button></form> : <form onSubmit={register} className="form"><h2>Create an account</h2><label>Username<input value={registerForm.username} onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })} required /></label><label>Email<input type="email" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} required /></label><label>Password<input type="password" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} required /></label><button disabled={busy === 'register'}>{busy === 'register' ? 'Creating…' : 'Create account'}</button></form>}
          {authMessage && <p className={authMessage.includes('Welcome') || authMessage.includes('successfully') ? 'message success' : 'message error'}>{authMessage}</p>}
        </article>
      </section>

      <section className="panel analytics">
        <div className="panel-heading"><div><p className="eyebrow">INSPECT</p><h2>Analytics</h2></div><span className="step">02</span></div>
        <p className="hint">Jump directly to the visual dashboard for any short code.</p>
        <form onSubmit={(event) => { event.preventDefault(); openDashboard(analyticsCode); }} className="analytics-form"><input value={analyticsCode} onChange={(e) => setAnalyticsCode(e.target.value)} placeholder="Short code, e.g. 1" required /><button>Open dashboard</button></form>
      </section>

      <footer>Built for the current Express API · <code>{api.apiBase}</code></footer>
    </main>
  );
}
