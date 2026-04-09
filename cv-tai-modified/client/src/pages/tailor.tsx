import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useGenerateTailor, useCheckMatch } from "@/hooks/use-tailor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Info,
  Link as LinkIcon,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SCRAPE_BLOCKED_DOMAINS = [
  "indeed.com",
  "glassdoor.com",
  "monster.com",
  "apec.fr",
  "francetravail.fr",
  "pole-emploi.fr",
  "hellowork.com",
  "cadremploi.fr",
];

const TAILOR_PREFS_KEY = "cv-tailor:preferences";

function getUrlWarning(url: string): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (SCRAPE_BLOCKED_DOMAINS.some((domain) => hostname.includes(domain))) {
      return "Ce site bloque le scraping automatique. Copie-colle le texte de l'annonce directement dans le champ ci-dessous.";
    }
    if (hostname.includes("linkedin.com")) {
      return "LinkedIn peut bloquer la récupération automatique. Si l'analyse échoue, colle le texte de l'annonce pour continuer.";
    }
  } catch {}
  return null;
}

type Mode = "fidele" | "optimise";
type PrecheckVerdict = "go" | "prudence" | "faible_chance";

function getPrecheckVerdictMeta(verdict?: PrecheckVerdict) {
  switch (verdict) {
    case "go":
      return {
        label: "Go",
        emphasisClassName: "text-green-600 dark:text-green-400",
        description: "Le triage rapide voit assez de signaux pour lancer la génération sereinement.",
      };
    case "prudence":
      return {
        label: "Prudence",
        emphasisClassName: "text-amber-600 dark:text-amber-400",
        description: "Le triage rapide reste ouvert, mais l'annonce demande une lecture plus fine ou une source plus propre.",
      };
    case "faible_chance":
      return {
        label: "Faible chance",
        emphasisClassName: "text-red-600 dark:text-red-400",
        description: "Le triage rapide voit peu de preuves directes pour cette offre à ce stade.",
      };
    default:
      return {
        label: "Pre-check",
        emphasisClassName: "text-muted-foreground",
        description: "Le triage rapide reste un signal indicatif avant la génération complète.",
      };
  }
}

function normalizeLinkedInUrl(rawUrl: string): { url: string; converted: boolean } {
  if (!rawUrl) return { url: rawUrl, converted: false };
  try {
    const urlObj = new URL(rawUrl);
    if (!urlObj.hostname.includes("linkedin.com")) return { url: rawUrl, converted: false };
    const jobIdParam = urlObj.searchParams.get("currentJobId");
    if (jobIdParam) {
      return { url: `https://www.linkedin.com/jobs/view/${jobIdParam}`, converted: true };
    }
    return { url: rawUrl, converted: false };
  } catch {
    return { url: rawUrl, converted: false };
  }
}

