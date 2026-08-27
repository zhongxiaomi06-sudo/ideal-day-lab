import type { PropsWithChildren, ReactNode } from 'react';

type ExperienceShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  status?: ReactNode;
}>;

export function ExperienceShell({ eyebrow, title, description, accent, status, children }: ExperienceShellProps) {
  const moveToMain = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const main = document.getElementById('main');
    main?.focus();
    globalThis.history?.replaceState(null, '', '#main');
  };
  return (
    <div className="experience" style={{ '--accent': accent } as React.CSSProperties}>
      <a className="skip-link" href="#main" onClick={moveToMain}>Skip to experience</a>
      <header className="hero">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lede">{description}</p>
        </div>
        {status ? <div className="status-pill" role="status">{status}</div> : null}
      </header>
      <main id="main" tabIndex={-1}>{children}</main>
      <footer>
        <span>Fixture build · local-first · no account</span>
        <button type="button" onClick={() => globalThis.location?.reload()}>Reset</button>
      </footer>
    </div>
  );
}
