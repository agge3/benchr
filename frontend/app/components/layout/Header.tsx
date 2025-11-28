import { Link } from "react-router";

export function Header() {
  return (
    <header className="border-b border-benchr-border bg-benchr-bg-header shadow-lg">
      <div className="flex items-center justify-center px-4 py-3">
        {/* Logo */}
        <Link to="/" className="text-xl font-semibold text-benchr-gold hover:text-benchr-gold-hover transition-colors cursor-pointer">
          benchr
        </Link>
      </div>
    </header>
  );
}
