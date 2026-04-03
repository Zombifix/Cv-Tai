import { useParams, Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useRun } from "@/hooks/use-tailor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Copy, Check, AlertCircle, CheckCircle,
  Lightbulb, Hash, ChevronDown, ChevronUp,
  Globe, ShieldCheck, Zap, RefreshCw, Pencil, X,
  WandSparkles, Library, BookOpen, Ban, Tag, ExternalLink, Plus, Sparkles,
  Send, Calendar
} from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// ─── Confidence Ring ──────────────────────────────────────────────────────────

function ConfidenceRing({ value, size = 72 }: { value: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);

  const color = value >= 70 ? "#22c55e" : value >= 40 ? "#f59e0b" : "#ef4444";
  const label = value >= 70 ? "Fort match" : value >= 40 ? "Match partiel" : "Match faible";
  const textColor = value >= 70 ? "text-green-600 dark:text-green-400" : value >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0" data-testid="section-confidence-ring">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ display: "block" }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="currentColor" strokeWidth={strokeWidth}
            className="text-muted/25"
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-extrabold tabular-nums" data-testid="text-confidence-value">{value}%</span>
        </div>
      </div>
      <span className={`text-[11px] font-semibold tracking-tight ${textColor}`} data-testid="text-confidence-label">{label}</span>
    </div>
  );
}

// ─── Keyword highlighter ──────────────────────────────────────────────────────

function highlightKeywords(text: string, keywords: string[]): React.ReactNode {
  if (!keywords.length) return text;
  const sorted = [...keywords].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} className="bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 rounded-sm px-0.5 font-semibold not-italic">{part}</mark>
      : part
  );
}

// ─── Formatted CV document renderer ──────────────────────────────────────────

