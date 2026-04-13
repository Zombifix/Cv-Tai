import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AlignLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useLogin, useRegister } from "@/hooks/use-auth";

// ─── Google icon (inline SVG, no dependency) ─────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

// ─── Blue panel — left side ───────────────────────────────────────────────────
function HeroPanel() {
  return (
    <div className="relative flex flex-col justify-between h-full rounded-[20px] overflow-hidden p-8 bg-[#1a3faa]"
      style={{
        background: "linear-gradient(160deg, #1a3faa 0%, #2355c7 40%, #1e4dc4 60%, #173ba0 100%)",
      }}
    >
      {/* Vertical stripe texture overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 18px,
            rgba(255,255,255,0.04) 18px,
            rgba(255,255,255,0.04) 20px
          )`,
        }}
      />
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 60% 40%, rgba(100,140,255,0.25) 0%, transparent 70%)",
        }}
      />

      {/* Top line */}
      <div className="relative flex items-center gap-4 z-10">
        <p className="text-white/80 text-sm font-light tracking-wide">Turn one CV into many</p>
        <div className="flex-1 h-px bg-white/25 max-w-[60px]" />
      </div>

      {/* Bottom copy */}
      <div className="relative z-10 space-y-3">
        <h2 className="text-white text-4xl font-bold leading-tight tracking-tight">
          Don't discard<br />your chances.<br />Discard your noise
        </h2>
        <p className="text-white/60 text-sm leading-relaxed max-w-[300px]">
          The right version of your CV makes all the difference in landing the opportunities you want.
        </p>
      </div>
    </div>
  );
}

// ─── Auth page ────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { data: user } = useCurrentUser();

  const login = useLogin();
  const register = useRegister();
  const mutation = mode === "login" ? login : register;

  useEffect(() => {
    if (user) setLocation("/library");
  }, [user, setLocation]);

  const passwordValid =
    mode === "register" ? /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password) : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register" && !passwordValid) {
      setError("8 caractères min., 1 majuscule, 1 minuscule, 1 chiffre.");
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
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-[900px] bg-white rounded-[24px] overflow-hidden shadow-2xl"
        style={{ minHeight: 560 }}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] h-full">

          {/* Left — hero panel */}
          <div className="hidden md:block p-3">
            <HeroPanel />
          </div>

          {/* Right — form */}
          <div className="flex flex-col items-center justify-center px-10 py-12 bg-white">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8">
              <AlignLeft className="w-5 h-5 text-[#1e293b]" strokeWidth={2.5} />
              <span className="font-extrabold text-xl tracking-tight text-[#1e293b]">dispatch.</span>
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1e293b] mb-1">
              Welcome Back
            </h1>
            <p className="text-sm text-[#94a3b8] mb-7 text-center">
              {mode === "login"
                ? "Enter your email and password to sign in"
                : "Create an account to get started"}
            </p>

            {/* Sign in / Sign up toggle */}
            <div className="flex w-full rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-1 mb-6">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); }}
                className={[
                  "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                  mode === "login"
                    ? "bg-white text-[#1e293b] shadow-sm"
                    : "text-[#94a3b8] hover:text-[#64748b]",
                ].join(" ")}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(null); }}
                className={[
                  "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                  mode === "register"
                    ? "bg-primary text-white shadow-sm"
                    : "text-[#94a3b8] hover:text-[#64748b]",
                ].join(" ")}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1e293b]">Email</label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 rounded-xl bg-[#f8fafc] border-[#e2e8f0] text-[#1e293b] placeholder:text-[#94a3b8]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1e293b]">Mot de passe</label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-12 rounded-xl bg-[#f8fafc] border-[#e2e8f0] text-[#1e293b] placeholder:text-[#94a3b8]"
                />
                {mode === "register" && password.length > 0 && !passwordValid && (
                  <p className="text-xs text-[#94a3b8]">1 maj, 1 min, 1 chiffre, 8 car. min.</p>
                )}
              </div>

              {mode === "register" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1e293b]">Code d'invitation</label>
                  <Input
                    type="text"
                    placeholder="Fourni par l'admin"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    autoComplete="off"
                    className="h-12 rounded-xl bg-[#f8fafc] border-[#e2e8f0] text-[#1e293b] placeholder:text-[#94a3b8]"
                  />
                </div>
              )}

              {mode === "login" && (
                <div className="text-right">
                  <button type="button" className="text-xs text-[#94a3b8] hover:text-[#64748b] transition-colors">
                    Mot pass oublie ?
                  </button>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90"
                disabled={mutation.isPending}
              >
                {mutation.isPending
                  ? "Chargement..."
                  : mode === "login" ? "Login" : "Créer un compte"}
              </Button>

              {/* Google button — visual only (no OAuth implemented) */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl text-sm font-medium border-[#e2e8f0] text-[#1e293b] hover:bg-[#f8fafc] gap-2"
              >
                <GoogleIcon />
                Sign up with Google
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