export default function Tailor() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const generate = useGenerateTailor();
  const checkMatch = useCheckMatch();

  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("optimise");
  const [urlConverted, setUrlConverted] = useState(false);
  const [introMaxChars, setIntroMaxChars] = useState("");
  const [bodyMaxChars, setBodyMaxChars] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<{ score: number; jobTitle: string; verdict?: PrecheckVerdict; message?: string } | null>(null);
  const [scrapeFailReason, setScrapeFailReason] = useState<string | null>(null);
  const [scrapeNotice, setScrapeNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawPrefs = window.localStorage.getItem(TAILOR_PREFS_KEY);
      if (!rawPrefs) return;
      const parsed = JSON.parse(rawPrefs) as { introMaxChars?: string; bodyMaxChars?: string };
      if (typeof parsed.introMaxChars === "string") setIntroMaxChars(parsed.introMaxChars);
      if (typeof parsed.bodyMaxChars === "string") setBodyMaxChars(parsed.bodyMaxChars);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(TAILOR_PREFS_KEY, JSON.stringify({ introMaxChars, bodyMaxChars }));
    } catch {}
  }, [introMaxChars, bodyMaxChars]);

  useEffect(() => {
    try {
      const state = window.history.state;
      if (state?.tailorPrefill) {
        const { text: prefillText, url: prefillUrl } = state.tailorPrefill;
        window.history.replaceState({}, "", "/tailor");
        if (prefillUrl && prefillUrl.startsWith("http")) {
          const { url: normalized, converted } = normalizeLinkedInUrl(prefillUrl);
          setUrl(normalized);
          setUrlConverted(converted);
        } else if (prefillText) {
          const cleaned = prefillText.replace(/^Mock extracted description for .*/gm, "").trim();
          if (cleaned) setText(cleaned);
        }
      }
    } catch {}
  }, []);

  const urlWarning = getUrlWarning(url);
  const hasAnnouncement = Boolean(url.trim() || text.trim());
  const isBusy = checkMatch.isPending || generate.isPending;
  const pendingVerdictMeta = getPrecheckVerdictMeta(pendingConfirm?.verdict);

  const handleUrlChange = (value: string) => {
    const { url: normalized, converted } = normalizeLinkedInUrl(value);
    setUrl(normalized);
    setUrlConverted(converted);
    setScrapeFailReason(null);
    setScrapeNotice(null);
  };

  const doGenerate = async () => {
    try {
      const introChars = introMaxChars ? parseInt(introMaxChars, 10) : undefined;
      const bodyChars = bodyMaxChars ? parseInt(bodyMaxChars, 10) : undefined;
      const run = await generate.mutateAsync({
        url: url || undefined,
        text: text || undefined,
        mode: mode === "fidele" ? "original" : "polished",
        introMaxChars: introChars && introChars >= 50 ? introChars : undefined,
        bodyMaxChars: bodyChars && bodyChars >= 500 ? bodyChars : undefined,
        extraContext: extraContext.trim() || undefined,
      });
      toast({ title: "CV généré ✓", description: "Ton CV a été optimisé." });
      setLocation(`/results/${run.id}`);
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url && !text) {
      toast({ title: "Champ requis", description: "Colle une URL ou le texte de l'annonce.", variant: "destructive" });
      return;
    }
    try {
      const check = await checkMatch.mutateAsync({
        url: url || undefined,
        text: text || undefined,
        extraContext: extraContext.trim() || undefined,
      });
      setScrapeNotice(
        check.jobInput?.scrapeQuality === "uncertain"
          ? check.jobInput.scrapeMessage || "Annonce partiellement bruitée : le score est à lire avec prudence."
          : null,
      );
      if (check.shouldWarn) {
        setPendingConfirm({ score: check.preliminaryConfidence, jobTitle: check.jobTitle, verdict: check.precheckVerdict, message: check.warningMessage });
        return;
      }
    } catch (err) {
      const message = (err as Error).message;
      if (url && !text && /colle le texte|je n'ai pas pu lire|bloque la recuperation|impossible de recuperer/i.test(message)) {
        setScrapeFailReason(message);
        return;
      }
    }
    await doGenerate();
  };

  return (
    <>
      <Layout>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 animate-fade-up">
          {/* Page header */}
          <section className="space-y-4">
            <div className="pill bg-primary/10 text-primary">
              <WandSparkles className="h-3 w-3" />
              Tailoring
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Génère vite un CV cible
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
              Colle une annonce, choisis le niveau d'optimisation, puis lance. Le moteur part de ton Super CV pour sortir un document directement exploitable.
            </p>
            <div className="flex flex-wrap gap-2">
              {["URL ou texte brut", "Pre-check prudent avant génération", "Ton Super CV reste la source"].map((tag, i) => (
                <span key={i} className={`pill ${i === 2 ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground"}`}>
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* ── Left column: annonce ── */}
            <div className="space-y-5">
              <div className="surface-lg overflow-hidden">
                {/* Card header */}
                <div className="border-b border-border/50 bg-muted/20 px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="section-label mb-1">Annonce cible</div>
                      <h2 className="text-lg font-bold text-foreground">Colle la source la plus propre possible</h2>
                    </div>
                    <span className="pill bg-primary/10 text-primary border border-primary/20">
                      <Target className="h-3 w-3" />
                      Base du résultat
                    </span>
                  </div>
                </div>

                <div className="space-y-6 px-6 py-6">
                  {/* URL field */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">URL de l'annonce</Label>
                    <p className="text-xs text-muted-foreground">Pratique si le site se laisse scraper. Sinon, colle directement le texte.</p>
                    <div className="relative">
                      <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="https://linkedin.com/jobs/view/..."
                        className="h-11 rounded-2xl border-border/60 pl-10 text-sm focus-warm"
                        value={url}
                        onChange={(e) => handleUrlChange(e.target.value)}
                      />
                    </div>
                    {urlWarning && <Notice type="warn">{urlWarning}</Notice>}
                    {urlConverted && !urlWarning && (
                      <Notice type="info">URL LinkedIn convertie automatiquement pour une récupération plus stable.</Notice>
                    )}
                  </div>

                  <Divider label="ou" />

                  {/* Text field */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Texte de l'annonce</Label>
                    <p className="text-xs text-muted-foreground">Le plus fiable quand une page bloque le scraping ou est trop bruitée.</p>
                    {scrapeFailReason && <Notice type="warn">{scrapeFailReason} Colle le texte ici pour continuer.</Notice>}
                    {!scrapeFailReason && scrapeNotice && <Notice type="info">{scrapeNotice}</Notice>}
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Textarea
                        placeholder="Colle le texte brut de l'annonce ici..."
                        className="min-h-[280px] rounded-[20px] border-border/60 pl-10 pt-3 text-sm leading-6 focus-warm resize-none"
                        value={text}
                        onChange={(e) => {
                          setText(e.target.value);
                          if (e.target.value) { setScrapeFailReason(null); setScrapeNotice(null); }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right sidebar ── */}
            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              {/* CTA card */}
              <div className="surface-lg bg-gradient-to-b from-primary/[0.07] via-card to-card p-5 border-primary/25">
                <div className="space-y-0.5 mb-4">
                  <div className="section-label">Fast lane</div>
                  <h2 className="text-lg font-bold">Lancer le tailoring</h2>
                  <p className="text-xs text-muted-foreground">Une fois l'annonce collée, tout part d'ici.</p>
                </div>

                {/* Status row */}
                <div className="rounded-[18px] border border-border/50 bg-background/70 p-3.5 mb-4 space-y-2">
                  <StatusRow label="Mode" value={mode === "optimise" ? "Optimisé" : "Fidèle"} />
                  <StatusRow label="Annonce" value={hasAnnouncement ? "Renseignée ✓" : "À remplir"} highlight={hasAnnouncement} />
                  <StatusRow label="Limites" value={introMaxChars || bodyMaxChars ? "Personnalisées" : "Auto"} />
                </div>

                <Button type="submit" size="lg" className="w-full h-11 rounded-2xl text-sm font-semibold shadow-lg shadow-primary/20 btn-press gap-2" disabled={isBusy}>
                  {checkMatch.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analyse du match...</>
                  ) : generate.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Génération...</>
                  ) : (
                    <><WandSparkles className="h-4 w-4" /> Générer le CV</>
                  )}
                </Button>

                <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                  Pre-check prudent avant génération complète. Si l'optimisation n'apporte rien, le moteur garde silencieusement la version la plus solide.
                </p>
              </div>

              {/* Job profile assessment */}
              {checkMatch.data?.jobProfileAssessment && (() => {
                const jpa = checkMatch.data.jobProfileAssessment;
                const meta = {
                  worth_applying: { label: "Dans ta zone", dot: "bg-green-500", bg: "bg-green-50 dark:bg-green-950/20", border: "border-green-200 dark:border-green-800/50", text: "text-green-700 dark:text-green-400" },
                  possible_but_niche: { label: "Zone adjacente", dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800/50", text: "text-amber-700 dark:text-amber-400" },
                  likely_overreach: { label: "Hors zone", dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800/50", text: "text-red-700 dark:text-red-400" },
                }[jpa.verdict];
                return (
                  <div className={`rounded-[24px] border p-5 animate-scale-in ${meta.bg} ${meta.border}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="section-label">Profil vs offre</div>
                      <span className={`text-xs font-bold ${meta.text}`}>{jpa.zoneScore}% couvert</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      <p className={`text-sm font-semibold ${meta.text}`}>{meta.label}</p>
                    </div>
                    {jpa.signals.length > 0 && (
                      <ul className="space-y-1">
                        {jpa.signals.map((signal, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-relaxed">
                            <ArrowRight className="mt-0.5 h-2.5 w-2.5 flex-shrink-0" />
                            {signal}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}

              {/* Mode selector */}
              <div className="surface p-5">
                <div className="flex items-center gap-2 mb-1">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-sm">Mode</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {mode === "optimise" ? "Reformule légèrement pour mieux coller à l'annonce sans changer le fond." : "Sélectionne et agence tes bullets tels quels, sans réécriture."}
                </p>
                <RadioGroup value={mode} onValueChange={(value) => setMode(value as Mode)} className="space-y-2">
                  {([
                    { value: "fidele", icon: FileText, label: "Fidèle", badge: "Brut", desc: "Sélection pure sans reformulation" },
                    { value: "optimise", icon: Sparkles, label: "Optimisé", badge: "Recommandé", desc: "Le meilleur mode pour candidater vite" },
                  ] as const).map((opt) => (
                    <Label
                      key={opt.value}
                      htmlFor={`mode-${opt.value}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-[18px] border p-3.5 transition-all duration-200
                        ${mode === opt.value
                          ? "border-primary/40 bg-primary/6 shadow-sm"
                          : "border-border/60 hover:border-primary/25 hover:bg-muted/30"
                        }`}
                    >
                      <RadioGroupItem value={opt.value} id={`mode-${opt.value}`} className="sr-only" />
                      <opt.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${mode === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{opt.label}</span>
                          <span className={`pill text-[10px] py-0.5 ${mode === opt.value && opt.value === "optimise" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {opt.badge}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{opt.desc}</span>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Quick settings */}
              <div className="surface p-5">
                <h3 className="font-bold text-sm mb-1">Réglages rapides</h3>
                <p className="text-xs text-muted-foreground mb-4">Laisse vide pour un comportement auto.</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground font-semibold">Intro / Résumé pro</Label>
                    <Input type="number" placeholder="Ex: 300" value={introMaxChars} onChange={(e) => setIntroMaxChars(e.target.value)} className="h-10 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground font-semibold">Corps expériences</Label>
                    <Input type="number" placeholder="Ex: 3400" value={bodyMaxChars} onChange={(e) => setBodyMaxChars(e.target.value)} className="h-10 rounded-xl text-sm" />
                  </div>
                </div>
              </div>

              {/* Extra context */}
              <div className="surface p-5">
                <h3 className="font-bold text-sm mb-1">Contexte additionnel</h3>
                <p className="text-xs text-muted-foreground mb-3">Optionnel. Signal recruteur, angle business ou détail stratégique.</p>
                <Textarea
                  placeholder="Ex : Le recruteur cherche surtout quelqu'un capable de structurer les pratiques design dans une équipe produit déjà mature."
                  className="min-h-[110px] rounded-[18px] border-border/60 text-sm leading-6 focus-warm resize-none"
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                  maxLength={1000}
                />
                <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                  <span>Ne sert que si ça change vraiment la lecture du poste.</span>
                  <span>{extraContext.length}/1000</span>
                </div>
              </div>

              {/* Tips */}
              <div className="surface p-5 bg-muted/20">
                <h3 className="font-bold text-sm mb-3">Repères utiles</h3>
                <ul className="space-y-2">
                  {[
                    "Utilise le texte brut si une annonce est longue, répétitive ou mal scrappée.",
                    "Passe en fidèle si tu veux juger la sélection pure avant toute reformulation.",
                    "Garde les limites en auto si ton template n'impose pas de contrainte stricte.",
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ArrowRight className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </form>
        </div>
      </Layout>

      {/* Confirm dialog */}
      <AlertDialog open={!!pendingConfirm} onOpenChange={(open) => { if (!open) setPendingConfirm(null); }}>
        <AlertDialogContent className="rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingVerdictMeta.label} — générer quand même ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Triage rapide : <strong className={pendingVerdictMeta.emphasisClassName}>{pendingVerdictMeta.label}</strong>
                {pendingConfirm?.jobTitle && <> pour <em>{pendingConfirm.jobTitle}</em></>}.
              </span>
              <span className="block text-muted-foreground">{pendingVerdictMeta.description}</span>
              <span className="block text-muted-foreground">
                {pendingConfirm?.message && <span className="block mb-1">{pendingConfirm.message}</span>}
                Score indicatif : <strong className={pendingVerdictMeta.emphasisClassName}>{pendingConfirm?.score}%</strong>. Le jugement final se fait sur le CV généré, pas sur ce pre-check seul.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => setPendingConfirm(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { setPendingConfirm(null); await doGenerate(); }}
            >
              Générer quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ── Small helper components ── */
function Notice({ type, children }: { type: "warn" | "info"; children: React.ReactNode }) {
  const isWarn = type === "warn";
  return (
    <div className={`flex items-start gap-2 rounded-2xl border px-3.5 py-3 text-xs leading-5
      ${isWarn
        ? "border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/15 dark:text-amber-300"
        : "border-primary/20 bg-primary/6 text-primary"
      }`}
    >
      {isWarn
        ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        : <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      }
      <span>{children}</span>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border/60" />
      <span className="section-label">{label}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

function StatusRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${highlight ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