function FormattedCV({ text, keywords = [] }: { text: string; keywords?: string[] }) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let isFirstContent = true;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      if (elements.length > 0) elements.push(<div key={`gap-${i}`} className="h-2" />);
      continue;
    }

    if (line.startsWith("### ")) {
      const content = line.replace(/^###\s*/, "").replace(/\*\*/g, "");
      const parts = content.split("|").map(p => p.trim());
      const [roleRaw, company] = parts.length > 1 ? [parts[0], parts[1]] : [content, ""];
      elements.push(
        <div key={i} className="mt-5 first:mt-0">
          <p className="text-[13px] font-bold text-foreground leading-snug">
            {roleRaw}
            {company && <span className="font-normal text-muted-foreground"> — {company}</span>}
          </p>
        </div>
      );
    } else if (line.startsWith("## ")) {
      const heading = line.replace(/^##\s*/, "").replace(/\*\*/g, "").toUpperCase();
      elements.push(
        <div key={i} className="mt-7 first:mt-0 flex items-center gap-3">
          <h2 className="text-[10px] font-extrabold text-muted-foreground tracking-[0.15em] uppercase whitespace-nowrap">{heading}</h2>
          <div className="flex-1 h-px bg-border/70" />
        </div>
      );
    } else if (line.match(/^(SKILLS?|COMPÉTENCES?)[:\s]*/i) && !line.startsWith("•")) {
      const rest = line.replace(/^(SKILLS?|COMPÉTENCES?)[:\s]*/i, "").trim();
      const sectionLabel = line.match(/compétences/i) ? "Compétences" : "Skills";
      elements.push(
        <div key={i} className="mt-7">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-[10px] font-extrabold text-muted-foreground tracking-[0.15em] uppercase">{sectionLabel}</h2>
            <div className="flex-1 h-px bg-border/70" />
          </div>
          {rest && (
            <div className="flex flex-wrap gap-2">
              {rest.split(/[,·•|]/).map(s => s.trim()).filter(Boolean).map((skill, j) => (
                <span key={j} className="px-2.5 py-1 text-[11px] rounded-md bg-primary/8 border border-primary/20 text-primary font-medium">{skill}</span>
              ))}
            </div>
          )}
        </div>
      );
    } else if (line.startsWith("•") || line.startsWith("–") || (line.startsWith("-") && !line.startsWith("---"))) {
      const bulletText = line.replace(/^[•\-–]\s*/, "").replace(/\*\*/g, "");
      elements.push(
        <div key={i} className="flex items-start gap-2.5 pl-0.5">
          <span className="mt-[7px] flex-shrink-0 w-1 h-1 rounded-full bg-foreground/40" />
          <p className="text-[13px] text-foreground/90 leading-relaxed">{highlightKeywords(bulletText, keywords)}</p>
        </div>
      );
    } else if (line.match(/^\d{4}/) && (line.includes("–") || line.includes("-") || line.match(/présent|present/i))) {
      elements.push(<p key={i} className="text-[11px] text-muted-foreground mt-0.5 mb-1">{line}</p>);
    } else if (isFirstContent && i <= 3) {
      const content = line.replace(/\*\*/g, "").replace(/^#+\s*/, "");
      if (i === 0) {
        isFirstContent = false;
        elements.push(<h1 key={i} className="text-xl font-bold text-foreground tracking-tight mb-0.5">{content}</h1>);
      } else {
        elements.push(<p key={i} className="text-sm text-muted-foreground leading-relaxed">{content}</p>);
      }
    } else {
      const content = line.replace(/\*\*/g, "").replace(/^#+\s*/, "");
      elements.push(<p key={i} className="text-[13px] text-foreground/85 leading-relaxed">{highlightKeywords(content, keywords)}</p>);
    }
  }

  return <div className="space-y-1.5 font-sans">{elements}</div>;
}

// ─── Report Sections ──────────────────────────────────────────────────────────

const MODE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  original: { label: "Fidèle", icon: <ShieldCheck className="w-3 h-3" />, color: "bg-primary/10 text-primary" },
  polished: { label: "Optimisé", icon: <Zap className="w-3 h-3" />, color: "bg-accent/10 text-accent" },
  adaptive: { label: "Adaptatif", icon: <RefreshCw className="w-3 h-3" />, color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
};

function MatchScore({ confidence, reasoning, fallbackUsed, scoreBreakdown }: { confidence: number; reasoning?: string; fallbackUsed?: boolean; scoreBreakdown?: { ats: number; semantic: number; domainMismatch?: string; cappedByKeywords?: boolean } }) {
  const size = 56;
  const strokeWidth = 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, confidence)) / 100);
  const color = confidence >= 70 ? "#22c55e" : confidence >= 40 ? "#f59e0b" : "#ef4444";
  const label = confidence >= 70 ? "Fort match" : confidence >= 40 ? "Match partiel" : "Match faible";
  const textColor = confidence >= 70 ? "text-green-600 dark:text-green-400" : confidence >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  const insightSentence = reasoning
    ? reasoning.split(".").find(s => s.trim().length > 20)?.trim()
    : null;

  return (
    <Card className="border-border/60 shadow-none" data-testid="section-match-score">
      <CardContent className="p-4">
        {/* Domain mismatch warning — prominent, above the ring */}
        {scoreBreakdown?.domainMismatch && (
          <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug font-medium">
              Mismatch détecté ({scoreBreakdown.domainMismatch}) — les compétences se croisent partiellement mais le cœur du rôle diffère.
            </p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90" style={{ display: "block" }}>
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/25" />
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-extrabold tabular-nums" data-testid="text-match-score-value">{confidence}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${textColor}`} data-testid="text-match-score-label">{label}</p>
            {scoreBreakdown?.cappedByKeywords && (
              <p className="text-[10px] text-red-500 dark:text-red-400 font-medium mt-0.5">Plafonné — keywords critiques absents du CV</p>
            )}
            {fallbackUsed && !scoreBreakdown?.cappedByKeywords && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Match faible — bullets de substitution utilisés</p>
            )}
          </div>
        </div>

        {/* Score breakdown — ATS vs semantic */}
        {scoreBreakdown && (
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50">
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">ATS Keywords</p>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${scoreBreakdown.ats >= 70 ? "bg-green-500" : scoreBreakdown.ats >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${scoreBreakdown.ats}%` }} />
                </div>
                <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{scoreBreakdown.ats}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Bullets sémantique</p>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${scoreBreakdown.semantic >= 70 ? "bg-green-500" : scoreBreakdown.semantic >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${scoreBreakdown.semantic}%` }} />
                </div>
                <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{scoreBreakdown.semantic}%</span>
              </div>
            </div>
          </div>
        )}

        {insightSentence && !scoreBreakdown && (
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border/50 italic" data-testid="text-match-score-insight">
            {insightSentence}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SkillsCoverage({ matched, missing }: { matched: string[]; missing: string[] }) {
  const total = matched.length + missing.length;
  const pct = total === 0 ? 0 : Math.round((matched.length / total) * 100);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const mutation = useMutation({
    mutationFn: (skill: string) =>
      apiRequest("POST", "/api/skills", { name: skill, level: null, priority: 0 }),
    onSuccess: (_: unknown, skill: string) => {
      setAdded(prev => new Set([...prev, skill]));
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
    },
  });

  const handleAdd = (skill: string) => {
    if (!added.has(skill) && !mutation.isPending) mutation.mutate(skill);
  };

  return (
    <Card className="border-border/60 shadow-none" data-testid="section-skills-coverage">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Skills de l'offre</h4>
          <span className="text-xs font-bold text-primary tabular-nums">{matched.length}/{total} dans ta biblio</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {matched.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {matched.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium" data-testid={`badge-matched-${i}`}>
                <CheckCircle className="w-3 h-3 flex-shrink-0" /> {s}
              </span>
            ))}
          </div>
        )}
        {missing.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
              {matched.length === 0 ? "Absentes de ta bibliothèque — cliquer pour ajouter" : "Manquantes — cliquer pour ajouter"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((s, i) => {
                const isAdded = added.has(s);
                return (
                  <button
                    key={i}
                    data-testid={`badge-missing-${i}`}
                    onClick={() => handleAdd(s)}
                    disabled={isAdded || mutation.isPending}
                    title={isAdded ? "Ajouté à la bibliothèque" : "Ajouter à la bibliothèque"}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium border transition-all ${
                      isAdded
                        ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 cursor-default"
                        : "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer"
                    }`}
                  >
                    {isAdded ? <Check className="w-3 h-3 flex-shrink-0" /> : <Plus className="w-3 h-3 flex-shrink-0" />}
                    {s}
                  </button>
                );
              })}
            </div>
            {matched.length === 0 && (
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                Ces compétences ne sont pas encore dans votre Super-CV. Cliquez sur "+" pour les ajouter.
              </p>
            )}
          </div>
        )}
        {total === 0 && <p className="text-xs text-muted-foreground italic">Aucune donnée de compétence disponible.</p>}
      </CardContent>
    </Card>
  );
}

