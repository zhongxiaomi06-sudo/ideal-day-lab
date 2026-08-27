import type { ReactNode } from 'react';

export function ResultCard({ title, kicker, children, onAgain }: { title: string; kicker: string; children: ReactNode; onAgain: () => void }) {
  const copyResult = async () => {
    await globalThis.navigator?.clipboard?.writeText(`${title} — ${kicker}`);
  };
  return (
    <section className="result-card" aria-labelledby="result-title">
      <p className="eyebrow">Your result</p>
      <h2 id="result-title">{title}</h2>
      <p className="result-kicker">{kicker}</p>
      <div>{children}</div>
      <div className="actions">
        <button className="primary" type="button" onClick={copyResult}>Copy result</button>
        <button type="button" onClick={onAgain}>Try again</button>
      </div>
    </section>
  );
}
