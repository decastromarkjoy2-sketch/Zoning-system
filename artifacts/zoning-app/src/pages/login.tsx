import { useState } from "react";
import { useLocation } from "wouter";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppLogo } from "@/hooks/use-app-logo";
import { useAppBranding } from "@/hooks/use-app-branding";
import { useAuth } from "@/contexts/auth-context";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("admin@lgu.gov.ph");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { logoUrl } = useAppLogo();
  const { appName, divisionName } = useAppBranding();
  const { login } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(222,47%,11%)] via-[hsl(217,32%,17%)] to-[hsl(205,78%,20%)] px-4">
      <div className="w-full max-w-lg space-y-7">
        <div className="flex flex-col items-center gap-4">
          <div className="mx-auto bg-white p-2 rounded-full shadow-lg w-24 h-24 flex items-center justify-center mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Organization logo" className="object-contain w-full h-full rounded-full" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-primary">
                <Map className="h-11 w-11 text-primary-foreground" />
              </div>
            )}
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight">{appName}</h1>
            <p className="text-sm text-white/60 mt-1">{divisionName}</p>
          </div>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="pb-5 pt-7 px-8">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription className="text-sm">Enter your credentials to access the zoning management platform.</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@lgu.gov.ph"
                  className="h-11 text-sm"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 text-sm"
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}
              <Button type="submit" className="w-full h-11 text-base" size="lg" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Demo: admin@lgu.gov.ph / password
            </p>
          </CardContent>
        </Card>

        <div className="text-center space-y-1">
          <p className="text-xs text-white/50 font-medium tracking-wide">
            {appName} v1.0
          </p>
          <p className="text-xs text-white/35">
            © 2026 {divisionName} | Designed &amp; Developed by Engr. Mark Joy B. De Castro
          </p>
        </div>
      </div>
    </div>
  );
}
