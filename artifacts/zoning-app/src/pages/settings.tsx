import { Sun, Moon, Monitor, Map, Info, ExternalLink, ImageIcon, Upload, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAppLogo } from "@/hooks/use-app-logo";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { logoUrl, saveLogo, removeLogo } = useAppLogo();
  const { toast } = useToast();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Unsupported format", description: "Please upload a JPG or PNG image.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2 MB.", variant: "destructive" });
      return;
    }

    await saveLogo(file);
    toast({ title: "Logo updated", description: "The new logo will appear on the login screen." });
  }

  function handleRemove() {
    removeLogo();
    toast({ title: "Logo removed", description: "The default icon will be used." });
  }

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

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Organization Logo
          </CardTitle>
          <CardDescription>
            Upload a JPG or PNG logo (max 2 MB). It appears on the login screen in place of the default icon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary shadow overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Current logo" className="h-full w-full object-cover" />
              ) : (
                <Map className="h-10 w-10 text-primary-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {logoUrl ? "Custom logo is active." : "Using the default map icon."}
              </p>
              <div className="flex gap-2 flex-wrap">
                {/* Label triggers the file input natively — no JS click() needed */}
                <label
                  htmlFor="logo-file-input"
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {logoUrl ? "Replace Logo" : "Upload Logo"}
                </label>
                <input
                  id="logo-file-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                {logoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={handleRemove}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Accepted formats: JPG, PNG — square images work best (e.g. 256×256 px).
          </p>
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
              <p className="font-medium">LGU Planning Division</p>
            </div>
            <div>
              <p className="text-muted-foreground">Database</p>
              <Badge variant="default" className="mt-0.5">PostgreSQL</Badge>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Developed by</p>
              <p className="font-medium">Engr. Mark Joy B. De Castro</p>
            </div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            © 2026 LGU Planning Division. This system is for authorized government personnel only. All actions are logged in the audit trail.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