function KeyTips({ tips, insight }: { tips: string[]; insight?: string }) {
  const hasContent = (tips && tips.length > 0) || insight;
  if (!hasContent) return null;

  return (
    <Card className="border-yellow-200/60 dark:border-yellow-900/40 bg-yellow-50/50 dark:bg-yellow-900/10 shadow-none" data-testid="section-tips">
      <CardContent className="p-4 space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0" /> Points d'attention
        </h4>
        {insight && (
          <p className="text-xs text-foreground/70 leading-relaxed italic border-l-2 border-yellow-400/50 pl-2" data-testid="text-insight">{insight}</p>
        )}
        {tips && tips.length > 0 && (
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-foreground/80 leading-relaxed" data-testid={`text-tip-${i}`}>
                <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-500" />
                {tip}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DetailsDisclosure({ report }: { report: any }) {
  const [open, setOpen] = useState(false);
  const [showRejExps, setShowRejExps] = useState(false);
  const [showRejBullets, setShowRejBullets] = useState(false);
  const [showKeywords, setShowKeywords] = useState(false);

  const bulletsByExp = new Map<string, any[]>();
  for (const b of (report.selectedBullets || [])) {
    const key = b.experienceTitle || "Other";
    if (!bulletsByExp.has(key)) bulletsByExp.set(key, []);
    bulletsByExp.get(key)!.push(b);
  }

  return (
    <div className="rounded-xl border border-border/60" data-testid="section-details">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-toggle-details"
      >
        <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> Analyse détaillée</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="border-t border-border/60 px-4 py-4 space-y-4 bg-muted/10 rounded-b-xl">

          {/* Selected Experiences */}
          {report.selectedExperiences?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Expériences sélectionnées</p>
              <div className="space-y-2">
                {report.selectedExperiences.map((exp: any, i: number) => {
                  const bullets = bulletsByExp.get(exp.title) || [];
                  return (
                    <div key={i} className="p-2.5 rounded-lg border bg-background/80 space-y-1" data-testid={`item-selected-exp-${i}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{exp.title}</p>
                          <p className="text-[10px] text-muted-foreground">{exp.company}</p>
                        </div>
                        <span className="text-[9px] text-muted-foreground flex-shrink-0">{exp.bulletCount}b</span>
                      </div>
                      {exp.reason && <p className="text-[10px] text-muted-foreground/80 italic leading-snug">{exp.reason}</p>}
                      {exp.matchedAspects?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {exp.matchedAspects.map((a: string, j: number) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/5 text-primary/70 font-medium">{a}</span>
                          ))}
                        </div>
                      )}
                      {bullets.length > 0 && (
                        <div className="pt-1 space-y-1">
                          {bullets.map((b: any, j: number) => (
                            <div key={j} className="border-l-2 border-primary/20 pl-2 py-0.5">
                              <p className="text-[10px] text-foreground/80 leading-snug">{b.text}</p>
                              {b.matchedKeywords?.length > 0 && (
                                <div className="flex gap-1 flex-wrap mt-0.5">
                                  {b.matchedKeywords.slice(0, 3).map((k: string, m: number) => (
                                    <span key={m} className="text-[8px] px-1 py-px rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">{k}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rejected Experiences */}
          {report.rejectedExperiences?.length > 0 && (
            <div>
              <button
                onClick={() => setShowRejExps(v => !v)}
                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-1.5"
                data-testid="button-toggle-rejected-exps"
              >
                <Ban className="w-3 h-3" />
                Non sélectionnées ({report.rejectedExperiences.length})
                {showRejExps ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
              </button>
              {showRejExps && (
                <div className="space-y-1.5">
                  {report.rejectedExperiences.map((exp: any, i: number) => (
                    <div key={i} className="p-2 rounded-lg border bg-background/60 space-y-0.5" data-testid={`item-rejected-exp-${i}`}>
                      <p className="text-[10px] font-medium text-foreground/70">{exp.title} — {exp.company}</p>
                      {exp.reason && <p className="text-[9px] italic text-muted-foreground leading-snug">{exp.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rejected Bullets */}
          {report.rejectedBullets?.length > 0 && (
            <div>
              <button
                onClick={() => setShowRejBullets(v => !v)}
                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-1.5"
                data-testid="button-toggle-rejected-bullets"
              >
                <Tag className="w-3 h-3" />
                Bullets ignorés ({report.rejectedBullets.length})
                {showRejBullets ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
              </button>
              {showRejBullets && (
                <div className="space-y-1">
                  {report.rejectedBullets.map((b: any, i: number) => (
                    <div key={i} className="border-l-2 border-muted pl-2 py-0.5" data-testid={`item-rejected-bullet-${i}`}>
                      <p className="text-[10px] text-muted-foreground leading-snug">{b.text}</p>
                      {b.reason && <p className="text-[9px] italic text-muted-foreground/60 mt-0.5">{b.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Detected Keywords */}
          {report.detectedKeywords && (
            <div>
              <button
                onClick={() => setShowKeywords(v => !v)}
                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-1.5"
                data-testid="button-toggle-keywords"
              >
                <Hash className="w-3 h-3" />
                Mots-clés détectés
                {showKeywords ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
              </button>
              {showKeywords && (
                <div className="space-y-2">
                  {[
                    { label: "Compétences requises", items: report.detectedKeywords.requiredSkills, cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" },
                    { label: "Compétences souhaitées", items: report.detectedKeywords.preferredSkills, cls: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" },
                    { label: "Responsabilités", items: report.detectedKeywords.responsibilities, cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" },
                    { label: "Domaine", items: report.detectedKeywords.keywords, cls: "bg-muted text-muted-foreground" },
                  ].filter(g => g.items?.length).map(g => (
                    <div key={g.label}>
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground/70 mb-1">{g.label}</p>
                      <div className="flex flex-wrap gap-1">
                        {g.items.map((k: string, i: number) => (
                          <span key={i} className={`px-1.5 py-px text-[10px] rounded font-medium ${g.cls}`}>{k}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ─── Library Suggestions ──────────────────────────────────────────────────────

function LibrarySuggestions({ missingSkills }: { missingSkills: string[] }) {
  const [added, setAdded] = useState<Set<string>>(new Set());

  const mutation = useMutation({
    mutationFn: (skill: string) =>
      apiRequest("POST", "/api/skills", { name: skill, level: null, priority: 0 }),
    onSuccess: (_: unknown, skill: string) => {
      setAdded(prev => new Set([...prev, skill]));
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
    },
  });

  if (!missingSkills.length) return null;

  return (
    <Card className="border-border/60 shadow-none border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20" data-testid="section-library-suggestions">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <h3 className="text-xs font-bold text-amber-700 dark:text-amber-300 tracking-wide uppercase">Améliorer la bibliothèque</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
          Ces compétences manquent dans votre Super-CV. Ajoutez-les en 1 clic pour améliorer vos prochains tailorings.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {missingSkills.slice(0, 12).map(skill => {
            const isAdded = added.has(skill);
            return (
              <button
                key={skill}
                data-testid={`button-add-skill-${skill}`}
                onClick={() => { if (!isAdded && !mutation.isPending) mutation.mutate(skill); }}
                disabled={isAdded || mutation.isPending}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                  isAdded
                    ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 cursor-default"
                    : "bg-background border-border/60 text-foreground hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
                }`}
              >
                {isAdded
                  ? <Check className="w-3 h-3" />
                  : <Plus className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                }
                {skill}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Critical Keywords Coverage ──────────────────────────────────────────────

function CriticalKeywordsCoverage({ covered, missing }: { covered: string[]; missing: string[] }) {
  const total = covered.length + missing.length;
  if (total === 0) return null;
  const pct = Math.round((covered.length / total) * 100);
  const scoreColor = pct >= 70 ? "text-green-600 dark:text-green-400" : pct >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400";
  const barColor = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <Card className="border-border/60 shadow-none" data-testid="section-critical-keywords">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Hash className="w-4 h-4 text-muted-foreground" /> Keywords critiques
          </h4>
          <span className={`text-xs font-bold tabular-nums ${scoreColor}`}>{covered.length}/{total} dans le CV</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {covered.map((k, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
              <Check className="w-2.5 h-2.5 flex-shrink-0" /> {k}
            </span>
          ))}
          {missing.map((k, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 font-medium">
              <X className="w-2.5 h-2.5 flex-shrink-0" /> {k}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Application Tracker ──────────────────────────────────────────────────────

interface AppTracking {
  applied: boolean;
  appliedAt: string;
  status: "waiting" | "interview" | "rejected" | "offer";
  responseAt: string;
}

const TRACKING_DEFAULT: AppTracking = { applied: false, appliedAt: "", status: "waiting", responseAt: "" };

const STATUS_OPTIONS: { value: AppTracking["status"]; label: string; activeClass: string }[] = [
  { value: "waiting",   label: "En attente", activeClass: "bg-muted text-foreground border-border" },
  { value: "interview", label: "Entretien",  activeClass: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700" },
  { value: "rejected",  label: "Refus",      activeClass: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700" },
];

function ApplicationTracker({ runId }: { runId: string }) {
  const storageKey = `app-tracking-${runId}`;
  const [tracking, setTracking] = useState<AppTracking>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "null") ?? TRACKING_DEFAULT; }
    catch { return TRACKING_DEFAULT; }
  });

  const save = (updates: Partial<AppTracking>) => {
    const next = { ...tracking, ...updates };
    setTracking(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <Card className="border-border/60 shadow-none" data-testid="section-application-tracker">
      <CardContent className="p-4 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Send className="w-3.5 h-3.5 text-muted-foreground" /> Suivi de candidature
        </h4>

        {!tracking.applied ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Tu as postulé avec ce CV ?</p>
            <Button size="sm" variant="outline" className="w-full gap-2 text-xs" onClick={() => save({ applied: true, appliedAt: today })}>
              <Check className="w-3.5 h-3.5" /> J'ai postulé
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Applied row */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/40">
              <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Postulé
              </span>
              <input
                type="date"
                value={tracking.appliedAt}
                onChange={e => save({ appliedAt: e.target.value })}
                className="text-xs border-b border-dashed border-muted-foreground/30 bg-transparent outline-none text-muted-foreground cursor-pointer"
              />
            </div>

            {/* Status */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Réponse reçue</p>
              <div className="grid grid-cols-3 gap-1">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => save({ status: opt.value })}
                    className={`text-[11px] px-1 py-1.5 rounded-md border transition-all font-medium ${
                      tracking.status === opt.value ? opt.activeClass : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Response date */}
            {(tracking.status === "interview" || tracking.status === "rejected") && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date réponse
                </span>
                <input
                  type="date"
                  value={tracking.responseAt}
                  onChange={e => save({ responseAt: e.target.value })}
                  className="text-xs border-b border-dashed border-muted-foreground/30 bg-transparent outline-none text-muted-foreground cursor-pointer"
                />
              </div>
            )}

            {/* Reset */}
            <button
              onClick={() => save(TRACKING_DEFAULT)}
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors block mt-1"
            >
              Réinitialiser
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Result Page ─────────────────────────────────────────────────────────

export default function Result() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: run, isLoading, error } = useRun(id || "");
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState<string | null>(null);

  const displayText = editedText ?? run?.outputCvText ?? "";

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    setEditedText(run?.outputCvText ?? "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedText(null);
    setIsEditing(false);
  };

  const handleTailorAgain = () => {
    const jobText = run?.jobPost?.rawText;
    const jobUrl = run?.jobPost?.url;
    window.history.pushState({ tailorPrefill: { text: jobText, url: jobUrl } }, "", "/tailor");
    setLocation("/tailor");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <h2 className="text-xl font-semibold text-muted-foreground animate-pulse" data-testid="text-loading">Génération du CV en cours...</h2>
        </div>
      </Layout>
    );
  }

  if (error || !run) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-2xl font-bold" data-testid="text-error-title">Résultat introuvable</h2>
          <p className="text-muted-foreground" data-testid="text-error-message">Ce CV a peut-être été supprimé ou une erreur s'est produite.</p>
          <Link href="/tailor"><Button data-testid="button-try-again">Réessayer</Button></Link>
        </div>
      </Layout>
    );
  }

  const report = run.outputReportJson as any;
  const modeMeta = MODE_META[run.mode] || MODE_META.polished;

  const pageTitle = [report?.jobTitle, report?.jobCompany].filter(Boolean).join(" — ") || "Tailored CV";
  const keyInsight = (() => {
    const r = report?.confidenceReasoning?.split(".").find((s: string) => s.trim().length > 20);
    return r ? r.trim() + "." : null;
  })();
  const jobUrl = run?.jobPost?.url;
  const allKeywords = [
    ...(report?.detectedKeywords?.requiredSkills || []),
    ...(report?.detectedKeywords?.preferredSkills || []),
    ...(report?.detectedKeywords?.keywords || []),
  ].filter((k, i, arr) => k.length > 2 && arr.indexOf(k) === i);

  return (
    <Layout>
      <div className="flex flex-col gap-6 animate-in fade-in duration-400">

        {/* ── HEADER ── */}
        <div className="flex items-start gap-4 flex-wrap" data-testid="section-page-header">
          <Link href="/tailor">
            <Button variant="outline" size="icon" className="rounded-xl shadow-sm flex-shrink-0 mt-0.5" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div className="flex-1 min-w-0 flex items-start gap-4">
            {report?.confidence != null && (
              <ConfidenceRing value={report.confidence} size={68} />
            )}

            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-xl font-extrabold tracking-tight text-foreground leading-tight truncate" data-testid="text-page-title">
                {pageTitle}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${modeMeta.color}`} data-testid="badge-mode">
                  {modeMeta.icon} {modeMeta.label}
                </span>
                {report?.detectedLanguage && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold" data-testid="badge-language">
                    <Globe className="w-3 h-3" /> {report.detectedLanguage}
                  </span>
                )}
                {report?.jobSeniority && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{report.jobSeniority}</span>
                )}
                {jobUrl && (
                  <span className="inline-flex flex-col items-start">
                    <a
                      href={jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border border-border/60 bg-background text-muted-foreground hover:text-foreground hover:border-border transition-colors font-medium"
                      data-testid="link-job-posting"
                    >
                      <ExternalLink className="w-3 h-3" /> Voir l'annonce
                    </a>
                    {jobUrl.includes("linkedin.com") && (
                      <span className="text-[9px] text-muted-foreground/60 px-2.5 mt-0.5">Connexion LinkedIn requise</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={handleCopy}
            variant="outline"
            className="rounded-xl shadow-sm flex-shrink-0 hidden sm:flex"
            data-testid="button-copy-header"
          >
            {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copié !" : "Copier"}
          </Button>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── LEFT: CV Document ── */}
          <div className="lg:col-span-2 flex flex-col gap-0 rounded-xl overflow-hidden border border-border/60 shadow-[0_2px_24px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.3)]" data-testid="section-cv-panel">

            {/* Panel toolbar */}
            <div className="flex items-center justify-between bg-muted/30 border-b px-4 py-2.5 gap-3">
              {!isEditing ? (
                <Tabs defaultValue="generated" className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <TabsList className="h-7 text-xs gap-0.5 bg-background/70">
                      <TabsTrigger value="generated" className="text-xs h-6 px-2.5" data-testid="tab-generated">CV généré</TabsTrigger>
                      <TabsTrigger value="source" className="text-xs h-6 px-2.5" data-testid="tab-source">Bullets sources</TabsTrigger>
                    </TabsList>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEdit}
                      className="text-xs h-7 px-2.5 text-muted-foreground hover:text-foreground gap-1.5"
                      data-testid="button-edit-cv"
                    >
                      <Pencil className="w-3 h-3" /> Modifier
                    </Button>
                  </div>

                  <TabsContent value="generated" className="mt-0">
                    <div
                      className="bg-white dark:bg-zinc-950 px-8 py-10 md:px-14 md:py-12 min-h-[400px]"
                      data-testid="text-cv-output"
                    >
                      <FormattedCV text={displayText || "No text generated."} keywords={allKeywords} />
                    </div>
                  </TabsContent>

                  <TabsContent value="source" className="mt-0">
                    <div className="bg-white dark:bg-zinc-950 px-8 py-10 md:px-14 md:py-12 min-h-[300px]" data-testid="section-source-bullets">
                      <p className="text-xs text-muted-foreground italic mb-6 pb-4 border-b">
                        Bullets originaux de ta bibliothèque — avant toute réécriture IA.
                      </p>
                      {report?.selectedExperiences?.map((exp: any, i: number) => {
                        const bullets = (report.selectedBullets || []).filter((b: any) => b.experienceTitle === exp.title);
                        return (
                          <div key={i} className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="text-[10px] font-extrabold text-muted-foreground tracking-[0.12em] uppercase">{exp.title}</p>
                              <div className="flex-1 h-px bg-border/60" />
                              <p className="text-[10px] text-muted-foreground">{exp.company}</p>
                            </div>
                            <div className="space-y-1.5">
                              {bullets.map((b: any, j: number) => (
                                <div key={j} className="flex items-start gap-2.5">
                                  <span className="mt-[7px] flex-shrink-0 w-1 h-1 rounded-full bg-foreground/40" />
                                  <p className="text-[13px] text-foreground/85 leading-relaxed">{b.text}</p>
                                </div>
                              ))}
                              {bullets.length === 0 && <p className="text-xs text-muted-foreground italic pl-3">Aucun bullet enregistré.</p>}
                            </div>
                          </div>
                        );
                      })}
                      {!report?.selectedExperiences?.length && (
                        <p className="text-sm text-muted-foreground italic">Aucune donnée source disponible.</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex items-center justify-between w-full gap-3">
                  <span className="text-xs text-muted-foreground font-medium">Modification en cours</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="text-xs h-7 px-2.5 text-muted-foreground hover:text-foreground gap-1.5"
                    data-testid="button-cancel-edit"
                  >
                    <X className="w-3 h-3" /> Annuler
                  </Button>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="bg-white dark:bg-zinc-950 p-4">
                <Textarea
                  data-testid="textarea-cv-edit"
                  value={editedText ?? ""}
                  onChange={e => setEditedText(e.target.value)}
                  className="w-full min-h-[500px] resize-y font-mono text-sm leading-relaxed border border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40 bg-transparent rounded-lg p-4"
                />
              </div>
            )}
          </div>

          {/* ── RIGHT: Report Panel ── */}
          <div className="space-y-3" data-testid="section-report">

            {/* 1. Match Score */}
            {report?.confidence != null && (
              <MatchScore
                confidence={report.confidence}
                reasoning={report.confidenceReasoning}
                fallbackUsed={report.fallbackUsed}
                scoreBreakdown={report.scoreBreakdown}
              />
            )}

            {/* 2. Critical Keywords Coverage */}
            {(report?.postRules?.keywordsCovered?.length > 0 || report?.postRules?.keywordsMissing?.length > 0) && (
              <CriticalKeywordsCoverage
                covered={report.postRules.keywordsCovered || []}
                missing={report.postRules.keywordsMissing || []}
              />
            )}

            {/* 3. Skills Coverage */}
            {(report?.matchedSkills || report?.missingSkills) && (
              <SkillsCoverage
                matched={report.matchedSkills || []}
                missing={report.missingSkills || []}
              />
            )}

            {/* Tips + Insight */}
            <KeyTips
              tips={report?.tips || []}
              insight={keyInsight || undefined}
            />

            {/* Details Disclosure */}
            <DetailsDisclosure report={report || {}} />

            {/* Application Tracker */}
            <ApplicationTracker runId={run.id} />

          </div>
        </div>

        {/* ── ACTION FOOTER ── */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/50 flex-wrap" data-testid="section-action-footer">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleTailorAgain}
              className="rounded-xl gap-2 text-sm"
              data-testid="button-tailor-again"
            >
              <WandSparkles className="w-4 h-4" /> Nouveau tailoring
            </Button>
            <Link href="/library">
              <Button variant="ghost" className="rounded-xl gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="button-improve-library">
                <Library className="w-4 h-4" /> Améliorer la bibliothèque
              </Button>
            </Link>
          </div>
          <Button
            onClick={handleCopy}
            className="rounded-xl gap-2 shadow-sm shadow-primary/20"
            data-testid="button-copy-footer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copié !" : "Copier le CV"}
          </Button>
        </div>

      </div>
    </Layout>
  );
}
