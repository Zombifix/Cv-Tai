import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useGenerateTailor } from "@/hooks/use-tailor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WandSparkles, Link as LinkIcon, FileText, Target, RefreshCw, Info, SlidersHorizontal, Zap, Sparkles, Gauge } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRESET_KEY = "cv-tailor-preset";

type Preset = "quick" | "standard" | "deep";

const PRESETS: {
  value: Preset;
  label: string;
  icon: React.ReactNode;
  tagline: string;
  description: string;
  mode: "original" | "polished" | "adaptive";
  outputLength: "compact" | "balanced" | "detailed";
  recommended?: boolean;
}[] = [
  {
    value: "quick",
    label: "Quick",
    icon: <Zap className="w-5 h-5" />,
    tagline: "No rewrite · Concise",
    description: "Selects your best bullets as-is and formats them. Best when your wording is already strong.",
    mode: "original",
    outputLength: "compact",
  },
  {
    value: "standard",
    label: "Standard",
    icon: <Sparkles className="w-5 h-5" />,
    tagline: "Light rewrite · Balanced",
    description: "Lightly rephrases bullets to embed missing keywords. Recommended for most applications.",
    mode: "polished",
    outputLength: "balanced",
    recommended: true,
  },
  {
    value: "deep",
    label: "Deep",
    icon: <Gauge className="w-5 h-5" />,
    tagline: "Full rewrite · Detailed",
    description: "Strongly adapts your bullets and expands the output. Best for competitive or senior roles.",
    mode: "adaptive",
    outputLength: "detailed",
  },
];

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

  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [preset, setPreset] = useState<Preset>(() => {
    try { return (localStorage.getItem(PRESET_KEY) as Preset) || "standard"; } catch { return "standard"; }
  });
  const [urlConverted, setUrlConverted] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(PRESET_KEY, preset); } catch {}
  }, [preset]);

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

  const handleUrlChange = (value: string) => {
    const { url: normalized, converted } = normalizeLinkedInUrl(value);
    setUrl(normalized);
    setUrlConverted(converted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url && !text) {
      toast({ title: "Input Required", description: "Please provide either a Job URL or Job Description text.", variant: "destructive" });
      return;
    }
    // URL-only is now supported — the server will scrape the page automatically
    const selectedPreset = PRESETS.find(p => p.value === preset)!;
    try {
      const run = await generate.mutateAsync({
        url: url || undefined,
        text: text || undefined,
        mode: selectedPreset.mode,
        outputLength: selectedPreset.outputLength,
      });
      toast({ title: "Tailoring Complete", description: "Your CV has been optimized!" });
      setLocation(`/results/${run.id}`);
    } catch (err) {
      toast({ title: "Failed to tailor CV", description: (err as Error).message, variant: "destructive" });
    }
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
            Provide a job description, and our AI will select and optimize the best experiences from your library to match.
          </p>
        </div>

        <Card className="shadow-lg border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          <CardContent className="p-6 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* ── TARGET ROLE ── */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                  <Target className="w-5 h-5 text-accent" /> Target Role
                </h3>

                <div className="space-y-3">
                  <Label>Job Posting URL</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      data-testid="input-job-url"
                      placeholder="https://linkedin.com/jobs/view/..."
                      className="pl-10 py-6 bg-background text-base rounded-xl"
                      value={url}
                      onChange={e => handleUrlChange(e.target.value)}
                    />
                  </div>
                  {urlConverted && (
                    <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 p-2 rounded-lg" data-testid="text-url-converted">
                      <Info className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>LinkedIn collection URL detected. Automatically converted to direct job link.</span>
                    </div>
                  )}
                  {url && !text.trim() && (
                    <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-xl">
                      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>URL détectée.</strong> Le contenu de la page sera récupéré automatiquement. Pour un résultat optimal, vous pouvez aussi <strong>coller le texte de l'annonce</strong> ci-dessous.
                      </span>
                    </div>
                  )}
                </div>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-border" />
                  <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm font-medium uppercase">Or</span>
                  <div className="flex-grow border-t border-border" />
                </div>

                <div className="space-y-3">
                  <Label>Paste Job Description</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Textarea
                      data-testid="input-job-text"
                      placeholder="Paste the raw text of the job description here..."
                      className="pl-10 pt-3 min-h-[140px] bg-background text-base rounded-xl resize-y"
                      value={text}
                      onChange={e => setText(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* ── TAILORING MODE ── */}
              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                  <SlidersHorizontal className="w-5 h-5 text-primary" /> Tailoring Mode
                </h3>

                <RadioGroup
                  value={preset}
                  onValueChange={v => setPreset(v as Preset)}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  data-testid="radio-tailoring-mode"
                >
                  {PRESETS.map(opt => (
                    <Label
                      key={opt.value}
                      htmlFor={`preset-${opt.value}`}
                      className={`relative cursor-pointer flex flex-col gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                        preset === opt.value
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-background hover:border-primary/30"
                      }`}
                    >
                      {opt.recommended && (
                        <span className="absolute -top-2.5 left-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                          Recommended
                        </span>
                      )}
                      <RadioGroupItem value={opt.value} id={`preset-${opt.value}`} className="sr-only" />
                      <div className="flex items-center gap-2">
                        <span className={preset === opt.value ? "text-primary" : "text-muted-foreground"}>
                          {opt.icon}
                        </span>
                        <span className="font-bold text-sm">{opt.label}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide">{opt.tagline}</span>
                      <span className="text-xs text-muted-foreground font-normal leading-relaxed">{opt.description}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* ── SUBMIT ── */}
              <Button
                data-testid="button-generate"
                type="submit"
                size="lg"
                className="w-full text-lg py-6 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
                disabled={generate.isPending}
              >
                {generate.isPending ? (
                  <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Tailoring your CV...</>
                ) : (
                  <><WandSparkles className="w-5 h-5 mr-2" /> Generate Tailored CV</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
