import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export function Header() {
  return (
    <header className="border-b border-benchr-border bg-benchr-bg-header shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="text-xl font-semibold text-benchr-gold hover:text-benchr-gold-hover transition-colors cursor-pointer">
          benchr
        </Link>
        {/* Navigation */}
        <nav className="flex items-center gap-3">
          <Button asChild variant="ghost" className="text-benchr-text-light cursor-pointer">
            <Link to="/sandbox">Sandbox</Link>
          </Button>
          <Button asChild variant="ghost" className="text-benchr-text-light cursor-pointer">
            <Link to="/problems">Problems</Link>
          </Button>
          <Button asChild variant="outline" className="border-benchr-border cursor-pointer">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild className="bg-benchr-gold text-benchr-text-dark hover:bg-benchr-gold-hover cursor-pointer">
            <Link to="/signup">Sign Up</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
