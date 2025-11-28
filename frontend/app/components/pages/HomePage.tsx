// components/pages/HomePage.tsx
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

export default function HomePage() {
  return (
    <div className="h-full overflow-auto bg-benchr-bg-main">
      {/* Hero Section */}
      <div className="relative isolate">
        {/* Main Gradient Background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-benchr-bg via-benchr-bg-secondary to-benchr-bg opacity-50" />
        
        {/* Left side gradient peek */}
        <div className="absolute left-0 top-[20%] -z-10 h-[60%] w-[30%] bg-gradient-to-r from-benchr-gold/30 to-transparent blur-3xl" />
        
        {/* Right side gradient peek (asymmetric) */}
        <div className="absolute right-0 top-[40%] -z-10 h-[40%] w-[25%] bg-gradient-to-l from-benchr-gold-accent/20 to-transparent blur-3xl" />
        
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            {/* Logo/Brand */}
            <h1 className="text-5xl font-bold tracking-tight text-benchr-text-light sm:text-7xl">
              bench<span className="text-benchr-gold">r</span>.cc
            </h1>

            {/* Tagline */}
            <p className="mt-6 text-lg leading-8 text-benchr-text-muted sm:text-xl">
              Competitive code benchmarking platform
            </p>

            {/* Mission Statement */}
            <p className="mt-8 text-base leading-7 text-benchr-text-light sm:text-lg">
              Write better code. Measure performance. Compete with developers worldwide.
              Submit your solutions and see how they stack up against the best.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button
                asChild
                size="lg"
                className="bg-benchr-gold text-benchr-text-dark hover:bg-benchr-gold-hover cursor-pointer"
              >
                <Link to="/signup">Get started</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-benchr-border bg-benchr-bg-elevated text-benchr-text-light hover:bg-benchr-bg-header cursor-pointer"
              >
                <Link to="/login">Sign in</Link>
              </Button>
            </div>

            {/* Quick Stats or Features Preview */}
            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <Card className="bg-benchr-bg-elevated border-benchr-border">
                <CardContent className="flex flex-col items-center pt-6">
                  <Badge className="bg-benchr-gold text-benchr-text-dark hover:bg-benchr-gold-accent mb-4">
                    Fast
                  </Badge>
                  <div className="text-4xl font-bold text-benchr-gold mb-2">⚡</div>
                  <div className="text-sm text-benchr-text-muted text-center">
                    Instant benchmarking with Firecracker VMs
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-benchr-bg-elevated border-benchr-border">
                <CardContent className="flex flex-col items-center pt-6">
                  <Badge className="bg-benchr-gold text-benchr-text-dark hover:bg-benchr-gold-accent mb-4">
                    Fair
                  </Badge>
                  <div className="text-4xl font-bold text-benchr-gold mb-2">⚖️</div>
                  <div className="text-sm text-benchr-text-muted text-center">
                    Isolated execution environment for accurate results
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-benchr-bg-elevated border-benchr-border">
                <CardContent className="flex flex-col items-center pt-6">
                  <Badge className="bg-benchr-gold text-benchr-text-dark hover:bg-benchr-gold-accent mb-4">
                    Free
                  </Badge>
                  <div className="text-4xl font-bold text-benchr-gold mb-2">🎁</div>
                  <div className="text-sm text-benchr-text-muted text-center">
                    Open to all developers, no hidden costs
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
