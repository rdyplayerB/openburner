export default function NotFound() {
  return (
    <div className="sw-screen min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="sw-uplabel mb-3">Error 404</p>
        <h1 className="text-6xl sw-display text-[var(--sw-ink)] mb-3">
          <span className="sw-accent">4</span>0<span className="sw-accent">4</span>
        </h1>
        <p className="text-base text-[var(--sw-muted)] mb-8">Page not found</p>
        <a
          href="/"
          className="sw-btn-primary inline-flex items-center px-6 py-3 text-sm"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
