import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useRuns } from "@/hooks/use-tailor";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
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

function getTracking(run: any) {
  if (run.tracking && typeof run.tracking === "object") return run.tracking;
  try {
    return JSON.parse(localStorage.getItem(`app-tracking-${run.id}`) || "null");
  } catch {
    return null;
  }
}

function getTrackingMeta(run: any) {
  const tracking = getTracking(run);
  if (!tracking?.applied) return null;
  if (tracking.status === "interview") {
    return { label: "Entretien", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: <Check className="h-3 w-3" /> };
  }
  if (tracking.status === "rejected") {
    return { label: "Refus", className: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400", icon: <X className="h-3 w-3" /> };
  }
  return { label: "Postulé", className: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400", icon: <Send className="h-3 w-3" /> };
}

const MODE_META = {
  original: { label: "Fidèle", icon: <ShieldCheck className="h-3 w-3" />, className: "bg-primary/10 text-primary" },
  polished: { label: "Optimisé", icon: <Zap className="h-3 w-3" />, className: "bg-accent/15 text-accent" },
  adaptive: { label: "Adaptatif", icon: <RefreshCw className="h-3 w-3" />, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
} as const;

function getScoreColor(value: number) {
  if (value >= 70) return { bar: "bg-green-500", text: "text-green-600 dark:text-green-400" };
  if (value >= 40) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-red-500", text: "text-red-500" };
}

function getBadgeMeta(badge?: string) {
  if (badge === "probant")    return { label: "Probant",     className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  if (badge === "a_renforcer") return { label: "À renforcer", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  if (badge === "fragile")     return { label: "Fragile",     className: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" };
  return null;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch { return iso; }
}

const PAGE_SIZE = 10;

export default function History() {
  const { data: runs, isLoading, error } = useRuns();
  const [page, setPage] = useState(0);

  const runsWithScore = runs?.filter((run: any) => {
    const report = run.outputReportJson as any;
    return typeof (report?.scoreBreakdown?.pertinence ?? report?.confidence) === "number";
  }) ?? [];

  const averageScore = runsWithScore.length > 0
    ? Math.round(runsWithScore.reduce((sum: number, run: any) => {
        const report = run.outputReportJson as any;
        return sum + (report?.scoreBreakdown?.pertinence ?? report?.confidence ?? 0);
      }, 0) / runsWithScore.length)
    : null;

  const appliedCount   = runs?.filter((run: any) => getTracking(run)?.applied).length ?? 0;
  const interviewCount = runs?.filter((run: any) => getTracking(run)?.status === "interview").length ?? 0;

  return (
    <Layout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 animate-fade-up">
        {/* Page header */}
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="pill bg-primary/10 text-primary">
              <Clock className="h-3 w-3" />
              Historique
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Retrouve vite les bons CV
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
              Triage rapide : ouvre un run, juge la pertinence, puis repars de la meilleure version sans tout revoir.
            </p>
          </div>
          <Link href="/tailor">
            <Button className="h-11 rounded-2xl px-5 text-sm font-semibold shadow-lg shadow-primary/20 btn-press gap-2 flex-shrink-0">
              <WandSparkles className="h-4 w-4" />
              Nouveau tailoring
            </Button>
          </Link>
        </section>

        {/* Stats */}
        {!isLoading && !error && runs && runs.length > 0 && (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 stagger">
            {[
              { label: "Runs", value: runs.length, desc: "CV générés disponibles", highlight: false },
              { label: "Postulés", value: appliedCount, desc: "Candidatures envoyées", highlight: false },
              { label: "Entretiens", value: interviewCount, desc: "Statut entretien atteint", highlight: false },
              { label: "Pertinence moy.", value: averageScore != null ? `${averageScore}%` : "n/a", desc: "Repère rapide sur les runs", highlight: true },
            ].map((stat, i) => (
              <div
                key={i}
                className={`animate-fade-up rounded-[24px] border p-5 shadow-sm transition-all duration-200 hover:shadow-md
                  ${stat.highlight
                    ? "border-primary/25 bg-gradient-to-b from-primary/[0.07] via-card to-card"
                    : "border-border/60 bg-card hover:border-border"
                  }`}
              >
                <div className="section-label mb-2">{stat.label}</div>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stat.desc}</div>
              </div>
            ))}
          </section>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 rounded-[28px] shimmer" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-[24px] border border-destructive/25 bg-destructive/6 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Impossible de charger l'historique.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && runs?.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-5 rounded-[32px] border-2 border-dashed border-border/60 py-20 text-center animate-fade-in">
            <div className="rounded-2xl bg-muted/60 p-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <p className="font-bold text-foreground">Aucun CV généré</p>
              <p className="text-sm text-muted-foreground">Ton historique apparaîtra ici après ton premier tailoring.</p>
            </div>
            <Link href="/tailor">
              <Button variant="outline" className="rounded-2xl gap-2">
                <WandSparkles className="h-4 w-4" />
                Lancer un tailoring
              </Button>
            </Link>
          </div>
        )}

        {/* Run list */}
        {!isLoading && runs && runs.length > 0 && (() => {
          const totalPages = Math.ceil(runs.length / PAGE_SIZE);
          const pagedRuns = runs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
          return (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Runs récents</h2>
                  <p className="text-sm text-muted-foreground">Scannez vite ce qui vaut encore le coup.</p>
                </div>
              </div>

              <div className="space-y-3 stagger">
                {pagedRuns.map((run: any, i: number) => {
                  const report       = run.outputReportJson as any;
                  const modeMeta     = MODE_META[run.mode as keyof typeof MODE_META] || MODE_META.polished;
                  const trackingMeta = getTrackingMeta(run);
                  const displayScore = report?.scoreBreakdown?.pertinence ?? report?.confidence;
                  const scoreLabel   = report?.scoreBreakdown?.fitMetier != null ? "Pertinence" : "Fit offre";
                  const badgeMeta    = getBadgeMeta(report?.scoreBreakdown?.badge);
                  const atsOptimized = report?.scoreBreakdown?.atsOptimized;
                  const scoreColors  = displayScore != null ? getScoreColor(displayScore) : null;
                  const shortVerdict = report?.diagnosis?.primaryDiagnosis || report?.confidenceReasoning || "Ouvre le résultat pour revoir le détail de ce tailoring.";
                  const selectedExp  = report?.selectedExperiences?.length ?? 0;

                  return (
                    <Link key={run.id} href={`/results/${run.id}`}>
                      <article
                        className="animate-fade-up group cursor-pointer overflow-hidden rounded-[28px] border border-border/60 bg-card card-hover"
                        data-testid={`card-history-${i}`}
                      >
                        <div className="flex flex-col gap-5 p-5 md:p-6">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            {/* Left: info */}
                            <div className="min-w-0 space-y-3">
                              <div className="space-y-1">
                                <div className="section-label">{formatDate(run.createdAt)}{report?.detectedLanguage && <span className="ml-2">{report.detectedLanguage}</span>}</div>
                                <h3 className="text-xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary" data-testid={`text-history-title-${i}`}>
                                  {report?.jobTitle || "Poste inconnu"}
                                </h3>
                                {report?.jobCompany && <p className="text-sm text-muted-foreground">{report.jobCompany}</p>}
                              </div>

                              {/* Tags row */}
                              <div className="flex flex-wrap gap-1.5">
                                <span className={`pill ${modeMeta.className}`}>{modeMeta.icon}{modeMeta.label}</span>
                                {badgeMeta && (
                                  <span className={`pill ${badgeMeta.className}`}><Sparkles className="h-3 w-3" />{badgeMeta.label}</span>
                                )}
                                {trackingMeta && (
                                  <span className={`pill ${trackingMeta.className}`}>{trackingMeta.icon}{trackingMeta.label}</span>
                                )}
                                {selectedExp > 0 && (
                                  <span className="pill bg-muted text-muted-foreground"><FileText className="h-3 w-3" />{selectedExp} expériences</span>
                                )}
                              </div>

                              <p className="text-sm leading-6 text-muted-foreground line-clamp-2">{shortVerdict}</p>
                            </div>

                            {/* Right: score card */}
                            <div className="flex-shrink-0 rounded-[20px] border border-border/50 bg-background/70 p-4 lg:w-48">
                              <div className="flex items-center justify-between mb-3">
                                <span className="section-label">{scoreLabel}</span>
                                <span className={`text-xl font-bold tabular-nums ${scoreColors?.text || "text-foreground"}`}>
                                  {displayScore != null ? `${displayScore}%` : "n/a"}
                                </span>
                              </div>

                              {displayScore != null && (
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                                  <div
                                    className={`h-full rounded-full score-bar ${scoreColors?.bar}`}
                                    style={{ "--score-width": `${Math.max(0, Math.min(100, displayScore))}%`, width: `${Math.max(0, Math.min(100, displayScore))}%` } as React.CSSProperties}
                                  />
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <div className="text-muted-foreground mb-0.5">ATS</div>
                                  <div className="font-bold">{typeof atsOptimized === "number" ? `${atsOptimized}%` : "n/a"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground mb-0.5">Document</div>
                                  <div className="font-bold">{badgeMeta?.label || "Legacy"}</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between border-t border-border/50 pt-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <ArrowRight className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs">Ouvrir le résultat complet et revoir le CV généré</span>
                            </div>
                            <span className="section-label">Résultat →</span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button variant="outline" size="sm" className="rounded-xl gap-1" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                    <ChevronLeft className="h-4 w-4" /> Précédent
                  </Button>
                  <span className="text-sm text-muted-foreground tabular-nums">{page + 1} / {totalPages}</span>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                    Suivant <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </section>
          );
        })()}
      </div>
    </Layout>
  );
}
