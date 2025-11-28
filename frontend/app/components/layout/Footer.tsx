export function Footer() {
  return (
    <footer className="border-t border-benchr-border bg-benchr-bg-header px-4 py-3">
      <div className="flex flex-col items-center gap-1 text-xs text-benchr-text-muted">
        <div>benchr © 2025</div>
        <div>
          Made with ❤️ by {' '}
          <a href="https://github.com/agge3" target="_blank" rel="noopener noreferrer" className="hover:text-benchr-text-light underline">
            agge3,
          </a>{' '}
          <a href="https://github.com/kpowkitty" target="_blank" rel="noopener noreferrer" className="hover:text-benchr-text-light underline">
            kpowkitty,
          </a>{' '}
          <a href="https://github.com/whoIsStella" target="_blank" rel="noopener noreferrer" className="hover:text-benchr-text-light underline">
            whoIsStella
          </a>
        </div>
        <div>
          <a href="https://ko-fi.com/benchr" target="_blank" rel="noopener noreferrer" className="hover:text-benchr-text-light underline">
            Support us on Ko-fi
          </a>
        </div>
      </div>
    </footer>
  );
}
