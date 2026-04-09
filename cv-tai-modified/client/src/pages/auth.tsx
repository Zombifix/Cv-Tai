import { useEffect, useState } from "react";
import { FileText, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useLogin, useRegister } from "@/hooks/use-auth";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { data: user } = useCurrentUser();

  const login = useLogin();
  const register = useRegister();
  const mutation = mode === "login" ? login : register;

  useEffect(() => {
    if (user) setLocation("/library");
  }, [user, setLocation]);

  const passwordValid = mode === "register" ? /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password) : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register" && !passwordValid) {
      setError("8 caractères min, 1 majuscule, 1 minuscule, 1 chiffre.");
      return;
    }
    try {
      if (mode === "register") {
        await register.mutateAsync({ email, password, ...(inviteCode ? { inviteCode } : {}) });
      } else {
        await login.mutateAsync({ email, password });
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] bg-gradient-to-br from-primary/8 via-background to-accent/6 border-r border-border/50 p-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/12 text-primary p-2.5 rounded-2xl">
            <FileText className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-foreground">CV Tailor</span>
        </div>

        {/* Value props */}
        <div className="space-y-10 animate-fade-up">
          <div className="space-y-3">
            <div className="section-label">Ton CV. Ta voix.</div>
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Postule plus vite,<br />
              <span className="text-gradient">sans sacrifier la qualité.</span>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
              Le moteur sélectionne et adapte tes bullets depuis ta bibliothèque personnelle — ancré dans ton vrai profil.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 stagger">
            {[
              { label: "Super CV intelligent", desc: "Ta bibliothèque de bullets reste ta source de vérité" },
              { label: "Scoring hybride", desc: "Déterministe + LLM pour un match fiable à chaque fois" },
              { label: "Positionnement adaptatif", desc: "Consultant, lead, IC ou manager — le moteur s'adapte" },
            ].map((feat, i) => (
              <div key={i} className="flex items-start gap-3 animate-fade-up">
                <div className="w-5 h-5 rounded-full bg-primary/12 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{feat.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{feat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer quote */}
        <p className="text-xs text-muted-foreground">
          "Le vrai produit, c'est le CV généré."
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] space-y-8 animate-fade-up">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center">
            <div className="bg-primary/12 text-primary p-2.5 rounded-2xl">
              <FileText className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">CV Tailor</span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {mode === "login" ? "Bon retour 👋" : "Créer un compte"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Entre tes identifiants pour accéder à ta bibliothèque."
                : "Rejoins avec un code d'invitation."}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 rounded-2xl bg-muted/60">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200
                  ${mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="toi@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 rounded-2xl border-border/60 bg-background text-sm focus-warm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "8 car. min, maj + min + chiffre" : ""}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-11 rounded-2xl border-border/60 bg-background text-sm pr-10 focus-warm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === "register" && password.length > 0 && !passwordValid && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-600 inline-flex items-center justify-center text-[8px] font-bold">!</span>
                  1 majuscule, 1 minuscule, 1 chiffre, 8 caractères min.
                </p>
              )}
            </div>

            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode" className="text-sm font-semibold">Code d'invitation</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="Fourni par l'admin"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  autoComplete="off"
                  className="h-11 rounded-2xl border-border/60 bg-background text-sm focus-warm"
                />
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-destructive/8 border border-destructive/25 px-4 py-3 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-2xl text-sm font-semibold shadow-lg shadow-primary/20 btn-press gap-2"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <div className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Se connecter" : "Créer un compte"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            En continuant, tu acceptes que tes données restent privées et ne sont jamais partagées.
          </p>
        </div>
      </div>
    </div>
  );
}
