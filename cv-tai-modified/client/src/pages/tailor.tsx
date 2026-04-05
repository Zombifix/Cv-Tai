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
  RefreshCw,
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
      return "LinkedIn peut bloquer la recuperation automatique. Si l'analyse echoue, colle le texte de l'annonce pour continuer.";
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
        description: "Le triage rapide voit assez de signaux pour lancer la generation sereinement.",
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
        description: "Le triage rapide voit peu de preuves directes pour cette offre a ce stade.",
      };
    default:
      return {
        label: "Pre-check",
        emphasisClassName: "text-muted-foreground",
        description: "Le triage rapide reste un signal indicatif avant la generation complete.",
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
      window.localStorage.setItem(
        TAILOR_PREFS_KEY,
        JSON.stringify({
          introMaxChars,
          bodyMaxChars,
        }),
      );
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
  const selectedMode =
    mode === "optimise"
      ? {
          title: "Optimise",
          description: "Reformule legerement pour mieux coller a l'annonce sans changer le fond.",
        }
      : {
          title: "Fidele",
          description: "Selectionne et agence tes bullets tels quels, sans reecriture.",
        };

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
      toast({ title: "CV genere", description: "Ton CV a ete optimise !" });
      setLocation(`/results/${run.id}`);
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url && !text) {
      toast({
        title: "Champ requis",
        description: "Colle une URL ou le texte de l'annonce.",
        variant: "destructive",
      });
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
          ? check.jobInput.scrapeMessage || "Annonce partiellement bruitee: le score est a lire avec prudence."
          : null,
      );

      if (check.shouldWarn) {
        setPendingConfirm({
          score: check.preliminaryConfidence,
          jobTitle: check.jobTitle,
          verdict: check.precheckVerdict,
          message: check.warningMessage,
        });
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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <section className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <WandSparkles className="h-3.5 w-3.5 text-primary" />
              Tailoring
            </div>

            <div className="max-w-3xl space-y-3">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Genere vite un CV cible
              </h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                Colle une annonce, choisis le niveau d'optimisation, puis lance. Le moteur part de ton Super CV pour sortir un document
                directement exploitable.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-muted-foreground">
                URL ou texte brut
              </span>
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-muted-foreground">
                Pre-check prudent avant generation
              </span>
              <span className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-primary">
                Ton Super CV reste la source
              </span>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card/75 shadow-sm">
                <div className="border-b border-border/60 bg-muted/20 px-5 py-4 md:px-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Annonce cible</p>
                      <h2 className="text-xl font-semibold text-foreground">Colle la source la plus propre possible</h2>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                      <Target className="h-3.5 w-3.5" />
                      Meme base que celle affichee dans le resultat
                    </div>
                  </div>
                </div>

                <div className="space-y-6 px-5 py-5 md:px-7 md:py-7">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-sm font-semibold">URL de l'annonce</Label>
                      <p className="text-xs text-muted-foreground">Pratique si le site se laisse scraper. Sinon, colle directement le texte juste en dessous.</p>
                    </div>

                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="https://linkedin.com/jobs/view/..."
                        className="h-12 rounded-2xl border-border/70 bg-background pl-10 text-sm"
                        value={url}
                        onChange={(e) => handleUrlChange(e.target.value)}
                      />
                    </div>

                    {urlWarning && (
                      <div className="flex items-start gap-2 rounded-2xl border border-amber-300/70 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <span>{urlWarning}</span>
                      </div>
                    )}

                    {urlConverted && !urlWarning && (
                      <div className="flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/6 p-3 text-xs text-primary">
                        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <span>URL LinkedIn convertie automatiquement pour tenter une recuperation plus stable.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border/70" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Ou</span>
                    <div className="h-px flex-1 bg-border/70" />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-sm font-semibold">Texte de l'annonce</Label>
                      <p className="text-xs text-muted-foreground">Le plus fiable pour aller vite quand une page bloque le scraping ou est trop bruitee.</p>
                    </div>

                    {scrapeFailReason && (
                      <div className="flex items-start gap-2 rounded-2xl border border-amber-300/70 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <span>{scrapeFailReason} Colle le texte ici pour continuer.</span>
                      </div>
                    )}

                    {!scrapeFailReason && scrapeNotice && (
                      <div className="flex items-start gap-2 rounded-2xl border border-amber-300/70 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-300">
                        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <span>{scrapeNotice}</span>
                      </div>
                    )}

                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        placeholder="Colle le texte brut de l'annonce ici..."
                        className="min-h-[280px] rounded-[24px] border-border/70 bg-background pl-10 pt-3 text-sm leading-6"
                        value={text}
                        onChange={(e) => {
                          setText(e.target.value);
                          if (e.target.value) {
                            setScrapeFailReason(null);
                            setScrapeNotice(null);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <section className="rounded-[28px] border border-primary/20 bg-gradient-to-b from-primary/[0.08] via-background to-background p-5 shadow-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Fast lane</p>
                  <h2 className="text-xl font-semibold text-foreground">Lancer le tailoring</h2>
                  <p className="text-sm text-muted-foreground">Une fois l'annonce collee, tout part d'ici.</p>
                </div>

                <div className="mt-5 space-y-3 rounded-[22px] border border-border/60 bg-background/85 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Mode</span>
                    <span className="font-medium text-foreground">{selectedMode.title}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Annonce</span>
                    <span className={`font-medium ${hasAnnouncement ? "text-foreground" : "text-muted-foreground"}`}>
                      {hasAnnouncement ? "Renseignee" : "A remplir"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Limites</span>
                    <span className="font-medium text-foreground">
                      {introMaxChars || bodyMaxChars ? "Personnalisees" : "Auto"}
                    </span>
                  </div>
                </div>

                <Button type="submit" size="lg" className="mt-5 h-12 w-full rounded-2xl text-base shadow-lg shadow-primary/20" disabled={isBusy}>
                  {checkMatch.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyse du match...
                    </>
                  ) : generate.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generation en cours...
                    </>
                  ) : (
                    <>
                      <WandSparkles className="mr-2 h-4 w-4" />
                      Generer le CV
                    </>
                  )}
                </Button>

                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Pre-check prudent avant generation complete. Si l'optimisation n'apporte rien, le moteur garde silencieusement la version la plus solide.
                </p>
              </section>

              <section className="rounded-[28px] border border-border/70 bg-card/75 p-5 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-foreground">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Mode</h3>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{selectedMode.description}</p>
                </div>

                <RadioGroup value={mode} onValueChange={(value) => setMode(value as Mode)} className="mt-4 space-y-3">
                  <Label
                    htmlFor="mode-fidele"
                    className={`flex cursor-pointer flex-col gap-2 rounded-[22px] border p-4 transition-colors ${
                      mode === "fidele" ? "border-primary bg-primary/6" : "border-border/70 bg-background hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value="fidele" id="mode-fidele" className="sr-only" />
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileText className={`h-4 w-4 ${mode === "fidele" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-medium text-foreground">Fidele</span>
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Brut</span>
                    </div>
                    <span className="text-xs leading-5 text-muted-foreground">Ideal pour juger la selection brute de la library, sans reecriture.</span>
                  </Label>

                  <Label
                    htmlFor="mode-optimise"
                    className={`flex cursor-pointer flex-col gap-2 rounded-[22px] border p-4 transition-colors ${
                      mode === "optimise" ? "border-primary bg-primary/6" : "border-border/70 bg-background hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value="optimise" id="mode-optimise" className="sr-only" />
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className={`h-4 w-4 ${mode === "optimise" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-medium text-foreground">Optimise</span>
                      </div>
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground">
                        Recommande
                      </span>
                    </div>
                    <span className="text-xs leading-5 text-muted-foreground">Le meilleur mode pour candidater vite quand le fond est deja bon.</span>
                  </Label>
                </RadioGroup>
              </section>

              <section className="rounded-[28px] border border-border/70 bg-card/75 p-5 shadow-sm">
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground">Reglages rapides</h3>
                  <p className="text-xs leading-5 text-muted-foreground">Laisse vide pour un comportement auto, ou contraints ton template si besoin.</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Intro / Resume pro</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 300"
                      value={introMaxChars}
                      onChange={(e) => setIntroMaxChars(e.target.value)}
                      className="h-11 rounded-2xl text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Corps experiences</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 3400"
                      value={bodyMaxChars}
                      onChange={(e) => setBodyMaxChars(e.target.value)}
                      className="h-11 rounded-2xl text-sm"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-border/70 bg-card/75 p-5 shadow-sm">
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground">Contexte additionnel</h3>
                  <p className="text-xs leading-5 text-muted-foreground">Optionnel. Utile si tu as un signal recruteur, un angle business ou un detail strategique a pousser.</p>
                </div>

                <Textarea
                  placeholder="Ex : Le recruteur cherche surtout quelqu'un capable de structurer les pratiques design dans une equipe produit deja mature."
                  className="mt-4 min-h-[132px] rounded-[22px] border-border/70 bg-background text-sm leading-6"
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                  maxLength={1000}
                />

                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Ne sert que si ca change vraiment la lecture du poste.</span>
                  <span>{extraContext.length}/1000</span>
                </div>
              </section>

              <section className="rounded-[28px] border border-border/70 bg-muted/25 p-5 shadow-sm">
                <h3 className="font-semibold text-foreground">Repères utiles</h3>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                  <li className="flex gap-2">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                    Utilise le texte brut si une annonce est longue, repetitive ou mal scrappee.
                  </li>
                  <li className="flex gap-2">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                    Passe en fidele si tu veux juger la selection pure avant toute reformulation.
                  </li>
                  <li className="flex gap-2">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                    Garde les limites en auto si ton template n'impose pas de contrainte stricte.
                  </li>
                </ul>
              </section>
            </aside>
          </form>
        </div>
      </Layout>

      <AlertDialog open={!!pendingConfirm} onOpenChange={(open) => { if (!open) setPendingConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingVerdictMeta.label} - generer quand meme ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Triage rapide : <strong className={pendingVerdictMeta.emphasisClassName}>{pendingVerdictMeta.label}</strong>
                {pendingConfirm?.jobTitle && <> pour <em>{pendingConfirm.jobTitle}</em></>}.
              </span>
              <span className="block text-muted-foreground">{pendingVerdictMeta.description}</span>
              <span className="block text-muted-foreground">
                {pendingConfirm?.message ? <span className="mb-1 block">{pendingConfirm.message}</span> : null}
                Score indicatif : <strong className={pendingVerdictMeta.emphasisClassName}>{pendingConfirm?.score}%</strong>. Le jugement final se fait sur le CV genere, pas sur ce pre-check seul.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingConfirm(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setPendingConfirm(null);
                await doGenerate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Generer quand meme
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
