import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useGenerateTailor, useCheckMatch } from "@/hooks/use-tailor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WandSparkles, Link as LinkIcon, FileText, Target, RefreshCw, Info, SlidersHorizontal, Sparkles, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SCRAPE_BLOCKED_DOMAINS = [
  "indeed.com", "glassdoor.com", "monster.com",
  "apec.fr", "francetravail.fr", "pole-emploi.fr", "hellowork.com", "cadremploi.fr",
];

function getUrlWarning(url: string): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (SCRAPE_BLOCKED_DOMAINS.some(d => hostname.includes(d))) {
      return "Ce site bloque le scraping automatique. Copie-colle le texte de l'annonce directement dans le champ ci-dessous.";
    }
  } catch {}
  return null;
}

type Mode = "fidele" | "optimise";

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
  const [pendingConfirm, setPendingConfirm] = useState<{ score: number; jobTitle: string } | null>(null);

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

  const handleUrlChange = (value: string) => {
    const { url: normalized, converted } = normalizeLinkedInUrl(value);
    setUrl(normalized);
    setUrlConverted(converted);
  };

  const doGenerate = async () => {
    try {
      const introChars = introMaxChars ? parseInt(introMaxChars) : undefined;
      const bodyChars = bodyMaxChars ? parseInt(bodyMaxChars) : undefined;
      const run = await generate.mutateAsync({
        url: url || undefined,
        text: text || undefined,
        mode: mode === "fidele" ? "original" : "polished",
        introMaxChars: introChars && introChars >= 50 ? introChars : undefined,
        bodyMaxChars: bodyChars && bodyChars >= 500 ? bodyChars : undefined,
        extraContext: extraContext.trim() || undefined,
      });
      toast({ title: "CV généré", description: "Ton CV a été optimisé !" });
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
    // Pre-check match score — warn if < 40% to avoid wasting tokens on a weak match
    try {
      const check = await checkMatch.mutateAsync({
        url: url || undefined,
        text: text || undefined,
        extraContext: extraContext.trim() || undefined,
      });
      if (check.preliminaryConfidence < 40) {
        setPendingConfirm({ score: check.preliminaryConfidence, jobTitle: check.jobTitle });
        return;
      }
    } catch {
      // If check fails (scrape error, network, etc.), proceed with full generation anyway
    }
    await doGenerate();
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto flex flex-col gap-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-3 mt-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2 text-primary">
            <WandSparkles className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Tailor Your CV</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Colle une annonce et l'IA selectionne et optimise tes experiences.
          </p>
        </div>

        <Card className="shadow-lg border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          <CardContent className="p-6 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* ── TARGET ROLE ── */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                  <Target className="w-5 h-5 text-accent" /> Annonce
                </h3>

                <div className="space-y-3">
                  <Label>URL de l'annonce</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="https://linkedin.com/jobs/view/..."
                      className="pl-10 py-6 bg-background text-base rounded-xl"
                      value={url}
                      onChange={e => handleUrlChange(e.target.value)}
                    />
                  </div>
                  {urlWarning && (
                    <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 p-3 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{urlWarning}</span>
                    </div>
                  )}
                  {urlConverted && !urlWarning && (
                    <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 p-2 rounded-lg">
                      <Info className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>URL LinkedIn convertie automatiquement.</span>
                    </div>
                  )}
                </div>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-border" />
                  <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm font-medium uppercase">Ou</span>
                  <div className="flex-grow border-t border-border" />
                </div>

                <div className="space-y-3">
                  <Label>Texte de l'annonce</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Textarea
                      placeholder="Colle le texte brut de l'annonce ici..."
                      className="pl-10 pt-3 min-h-[140px] bg-background text-base rounded-xl resize-y"
                      value={text}
                      onChange={e => setText(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* ── MODE ── */}
              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                  <SlidersHorizontal className="w-5 h-5 text-primary" /> Mode
                </h3>

                <RadioGroup
                  value={mode}
                  onValueChange={v => setMode(v as Mode)}
                  className="grid grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="mode-fidele"
                    className={`cursor-pointer flex flex-col gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                      mode === "fidele"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value="fidele" id="mode-fidele" className="sr-only" />
                    <div className="flex items-center gap-2">
                      <FileText className={`w-5 h-5 ${mode === "fidele" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-bold text-sm">Fidele</span>
                    </div>
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Selectionne et agence tes bullets tels quels. Aucune reecriture.
                    </span>
                  </Label>

                  <Label
                    htmlFor="mode-optimise"
                    className={`relative cursor-pointer flex flex-col gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                      mode === "optimise"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:border-primary/30"
                    }`}
                  >
                    <span className="absolute -top-2.5 left-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                      Recommande
                    </span>
                    <RadioGroupItem value="optimise" id="mode-optimise" className="sr-only" />
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-5 h-5 ${mode === "optimise" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-bold text-sm">Optimise</span>
                    </div>
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Reformule tes bullets pour integrer les mots-cles de l'offre. Contenu identique, angle adapte.
                    </span>
                  </Label>
                </RadioGroup>
              </div>

              {/* ── CHARACTER LIMITS ── */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  Limites de caracteres <span className="text-xs font-normal">(optionnel — adapte a ton template CV)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Intro / Resume pro</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 300"
                      value={introMaxChars}
                      onChange={e => setIntroMaxChars(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Corps (experiences)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 3400"
                      value={bodyMaxChars}
                      onChange={e => setBodyMaxChars(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* ── EXTRA CONTEXT ── */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Contexte additionnel <span className="text-xs font-normal text-muted-foreground">(optionnel)</span></Label>
                  <p className="text-xs text-muted-foreground">Info sur la boite, signal recruteur, axe strategique a mettre en avant...</p>
                </div>
                <Textarea
                  placeholder="Ex : Accor investit fortement sur l'IA dans le design produit. Le recruteur cherche quelqu'un qui peut structurer les pratiques design au sein d'equipes produit."
                  className="min-h-[80px] bg-background text-sm rounded-xl resize-y"
                  value={extraContext}
                  onChange={e => setExtraContext(e.target.value)}
                  maxLength={1000}
                />
                {extraContext.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">{extraContext.length}/1000</p>
                )}
              </div>

              {/* ── SUBMIT ── */}
              <Button
                type="submit"
                size="lg"
                className="w-full text-lg py-6 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
                disabled={checkMatch.isPending || generate.isPending}
              >
                {checkMatch.isPending ? (
                  <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Analyse du match...</>
                ) : generate.isPending ? (
                  <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Génération en cours...</>
                ) : (
                  <><WandSparkles className="w-5 h-5 mr-2" /> Générer le CV</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>

    {/* ── Low-match confirmation dialog ── */}
    <AlertDialog open={!!pendingConfirm} onOpenChange={(open) => { if (!open) setPendingConfirm(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Match faible — générer quand même ?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Match estimé : <strong className="text-red-600 dark:text-red-400">{pendingConfirm?.score}%</strong>
              {pendingConfirm?.jobTitle && <> pour <em>{pendingConfirm.jobTitle}</em></>}.
            </span>
            <span className="block text-muted-foreground">
              Ton profil correspond peu à ce poste. Le CV généré risque d'être peu pertinent et de consommer des crédits IA pour un résultat limité.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPendingConfirm(null)}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => { setPendingConfirm(null); await doGenerate(); }}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Générer quand même
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
