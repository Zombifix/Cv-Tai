import { useState } from "react";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLogin, useRegister } from "@/hooks/use-auth";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useLogin();
  const register = useRegister();

  const mutation = mode === "login" ? login : register;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await mutation.mutateAsync({ email, password });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background/50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-primary/10 text-primary p-3 rounded-2xl">
            <FileText className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CV Tailor</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Connecte-toi pour acceder a ta librairie." : "Cree un compte pour commencer."}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {mode === "login" ? "Connexion" : "Inscription"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Entre tes identifiants pour continuer."
                : "Choisis un email et un mot de passe (8 caracteres min)."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="toi@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={mode === "register" ? "Min 8 caracteres" : ""}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Chargement..."
                  : mode === "login" ? "Se connecter" : "Creer un compte"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                onClick={() => { setMode(m => m === "login" ? "register" : "login"); setError(null); }}
              >
                {mode === "login" ? "Pas de compte ? Inscris-toi" : "Deja un compte ? Connecte-toi"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
