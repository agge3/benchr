export function Footer() {
  return (
    <footer className="border-t border-benchr-border bg-benchr-bg-header px-4 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-benchr-text-muted">
        <div className="text-center sm:text-left">
          Made with &lt;3 @ CalHacks 12.0.{' '}
          <a href="https://github.com/agge3" target="_blank" rel="noopener noreferrer" className="hover:text-benchr-text-light underline">
            @agge3
          </a>{' '}
          <a href="https://github.com/kpowkitty" target="_blank" rel="noopener noreferrer" className="hover:text-benchr-text-light underline">
            @kpowkitty
          </a>{' '}
          <a href="https://github.com/whoIsStella" target="_blank" rel="noopener noreferrer" className="hover:text-benchr-text-light underline">
            @whoIsStella
          </a>
        </div>
        <div className="text-center">
          benchr © 2025
        </div>
        <div className="text-center sm:text-right">
          <a href="https://ko-fi.com/benchr" target="_blank" rel="noopener noreferrer" className="hover:text-benchr-text-light underline">
            Support us on Ko-fi
          </a>
        </div>
      </div>
    </footer>
  );
}
