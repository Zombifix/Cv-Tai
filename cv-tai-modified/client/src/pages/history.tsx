import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useRuns } from "@/hooks/use-tailor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  FileText,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

function getTracking(runId: string) {
  try {
    return JSON.parse(localStorage.getItem(`app-tracking-${runId}`) || "null");
  } catch {
    return null;
  }
}

function getTrackingMeta(runId: string) {
  const tracking = getTracking(runId);
  if (!tracking?.applied) return null;
  if (tracking.status === "interview") {
    return {
      label: "Entretien",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      icon: <Check className="h-3 w-3" />,
    };
  }
  if (tracking.status === "rejected") {
    return {
      label: "Refus",
      className: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
      icon: <X className="h-3 w-3" />,
    };
  }
  return {
    label: "Postule",
    className: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    icon: <Send className="h-3 w-3" />,
  };
}

const MODE_META = {
  original: {
    label: "Fidele",
    icon: <ShieldCheck className="h-3 w-3" />,
    className: "bg-primary/10 text-primary",
  },
  polished: {
    label: "Optimise",
    icon: <Zap className="h-3 w-3" />,
    className: "bg-accent/10 text-accent",
  },
  adaptive: {
    label: "Adaptatif",
    icon: <RefreshCw className="h-3 w-3" />,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
} as const;

function getScoreTone(value: number) {
  if (value >= 70) return "bg-green-500";
  if (value >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getBadgeMeta(badge?: string) {
  if (badge === "probant") {
    return { label: "Probant", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  }
  if (badge === "a_renforcer") {
    return { label: "A renforcer", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  }
  if (badge === "fragile") {
    return { label: "Fragile", className: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" };
  }
  return null;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function History() {
  const { data: runs, isLoading, error } = useRuns();

  const runsWithScore =
    runs?.filter((run: any) => {
      const report = run.outputReportJson as any;
      return typeof (report?.scoreBreakdown?.pertinence ?? report?.confidence) === "number";
    }) ?? [];

  const averageScore =
    runsWithScore.length > 0
      ? Math.round(
          runsWithScore.reduce((sum: number, run: any) => {
            const report = run.outputReportJson as any;
            return sum + (report?.scoreBreakdown?.pertinence ?? report?.confidence ?? 0);
          }, 0) / runsWithScore.length,
        )
      : null;

  const appliedCount = runs?.filter((run: any) => getTracking(run.id)?.applied).length ?? 0;
  const interviewCount = runs?.filter((run: any) => getTracking(run.id)?.status === "interview").length ?? 0;

  return (
    <Layout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-in fade-in duration-500">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Historique
            </div>

            <div className="max-w-3xl space-y-3">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">Retrouve vite les bons CV</h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                Cette page sert de triage rapide: ouvre un run, juge la pertinence, puis repars de la meilleure version sans rerevenir dans
                tout le detail.
              </p>
            </div>
          </div>

          <Link href="/tailor">
            <Button data-testid="button-new-tailor" className="h-12 rounded-2xl px-5 text-sm shadow-lg shadow-primary/20">
              <WandSparkles className="mr-2 h-4 w-4" />
              Nouveau tailoring
            </Button>
          </Link>
        </section>

        {!isLoading && !error && runs && runs.length > 0 && (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-border/70 bg-card/75 p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Runs</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{runs.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">CV generes disponibles dans l'historique.</p>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-card/75 p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Postules</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{appliedCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Candidatures marquees comme envoyees.</p>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-card/75 p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Entretiens</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{interviewCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Runs deja passes au statut entretien.</p>
            </div>

            <div className="rounded-[24px] border border-primary/20 bg-gradient-to-b from-primary/[0.08] via-background to-background p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pertinence moyenne</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{averageScore != null ? `${averageScore}%` : "n/a"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Repere rapide base sur les runs disponibles.</p>
            </div>
          </section>
        )}

        {isLoading && (
          <div className="grid gap-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-36 rounded-[28px] bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-[24px] border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Impossible de charger l'historique.
          </div>
        )}

        {!isLoading && !error && runs?.length === 0 && (
          <Card className="border-2 border-dashed bg-transparent shadow-none">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="rounded-2xl bg-muted/50 p-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Aucun CV genere</p>
                <p className="text-sm text-muted-foreground">Ton historique apparaitra ici apres ton premier tailoring.</p>
              </div>
              <Link href="/tailor">
                <Button variant="outline" className="mt-2 rounded-2xl" data-testid="button-start-tailoring">
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Lancer un tailoring
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {!isLoading && runs && runs.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Runs recents</h2>
                <p className="text-sm text-muted-foreground">Les lignes ci-dessous sont pensees pour scanner vite ce qui vaut encore le coup.</p>
              </div>
            </div>

            <div className="space-y-3">
              {runs.map((run: any, i: number) => {
                const report = run.outputReportJson as any;
                const modeMeta = MODE_META[run.mode as keyof typeof MODE_META] || MODE_META.polished;
                const trackingMeta = getTrackingMeta(run.id);
                const displayScore = report?.scoreBreakdown?.pertinence ?? report?.confidence;
                const scoreLabel = report?.scoreBreakdown?.fitMetier != null ? "Pertinence" : "Fit offre";
                const badgeMeta = getBadgeMeta(report?.scoreBreakdown?.badge);
                const atsOptimized = report?.scoreBreakdown?.atsOptimized;
                const shortVerdict =
                  report?.diagnosis?.primaryDiagnosis ||
                  report?.confidenceReasoning ||
                  "Ouvre le resultat pour revoir le detail de ce tailoring.";
                const selectedExperiences = report?.selectedExperiences?.length ?? 0;

                return (
                  <Link key={run.id} href={`/results/${run.id}`}>
                    <article
                      className="group cursor-pointer overflow-hidden rounded-[28px] border border-border/70 bg-card/75 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5"
                      data-testid={`card-history-${i}`}
                    >
                      <div className="flex flex-col gap-5 p-5 md:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 space-y-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                <span>{formatDate(run.createdAt)}</span>
                                {report?.detectedLanguage && <span>{report.detectedLanguage}</span>}
                              </div>
                              <h3
                                className="text-xl font-semibold leading-tight text-foreground transition-colors group-hover:text-primary"
                                data-testid={`text-history-title-${i}`}
                              >
                                {report?.jobTitle || "Poste inconnu"}
                              </h3>
                              {report?.jobCompany && <p className="text-sm text-muted-foreground">{report.jobCompany}</p>}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${modeMeta.className}`}>
                                {modeMeta.icon}
                                {modeMeta.label}
                              </span>

                              {badgeMeta && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${badgeMeta.className}`}>
                                  <Sparkles className="h-3 w-3" />
                                  {badgeMeta.label}
                                </span>
                              )}

                              {trackingMeta && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${trackingMeta.className}`}>
                                  {trackingMeta.icon}
                                  {trackingMeta.label}
                                </span>
                              )}

                              {selectedExperiences > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                  <FileText className="h-3 w-3" />
                                  {selectedExperiences} experiences
                                </span>
                              )}
                            </div>

                            <p className="text-sm leading-6 text-muted-foreground">{shortVerdict}</p>
                          </div>

                          <div className="flex flex-col gap-3 rounded-[24px] border border-border/60 bg-background/80 p-4 lg:min-w-[176px]">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{scoreLabel}</span>
                              <span className="text-xl font-bold tabular-nums text-foreground">
                                {displayScore != null ? `${displayScore}%` : "n/a"}
                              </span>
                            </div>

                            {displayScore != null && (
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full ${getScoreTone(displayScore)}`}
                                  style={{ width: `${Math.max(0, Math.min(100, displayScore))}%` }}
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <p className="text-muted-foreground">ATS</p>
                                <p className="font-semibold text-foreground">{typeof atsOptimized === "number" ? `${atsOptimized}%` : "n/a"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-muted-foreground">Document</p>
                                <p className="font-semibold text-foreground">{badgeMeta?.label || "Legacy"}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <ArrowRight className="h-4 w-4 text-primary" />
                            <span>Ouvrir le resultat complet et revoir le CV genere</span>
                          </div>
                          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Resultat</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
