import { useState } from "react";
import { useLocation } from "wouter";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppLogo } from "@/hooks/use-app-logo";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("admin@lgu.gov.ph");
  const [password, setPassword] = useState("password");
  const { logoUrl } = useAppLogo();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(222,47%,11%)] via-[hsl(217,32%,17%)] to-[hsl(205,78%,20%)] px-4">
      <div className="w-full max-w-lg space-y-7">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-xl overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Organization logo" className="h-full w-full object-cover" />
            ) : (
              <Map className="h-11 w-11 text-primary-foreground" />
            )}
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight">Municipal Zoning System</h1>
            <p className="text-sm text-white/60 mt-1">Local Government Unit — Planning Division</p>
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
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base" size="lg">
                Sign in
              </Button>
            </form>
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Demo: admin@lgu.gov.ph / password
            </p>
          </CardContent>
        </Card>

        <div className="text-center space-y-1">
          <p className="text-xs text-white/50 font-medium tracking-wide">
            Municipal Zoning Information System v1.0
          </p>
          <p className="text-xs text-white/35">
            © 2026 LGU Planning Division | Designed &amp; Developed by Engr. Mark Joy B. De Castro
          </p>
        </div>
      </div>
    </div>
  );
}
