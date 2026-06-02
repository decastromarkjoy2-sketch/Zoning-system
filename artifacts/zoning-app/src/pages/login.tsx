import { useState } from "react";
import { useLocation } from "wouter";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("admin@lgu.gov.ph");
  const [password, setPassword] = useState("password");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(222,47%,11%)] via-[hsl(217,32%,17%)] to-[hsl(205,78%,20%)] px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Map className="h-9 w-9 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Municipal Zoning System</h1>
            <p className="text-sm text-white/60 mt-1">Local Government Unit — Planning Division</p>
          </div>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sign in to your account</CardTitle>
            <CardDescription>Enter your credentials to access the zoning management platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@lgu.gov.ph"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Sign in
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Demo: admin@lgu.gov.ph / password
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/40">
          Municipal Zoning Information System v1.0
        </p>
      </div>
    </div>
  );
}
