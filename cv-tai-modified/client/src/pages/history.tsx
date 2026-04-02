import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useRuns } from "@/hooks/use-tailor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, WandSparkles, ArrowRight, ShieldCheck, Zap, RefreshCw, AlertCircle, Send, Check, X } from "lucide-react";

function getTracking(runId: string) {
  try { return JSON.parse(localStorage.getItem(`app-tracking-${runId}`) || "null"); }
  catch { return null; }
}

function TrackingBadge({ runId }: { runId: string }) {
  const t = getTracking(runId);
  if (!t?.applied) return null;
  if (t.status === "interview") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium flex-shrink-0">
        <Check className="w-2.5 h-2.5" /> Entretien
      </span>
    );
  }
  if (t.status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium flex-shrink-0">
        <X className="w-2.5 h-2.5" /> Refus
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">
      <Send className="w-2.5 h-2.5" /> Postulé
    </span>
  );
}

const MODE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  original: { label: "Original", icon: <ShieldCheck className="w-3 h-3" />, color: "bg-primary/10 text-primary" },
  polished: { label: "Polished", icon: <Zap className="w-3 h-3" />, color: "bg-accent/10 text-accent" },
  adaptive: { label: "Adaptive", icon: <RefreshCw className="w-3 h-3" />, color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
};

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-green-500" : value >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums text-muted-foreground">{value}%</span>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function History() {
  const { data: runs, isLoading, error } = useRuns();

  return (
    <Layout>
      <div className="max-w-3xl mx-auto flex flex-col gap-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <Clock className="w-7 h-7 text-primary" /> History
            </h1>
            <p className="text-muted-foreground text-sm">All your previously tailored CVs.</p>
          </div>
          <Link href="/tailor">
            <Button data-testid="button-new-tailor" className="rounded-xl shadow-sm shadow-primary/20">
              <WandSparkles className="w-4 h-4 mr-2" /> New Tailoring
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load history.
          </div>
        )}

        {!isLoading && !error && runs?.length === 0 && (
          <Card className="border-dashed border-2 bg-transparent shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-muted/50">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No tailored CVs yet</p>
                <p className="text-sm text-muted-foreground mt-1">Generate your first tailored CV to see it here.</p>
              </div>
              <Link href="/tailor">
                <Button variant="outline" className="rounded-xl mt-2" data-testid="button-start-tailoring">
                  <WandSparkles className="w-4 h-4 mr-2" /> Start Tailoring
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {!isLoading && runs && runs.length > 0 && (
          <div className="flex flex-col gap-3">
            {runs.map((run: any, i: number) => {
              const report = run.outputReportJson as any;
              const modeMeta = MODE_META[run.mode] || MODE_META.polished;
              return (
                <Link key={run.id} href={`/results/${run.id}`}>
                  <Card
                    className="cursor-pointer border-border/60 hover:border-primary/40 hover:shadow-md transition-all duration-200 bg-card/80"
                    data-testid={`card-history-${i}`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm leading-tight truncate" data-testid={`text-history-title-${i}`}>
                            {report?.jobTitle || "Unknown Role"}
                          </p>
                          {report?.jobCompany && (
                            <span className="text-xs text-muted-foreground truncate">— {report.jobCompany}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${modeMeta.color}`}>
                            {modeMeta.icon} {modeMeta.label}
                          </span>
                          {report?.detectedLanguage && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                              {report.detectedLanguage}
                            </span>
                          )}
                          <TrackingBadge runId={run.id} />
                          <span className="text-[10px] text-muted-foreground">{formatDate(run.createdAt)}</span>
                        </div>
                        {report?.confidence != null && (
                          <ConfidenceBar value={report.confidence} />
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
