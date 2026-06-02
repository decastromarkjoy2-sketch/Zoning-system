import { Sun, Moon, Monitor, Map, Info, ExternalLink } from "lucide-react";
import { useTheme } from "next-themes";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>Choose your preferred display theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:bg-muted/50 ${
                  theme === value ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <Icon className={`h-6 w-6 ${theme === value ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${theme === value ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KoboToolbox shortcut */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Integrations
          </CardTitle>
          <CardDescription>External service configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">KoboToolbox</p>
              <p className="text-sm text-muted-foreground">Configure API connection and sync interval</p>
            </div>
            <Link href="/kobo">
              <Button variant="outline" size="sm" className="gap-1.5">
                Configure
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Application</p>
              <p className="font-medium">Municipal Zoning Information System</p>
            </div>
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">Division</p>
              <p className="font-medium">Local Government Unit — Planning Division</p>
            </div>
            <div>
              <p className="text-muted-foreground">Database</p>
              <Badge variant="default" className="mt-0.5">PostgreSQL</Badge>
            </div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            This system is for authorized government personnel only. All actions are logged in the audit trail.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
