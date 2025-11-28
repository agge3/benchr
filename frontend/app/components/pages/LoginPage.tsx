import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export default function LoginPage() {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-12 bg-benchr-bg-main">
      <Card className="w-full max-w-md bg-benchr-bg-elevated border-benchr-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-benchr-text-light">Sign in</CardTitle>
          <CardDescription className="text-benchr-text-muted">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-benchr-text-light">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="bg-benchr-bg-main border-benchr-border text-benchr-text-light"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-benchr-text-light">Password</Label>
            <Input
              id="password"
              type="password"
              className="bg-benchr-bg-main border-benchr-border text-benchr-text-light"
            />
          </div>
          <Button className="w-full bg-benchr-gold text-benchr-text-dark hover:bg-benchr-gold-hover">
            Sign in
          </Button>
          <div className="text-center text-sm text-benchr-text-muted">
            Don't have an account?{" "}
            <Link to="/signup" className="text-benchr-gold hover:text-benchr-gold-hover">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
