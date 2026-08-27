import { useEffect, useMemo, useRef, useState } from 'react';
import type { TimeBlock, Plan } from './domain';
import {
  DAY_MINUTES, categories, classifyLocally, comparisons, deleteAsOpenTime,
  formatTime, minutesOf, planFromDraft, resizeSharedBoundary, sanitizeForShare,
} from './domain';
import { listPlans, removePlan, savePlan } from './repository';
import { ProductionEazoAdapter } from './eazo';

type View = 'compose' | 'edit' | 'discover' | 'library';
const host = new ProductionEazoAdapter();
const examples = [
  'Sleep deeply, make something strange, walk outside, cook with friends',
  'Read, swim, build a tiny business, call my parents, watch the sky change',
  'Eight hours of sleep, focused work, an excellent lunch, music, absolutely no rush',
];

const downloadJson = (name: string, value: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

function Logo() {
  return <div className="brand" aria-label="Eazo Ideal Day Lab"><span>e</span><b>ideal day</b></div>;
}

function Timeline({ blocks }: { blocks: TimeBlock[] }) {
  return (
    <div className="timeline-wrap">
      <div className="timeline" role="img" aria-label={blocks.map((block) => `${block.title}, ${minutesOf(block)} minutes`).join('. ')}>
        {blocks.map((block) => <div key={block.id} title={block.title} style={{ width: `${minutesOf(block) / 14.4}%`, background: categories[block.categoryId].color }} />)}
      </div>
      <div className="timeline-labels" aria-hidden="true"><span>12 AM</span><span>6</span><span>NOON</span><span>6</span><span>12 AM</span></div>
    </div>
  );
}

export function App() {
  const [view, setView] = useState<View>('compose');
  const [description, setDescription] = useState(examples[0]!);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [savedPlans, setSavedPlans] = useState<Plan[]>([]);
  const [snap, setSnap] = useState(5);
  const [notice, setNotice] = useState('Ready. Your words stay on this device.');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<TimeBlock[][]>([]);
  const [future, setFuture] = useState<TimeBlock[][]>([]);
  const [lastDeleted, setLastDeleted] = useState<Plan | null>(null);
  const speechRequested = useRef(false);

  useEffect(() => { void listPlans().then(setSavedPlans).catch(() => setNotice('Local library is unavailable. You can still design and export a day.')); }, []);
  useEffect(() => { host.requestResize(document.documentElement.scrollHeight); }, [view, plan]);

  const total = useMemo(() => plan?.blocks.reduce((sum, block) => sum + minutesOf(block), 0) ?? 0, [plan]);
  const openMinutes = useMemo(() => plan?.blocks.filter((block) => block.categoryId === 'unallocated').reduce((sum, block) => sum + minutesOf(block), 0) ?? 0, [plan]);
  const insights = useMemo(() => plan ? comparisons(plan).slice(0, 5) : [], [plan]);

  const generate = async () => {
    if (!description.trim()) { setNotice('Add at least one ingredient for your day.'); return; }
    setBusy(true);
    const locale = await host.getLocale();
    const response = await Promise.race([
      host.classifyDay({ requestId: crypto.randomUUID(), locale, text: description.trim(), schemaVersion: 1 }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
    ]);
    const next = response?.ok ? planFromDraft(response.value, description.trim(), locale) ?? classifyLocally(description.trim(), locale) : classifyLocally(description.trim(), locale);
    setPlan(next);
    setHistory([]);
    setFuture([]);
    setView('edit');
    setNotice(response?.ok && planFromDraft(response.value, description.trim(), locale) ? 'Eazo organized your ingredients. Review every block before saving.' : 'Organized locally — private, editable, and exactly 1,440 minutes.');
    setBusy(false);
  };

  const commit = (blocks: TimeBlock[], message: string) => {
    if (!plan) return;
    setHistory((items) => [...items.slice(-49), plan.blocks]);
    setFuture([]);
    setPlan({ ...plan, blocks, updatedAt: new Date().toISOString() });
    setNotice(message);
  };

  const adjustBoundary = (index: number, delta: number) => {
    if (!plan) return;
    const result = resizeSharedBoundary(plan.blocks, index, plan.blocks[index]!.endMin + delta, snap);
    if (!result.ok) { setNotice('That change would overlap another block. Nothing moved.'); return; }
    commit(result.blocks, `Boundary moved ${Math.abs(delta)} minutes. The day still totals 24 hours.`);
  };

  const updateBlock = (id: string, patch: Partial<TimeBlock>) => {
    if (!plan) return;
    commit(plan.blocks.map((block) => block.id === id ? { ...block, ...patch } : block), 'Block updated.');
  };

  const undo = () => {
    if (!plan || !history.length) return;
    const previous = history.at(-1)!;
    setFuture((items) => [plan.blocks, ...items].slice(0, 50));
    setHistory((items) => items.slice(0, -1));
    setPlan({ ...plan, blocks: previous, updatedAt: new Date().toISOString() });
    setNotice('Undone.');
  };

  const redo = () => {
    if (!plan || !future.length) return;
    const next = future[0]!;
    setHistory((items) => [...items, plan.blocks].slice(-50));
    setFuture((items) => items.slice(1));
    setPlan({ ...plan, blocks: next, updatedAt: new Date().toISOString() });
    setNotice('Redone.');
  };

  const save = async () => {
    if (!plan) return;
    const result = await savePlan(plan);
    if (!result.ok) { setNotice('Your library is full. Delete or replace one of the 20 saved days.'); setView('library'); return; }
    setSavedPlans(await listPlans());
    setNotice('Saved on this device.');
  };

  const sharePlan = async () => {
    if (!plan) return;
    const publicData = sanitizeForShare(plan);
    const result = await host.share({ appId: 'ideal-day-lab', schemaVersion: 2, publicData: publicData as unknown as Record<string, unknown> });
    if (result.ok) setNotice('Opened in Eazo. Your original words, title, and notes were excluded.');
    else {
      downloadJson('my-ideal-day.private-safe.json', publicData);
      setNotice('Eazo is not available here, so a privacy-safe remix file was downloaded.');
    }
  };

  const startVoice = () => {
    if (speechRequested.current) { setNotice('Microphone was already requested this session. Keep typing or reload to retry.'); return; }
    speechRequested.current = true;
    const Speech = (globalThis as typeof globalThis & { webkitSpeechRecognition?: new () => { lang: string; continuous: boolean; start(): void; onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onerror: () => void; onend: () => void } }).webkitSpeechRecognition;
    if (!Speech) { setNotice('Voice input is not available in this browser. Text input still works.'); return; }
    const recognition = new Speech();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.onresult = (event) => setDescription((value) => `${value}${value ? ', ' : ''}${event.results[0]?.[0].transcript ?? ''}`);
    recognition.onerror = () => setNotice('Microphone access was denied or interrupted. Your text is untouched.');
    recognition.onend = () => setNotice('Voice transcription added. Review it before building.');
    recognition.start();
    setNotice('Listening… Audio is never written to disk.');
  };

  const duplicate = async (item: Plan) => {
    const copy = { ...item, planId: crypto.randomUUID(), title: `${item.title} — remix`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const result = await savePlan(copy);
    if (!result.ok) { setNotice('Your 20-day library is full. Nothing was replaced.'); return; }
    setSavedPlans(await listPlans());
    setNotice('Remix saved as a new day.');
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to your day</a>
      <header className="topbar">
        <Logo />
        <nav aria-label="Main navigation">
          <button className={view === 'compose' ? 'active' : ''} onClick={() => setView('compose')}>Start</button>
          <button className={view === 'edit' ? 'active' : ''} disabled={!plan} onClick={() => setView('edit')}>Day</button>
          <button className={view === 'discover' ? 'active' : ''} disabled={!plan} onClick={() => setView('discover')}>Scale</button>
          <button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>Library <span>{savedPlans.length}</span></button>
        </nav>
      </header>

      <main id="main" tabIndex={-1}>
        <p className="live-region" role="status" aria-live="polite">{notice}</p>

        {view === 'compose' && (
          <section className="compose-grid">
            <div className="intro">
              <p className="kicker">1 planet · 1 day · 1,440 minutes</p>
              <h1>What would make a day feel <em>entirely yours?</em></h1>
              <p>Drop in the ingredients. We’ll shape them into exactly 24 hours, then show you the delightful scale of living that day again and again.</p>
              <div className="promise"><span>24</span><p><b>hours, conserved.</b><br />No productivity score. No judgment. Just your day.</p></div>
            </div>
            <div className="composer-card">
              <div className="card-label"><span>01</span><b>DESCRIBE THE FEELING</b></div>
              <label htmlFor="day-description">What belongs in your ideal day?</label>
              <textarea id="day-description" maxLength={2000} rows={7} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Sleep deeply, make something, walk nowhere in particular…" />
              <div className="composer-meta"><span>{description.length} / 2,000</span><button type="button" className="voice" onClick={startVoice}>● Add by voice</button></div>
              <button className="build-button" disabled={busy || !description.trim()} onClick={() => void generate()}>{busy ? 'Shaping your day…' : 'Build my 24 hours'} <span>→</span></button>
              <p className="privacy">Private by default · original words never enter shares</p>
              <div className="examples"><span>TRY A SPARK</span>{examples.map((item) => <button key={item} onClick={() => setDescription(item)}>{item}</button>)}</div>
            </div>
          </section>
        )}

        {view === 'edit' && plan && (
          <section className="workspace">
            <div className="workspace-head">
              <div><p className="kicker">Your day, in full</p><input className="title-input" aria-label="Plan title" value={plan.title} maxLength={80} onChange={(event) => setPlan({ ...plan, title: event.target.value })} /></div>
              <div className="tools"><button onClick={undo} disabled={!history.length}>↶ Undo</button><button onClick={redo} disabled={!future.length}>↷ Redo</button><button className="accent" onClick={() => void save()}>Save day</button></div>
            </div>
            <div className="conservation">
              <div><span>Allocated</span><strong>{Math.floor(total / 60)}h {total % 60}m</strong></div>
              <div><span>Open</span><strong>{Math.floor(openMinutes / 60)}h {openMinutes % 60}m</strong></div>
              <div><span>Overlaps</span><strong>0</strong></div>
              <div className="conserved"><span>Day status</span><strong>{total === DAY_MINUTES ? '24h conserved ✓' : 'Needs attention'}</strong></div>
            </div>
            <Timeline blocks={plan.blocks} />
            <div className="editor-toolbar"><h2>Shape the edges</h2><label>Snap<select value={snap} onChange={(event) => setSnap(Number(event.target.value))}><option value="1">1 min</option><option value="5">5 min</option><option value="15">15 min</option><option value="30">30 min</option></select></label></div>
            <ol className="block-editor">
              {plan.blocks.map((block, index) => (
                <li key={block.id}>
                  <span className="color-dot" style={{ background: categories[block.categoryId].color }} />
                  <div className="block-copy"><input aria-label={`Title for block ${index + 1}`} value={block.title} maxLength={80} onChange={(event) => updateBlock(block.id, { title: event.target.value })} /><select aria-label={`Category for ${block.title}`} value={block.categoryId} onChange={(event) => updateBlock(block.id, { categoryId: event.target.value as TimeBlock['categoryId'] })}>{Object.entries(categories).map(([id, category]) => <option key={id} value={id}>{category.label}</option>)}</select></div>
                  <div className="time-copy"><strong>{formatTime(block.startMin)}–{formatTime(block.endMin)}</strong><span>{Math.floor(minutesOf(block) / 60)}h {minutesOf(block) % 60}m</span></div>
                  <div className="boundary-actions">
                    <button aria-label={`Shorten ${block.title} by ${snap} minutes`} disabled={index === plan.blocks.length - 1} onClick={() => adjustBoundary(index, -snap)}>−</button>
                    <button aria-label={`Lengthen ${block.title} by ${snap} minutes`} disabled={index === plan.blocks.length - 1} onClick={() => adjustBoundary(index, snap)}>+</button>
                    <button aria-label={`Turn ${block.title} into open time`} onClick={() => commit(deleteAsOpenTime(plan.blocks, block.id), `${block.title} is now open time. Undo is available.`)}>×</button>
                  </div>
                </li>
              ))}
            </ol>
            <div className="bottom-cta"><p><b>Nothing is graded here.</b><br />Change the day until it feels like yours.</p><button className="build-button" onClick={() => setView('discover')}>See the ridiculous scale <span>→</span></button></div>
          </section>
        )}

        {view === 'discover' && plan && (
          <section className="discover">
            <div className="discover-hero">
              <p className="kicker">Repeat this day for one year</p>
              <h1>Tiny choices become <em>beautifully enormous.</em></h1>
              <p>Every number below is calculated from your current plan. Open a card to inspect the units, source, formula, and rounding.</p>
            </div>
            <div className="insight-grid">{insights.map((item, index) => <details key={item.id} open={index === 0}><summary><span>0{index + 1}</span><h2>{item.text}</h2><b>+</b></summary><p>{item.detail}</p></details>)}</div>
            <div className="share-panel"><div><p className="kicker">A day other people can remix</p><h2>Your private words stay private.</h2><p>The share contains categories, proportions, colors, and comparison IDs only.</p></div><div><button className="build-button" onClick={() => void sharePlan()}>Share through Eazo <span>↗</span></button><button onClick={() => downloadJson('my-ideal-day.json', sanitizeForShare(plan))}>Export safe JSON</button></div></div>
          </section>
        )}

        {view === 'library' && (
          <section className="library">
            <div className="library-head"><div><p className="kicker">Your private library</p><h1>Days worth returning to.</h1></div>{lastDeleted && <button onClick={() => void savePlan(lastDeleted).then(() => listPlans()).then(setSavedPlans).then(() => setLastDeleted(null))}>Restore last deleted</button>}</div>
            {savedPlans.length === 0 ? <div className="empty"><span>00</span><h2>No saved days yet.</h2><p>Build one, tune the edges, and save it here. Up to 20 stay on this device.</p><button className="accent" onClick={() => setView('compose')}>Build the first one</button></div> : <div className="plan-grid">{savedPlans.map((item) => <article key={item.planId}><p>{new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p><h2>{item.title}</h2><Timeline blocks={item.blocks} /><div><button onClick={() => { setPlan(item); setView('edit'); setNotice('Saved day opened.'); }}>Open</button><button onClick={() => void duplicate(item)}>Remix</button><button onClick={() => void removePlan(item.planId).then(() => { setLastDeleted(item); return listPlans(); }).then(setSavedPlans)}>Delete</button></div></article>)}</div>}
          </section>
        )}
      </main>
      <footer><Logo /><p>Built for curiosity, not optimization.<br />Local-first · Offline-ready · Eazo-native sharing</p><button onClick={() => { setPlan(null); setView('compose'); }}>Start fresh</button></footer>
    </div>
  );
}
