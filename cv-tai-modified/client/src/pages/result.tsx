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
  WandSparkles, Library, BookOpen, ExternalLink, Plus, Sparkles, FileDown,
  Send, Calendar
} from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// â”€â”€â”€ Confidence Ring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Keyword highlighter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Formatted CV document renderer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
            {company && <span className="font-normal text-muted-foreground"> â€” {company}</span>}
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
    } else if (line.match(/^(SKILLS?|COMPÃ‰TENCES?)[:\s]*/i) && !line.startsWith("â€¢")) {
      const rest = line.replace(/^(SKILLS?|COMPÃ‰TENCES?)[:\s]*/i, "").trim();
      const sectionLabel = line.match(/compÃ©tences/i) ? "CompÃ©tences" : "Skills";
      elements.push(
        <div key={i} className="mt-7">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-[10px] font-extrabold text-muted-foreground tracking-[0.15em] uppercase">{sectionLabel}</h2>
            <div className="flex-1 h-px bg-border/70" />
          </div>
          {rest && (
            <div className="flex flex-wrap gap-2">
              {rest.split(/[,Â·â€¢|]/).map(s => s.trim()).filter(Boolean).map((skill, j) => (
                <span key={j} className="px-2.5 py-1 text-[11px] rounded-md bg-primary/8 border border-primary/20 text-primary font-medium">{skill}</span>
              ))}
            </div>
          )}
        </div>
      );
    } else if (/^(PROFESSIONAL SUMMARY|RESUME PROFESSIONNEL|EXPERIENCE PROFESSIONNELLE?|EXPERIENCE|EDUCATION|FORMATION|LANGUAGES?|LANGUES?)\s*$/i.test(line)) {
      elements.push(
        <div key={i} className="mt-7 first:mt-0 flex items-center gap-3">
          <h2 className="text-[10px] font-extrabold text-muted-foreground tracking-[0.15em] uppercase whitespace-nowrap">{line}</h2>
          <div className="flex-1 h-px bg-border/70" />
        </div>
      );
    } else if (line.startsWith("â€¢") || line.startsWith("â€“") || (line.startsWith("-") && !line.startsWith("---"))) {
      const bulletText = line.replace(/^[â€¢\-â€“]\s*/, "").replace(/\*\*/g, "");
      elements.push(
        <div key={i} className="flex items-start gap-2.5 pl-0.5">
          <span className="mt-[7px] flex-shrink-0 w-1 h-1 rounded-full bg-foreground/40" />
          <p className="text-[13px] text-foreground/90 leading-relaxed">{highlightKeywords(bulletText, keywords)}</p>
        </div>
      );
    } else if (line.match(/^\d{4}/) && (line.includes("â€“") || line.includes("-") || line.match(/prÃ©sent|present/i))) {
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

// â”€â”€â”€ Report Sections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MODE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  original: { label: "FidÃ¨le", icon: <ShieldCheck className="w-3 h-3" />, color: "bg-primary/10 text-primary" },
  polished: { label: "OptimisÃ©", icon: <Zap className="w-3 h-3" />, color: "bg-accent/10 text-accent" },
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

  const insightSentence = reasoning || null;

  return (
    <Card className="border-border/60 shadow-none" data-testid="section-match-score">
      <CardContent className="p-4">
        {/* Domain mismatch warning â€” prominent, above the ring */}
        {scoreBreakdown?.domainMismatch && (
          <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug font-medium">
              Mismatch dÃ©tectÃ© ({scoreBreakdown.domainMismatch}) â€” les compÃ©tences se croisent partiellement mais le cÅ“ur du rÃ´le diffÃ¨re.
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
              <p className="text-[10px] text-red-500 dark:text-red-400 font-medium mt-0.5">PlafonnÃ© â€” keywords critiques absents du CV</p>
            )}
            {fallbackUsed && !scoreBreakdown?.cappedByKeywords && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Match faible â€” bullets de substitution utilisÃ©s</p>
            )}
          </div>
        </div>

        {/* Score breakdown â€” ATS vs semantic */}
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
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Bullets sÃ©mantique</p>
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
              {matched.length === 0 ? "Absentes de ta bibliothÃ¨que â€” cliquer pour ajouter" : "Manquantes â€” cliquer pour ajouter"}
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
                    title={isAdded ? "AjoutÃ© Ã  la bibliothÃ¨que" : "Ajouter Ã  la bibliothÃ¨que"}
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
                Ces compÃ©tences ne sont pas encore dans votre Super-CV. Cliquez sur "+" pour les ajouter.
              </p>
            )}
          </div>
        )}
        {total === 0 && <p className="text-xs text-muted-foreground italic">Aucune donnÃ©e de compÃ©tence disponible.</p>}
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

function DetailsDisclosure({ report, scoreBreakdown }: { report: any; scoreBreakdown?: { ats: number; semantic: number; domainMismatch?: string; cappedByKeywords?: boolean } }) {
  const [open, setOpen] = useState(false);
  const [showKeywords, setShowKeywords] = useState(false);

  return (
    <div className="rounded-xl border border-border/60" data-testid="section-details">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-toggle-details"
      >
        <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> Analyse dÃ©taillÃ©e</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="border-t border-border/60 px-4 py-4 space-y-4 bg-muted/10 rounded-b-xl">
          {scoreBreakdown && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Detail du score</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium">Keywords ATS</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${scoreBreakdown.ats >= 70 ? "bg-green-500" : scoreBreakdown.ats >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${scoreBreakdown.ats}%` }} />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{scoreBreakdown.ats}%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium">Alignement des bullets selectionnes</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${scoreBreakdown.semantic >= 70 ? "bg-green-500" : scoreBreakdown.semantic >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${scoreBreakdown.semantic}%` }} />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{scoreBreakdown.semantic}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">Mesure a quel point les bullets retenus racontent quelque chose de proche du role, meme sans reprendre mot pour mot l'annonce.</p>
                </div>
              </div>
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
                Mots-clÃ©s dÃ©tectÃ©s
                {showKeywords ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
              </button>
              {showKeywords && (
                <div className="space-y-2">
                  {[
                    { label: "CompÃ©tences requises", items: report.detectedKeywords.requiredSkills, cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" },
                    { label: "CompÃ©tences souhaitÃ©es", items: report.detectedKeywords.preferredSkills, cls: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" },
                    { label: "ResponsabilitÃ©s", items: report.detectedKeywords.responsibilities, cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" },
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

// â”€â”€â”€ Library Suggestions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
          <h3 className="text-xs font-bold text-amber-700 dark:text-amber-300 tracking-wide uppercase">AmÃ©liorer la bibliothÃ¨que</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
          Ces compÃ©tences manquent dans votre Super-CV. Ajoutez-les en 1 clic pour amÃ©liorer vos prochains tailorings.
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

// â”€â”€â”€ Critical Keywords Coverage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

type ReportDiagnosis = {
  primaryDiagnosis?: string;
  verdict?: string;
  whatMatches?: string[];
  whatMissing?: string[];
  nextActions?: string[];
};

type JobInputInfo = {
  sourceType?: "url" | "text";
  normalizedUrl?: string;
  scrapeStatus?: "success" | "blocked" | "failed" | "not_attempted";
  scrapeMessage?: string;
};

function sourceBadge(meta?: JobInputInfo) {
  if (meta?.sourceType === "url") {
    return meta.scrapeStatus === "success" ? "URL scrapee" : "URL fournie";
  }
  return "Texte colle";
}

function MatchDiagnosisCard({ confidence, diagnosis, fallbackUsed, scoreBreakdown }: { confidence: number; diagnosis?: ReportDiagnosis; fallbackUsed?: boolean; scoreBreakdown?: { ats: number; semantic: number; domainMismatch?: string; cappedByKeywords?: boolean } }) {
  const label = confidence >= 70 ? "Fort match" : confidence >= 40 ? "Match partiel" : "Match faible";
  const textColor = confidence >= 70 ? "text-green-600 dark:text-green-400" : confidence >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  const verdict = diagnosis?.verdict || "Le moteur a estime un niveau de correspondance global pour cette annonce.";
  const whatMatches = diagnosis?.whatMatches || [];
  const whatMissing = diagnosis?.whatMissing || [];
  const nextActions = diagnosis?.nextActions || [];

  return (
    <Card className="border-border/60 shadow-none" data-testid="section-match-diagnosis">
      <CardContent className="p-4 space-y-4">
        {scoreBreakdown?.domainMismatch && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug font-medium">
              Mismatch detecte ({scoreBreakdown.domainMismatch}) : tes experiences se croisent avec le poste, mais le coeur du role reste different.
            </p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <ConfidenceRing value={confidence} size={56} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${textColor}`}>{label}</p>
            {diagnosis?.primaryDiagnosis && (
              <p className="text-[11px] text-foreground font-medium mt-0.5">{diagnosis.primaryDiagnosis}</p>
            )}
            {scoreBreakdown?.cappedByKeywords && (
              <p className="text-[10px] text-red-500 dark:text-red-400 font-medium mt-0.5">Plafonne : keywords critiques absents du CV</p>
            )}
            {fallbackUsed && !scoreBreakdown?.cappedByKeywords && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Le moteur a trouve peu de bullets forts pour cette annonce.</p>
            )}
          </div>
        </div>

        <p className="text-[12px] text-foreground/80 leading-relaxed">{verdict}</p>

        {whatMatches.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Ce qui matche</p>
            <ul className="space-y-1.5">
              {whatMatches.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-[12px] text-foreground/80 leading-relaxed">
                  <CheckCircle className="w-3.5 h-3.5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {whatMissing.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Ce qui manque</p>
            <ul className="space-y-1.5">
              {whatMissing.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-[12px] text-foreground/80 leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {nextActions.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Quoi faire maintenant</p>
            <ul className="space-y-1.5">
              {nextActions.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-[12px] text-foreground/80 leading-relaxed">
                  <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-yellow-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UsedJobPosting({ meta, rawText, url }: { meta?: JobInputInfo; rawText?: string; url?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-950 px-8 py-10 md:px-14 md:py-12 min-h-[300px]" data-testid="section-used-job-posting">
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
          <Globe className="w-3 h-3" /> {sourceBadge(meta)}
        </span>
        {meta?.scrapeStatus && (
          <span className="text-[11px] text-muted-foreground">{meta.scrapeMessage}</span>
        )}
      </div>

      {(meta?.normalizedUrl || url) && (
        <div className="mb-4">
          <p className="text-[10px] font-extrabold text-muted-foreground tracking-[0.12em] uppercase mb-2">Source</p>
          <a
            href={meta?.normalizedUrl || url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline break-all"
          >
            <ExternalLink className="w-3 h-3" /> {meta?.normalizedUrl || url}
          </a>
        </div>
      )}

      <div>
        <p className="text-[10px] font-extrabold text-muted-foreground tracking-[0.12em] uppercase mb-2">Annonce utilisee</p>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/85 font-sans">
            {rawText || "Aucun texte d'annonce sauvegarde pour ce run."}
          </pre>
        </div>
      </div>
    </div>
  );
}

function compactList(items: unknown, limit = 12): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function buildAnalysisExport({
  run,
  report,
  jobInput,
  displayText,
  pageTitle,
}: {
  run: any;
  report: any;
  jobInput: JobInputInfo;
  displayText: string;
  pageTitle: string;
}) {
  const selectedExperiences = Array.isArray(report?.selectedExperiences) ? report.selectedExperiences : [];
  const selectedBullets = Array.isArray(report?.selectedBullets) ? report.selectedBullets : [];

  const sourceBullets = selectedExperiences
    .map((exp: any) => {
      const bullets = selectedBullets.filter((bullet: any) => bullet.experienceTitle === exp.title);
      const lines = bullets.map((bullet: any) => `- ${String(bullet?.text ?? "").trim()}`).filter(Boolean);
      if (!lines.length) return "";
      const title = [exp?.title, exp?.company].filter(Boolean).join(" | ");
      return [`### ${title || "Experience"}`, ...lines].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

  const lines = [
    "# CV TAI ANALYSIS EXPORT",
    "",
    "## Run",
    `- Run ID: ${run?.id || "unknown"}`,
    `- Title: ${pageTitle || "Tailored CV"}`,
    `- Mode: ${run?.mode || "unknown"}`,
    `- Language: ${report?.detectedLanguage || "unknown"}`,
    `- Seniority: ${report?.jobSeniority || "unknown"}`,
    "",
    "## Match",
    `- Confidence: ${report?.confidence ?? "n/a"}%`,
    `- Primary diagnosis: ${report?.diagnosis?.primaryDiagnosis || "n/a"}`,
    `- Verdict: ${report?.diagnosis?.verdict || report?.confidenceReasoning || "n/a"}`,
    `- ATS score: ${report?.scoreBreakdown?.ats ?? "n/a"}`,
    `- Semantic score: ${report?.scoreBreakdown?.semantic ?? "n/a"}`,
    `- Domain mismatch: ${report?.scoreBreakdown?.domainMismatch || "none"}`,
    `- Keywords capped: ${report?.scoreBreakdown?.cappedByKeywords ? "yes" : "no"}`,
    `- Fallback used: ${report?.fallbackUsed ? "yes" : "no"}`,
    "",
    "## What Matches",
    ...(compactList(report?.diagnosis?.whatMatches).map(item => `- ${item}`)),
    "",
    "## What Is Missing",
    ...(compactList(report?.diagnosis?.whatMissing).map(item => `- ${item}`)),
    "",
    "## Next Actions",
    ...(compactList(report?.diagnosis?.nextActions).map(item => `- ${item}`)),
    "",
    "## Skills",
    `- Matched skills: ${compactList(report?.matchedSkills, 20).join(", ") || "none"}`,
    `- Missing skills: ${compactList(report?.missingSkills, 20).join(", ") || "none"}`,
    "",
    "## Critical Keywords",
    `- Covered: ${compactList(report?.postRules?.keywordsCovered, 25).join(", ") || "none"}`,
    `- Missing: ${compactList(report?.postRules?.keywordsMissing, 25).join(", ") || "none"}`,
    "",
    "## Job Input",
    `- Source type: ${jobInput?.sourceType || "unknown"}`,
    `- Scrape status: ${jobInput?.scrapeStatus || "unknown"}`,
    `- Scrape message: ${jobInput?.scrapeMessage || "n/a"}`,
    `- Source URL: ${jobInput?.normalizedUrl || run?.jobPost?.url || "n/a"}`,
    "",
    "## Tips",
    ...(compactList(report?.tips, 12).map(item => `- ${item}`)),
    "",
    "## Source Bullets",
    sourceBullets || "No source bullets saved for this run.",
    "",
    "## Generated CV",
    displayText?.trim() || "No generated CV text.",
    "",
    "## Used Job Posting",
    run?.jobPost?.rawText?.trim() || "No job posting text saved for this run.",
  ];

  return lines.join("\n");
}

// â”€â”€â”€ Application Tracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
            <p className="text-xs text-muted-foreground">Tu as postulÃ© avec ce CV ?</p>
            <Button size="sm" variant="outline" className="w-full gap-2 text-xs" onClick={() => save({ applied: true, appliedAt: today })}>
              <Check className="w-3.5 h-3.5" /> J'ai postulÃ©
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Applied row */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/40">
              <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> PostulÃ©
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
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">RÃ©ponse reÃ§ue</p>
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
                  <Calendar className="w-3 h-3" /> Date rÃ©ponse
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
              RÃ©initialiser
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// â”€â”€â”€ Main Result Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Result() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: run, isLoading, error } = useRun(id || "");
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
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
          <h2 className="text-xl font-semibold text-muted-foreground animate-pulse" data-testid="text-loading">GÃ©nÃ©ration du CV en cours...</h2>
        </div>
      </Layout>
    );
  }

  if (error || !run) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-2xl font-bold" data-testid="text-error-title">RÃ©sultat introuvable</h2>
          <p className="text-muted-foreground" data-testid="text-error-message">Ce CV a peut-Ãªtre Ã©tÃ© supprimÃ© ou une erreur s'est produite.</p>
          <Link href="/tailor"><Button data-testid="button-try-again">RÃ©essayer</Button></Link>
        </div>
      </Layout>
    );
  }
  const report = run.outputReportJson as any;
  const jobInput = ((run.jobPost?.extractedJson as any)?.jobInput || {
    sourceType: run.jobPost?.url ? "url" : "text",
    normalizedUrl: run.jobPost?.url,
    scrapeStatus: run.jobPost?.url ? "success" : "not_attempted",
    scrapeMessage: run.jobPost?.url ? "Annonce recuperee pour ce run." : "Description collee manuellement.",
  }) as JobInputInfo;
  const modeMeta = MODE_META[run.mode] || MODE_META.polished;

  const pageTitle = [report?.jobTitle, report?.jobCompany].filter(Boolean).join(" â€” ") || "Tailored CV";
  const keyInsight = report?.confidenceReasoning || null;
  const jobUrl = run?.jobPost?.url;
  const allKeywords = [
    ...(report?.detectedKeywords?.requiredSkills || []),
    ...(report?.detectedKeywords?.preferredSkills || []),
    ...(report?.detectedKeywords?.keywords || []),
  ].filter((k, i, arr) => k.length > 2 && arr.indexOf(k) === i);
  const analysisExport = buildAnalysisExport({
    run,
    report,
    jobInput,
    displayText,
    pageTitle,
  });

  const handleExportAnalysis = async () => {
    await navigator.clipboard.writeText(analysisExport);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 animate-in fade-in duration-400">

        {/* â”€â”€ HEADER â”€â”€ */}
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
            onClick={handleExportAnalysis}
            variant="outline"
            className="rounded-xl shadow-sm flex-shrink-0 hidden sm:flex"
            data-testid="button-export-analysis-header"
          >
            {exported ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <FileDown className="w-4 h-4 mr-2" />}
            {exported ? "Exporte !" : "Exporter analyse"}
          </Button>

          <Button
            onClick={handleCopy}
            variant="outline"
            className="rounded-xl shadow-sm flex-shrink-0 hidden sm:flex"
            data-testid="button-copy-header"
          >
            {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "CopiÃ© !" : "Copier"}
          </Button>
        </div>

        {/* â”€â”€ MAIN GRID â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* â”€â”€ LEFT: CV Document â”€â”€ */}
          <div className="lg:col-span-2 flex flex-col gap-0 rounded-xl overflow-hidden border border-border/60 shadow-[0_2px_24px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.3)]" data-testid="section-cv-panel">

            {/* Panel toolbar */}
            <div className="flex items-center justify-between bg-muted/30 border-b px-4 py-2.5 gap-3">
              {!isEditing ? (
                <Tabs defaultValue="generated" className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <TabsList className="h-7 text-xs gap-0.5 bg-background/70">
                      <TabsTrigger value="generated" className="text-xs h-6 px-2.5" data-testid="tab-generated">CV gÃ©nÃ©rÃ©</TabsTrigger>
                      <TabsTrigger value="source" className="text-xs h-6 px-2.5" data-testid="tab-source">Bibliotheque utilisee</TabsTrigger>
                      <TabsTrigger value="job" className="text-xs h-6 px-2.5" data-testid="tab-job">Annonce utilisee</TabsTrigger>
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
                        Bullets originaux de ta bibliothÃ¨que â€” avant toute rÃ©Ã©criture IA.
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
                              {bullets.length === 0 && <p className="text-xs text-muted-foreground italic pl-3">Aucun bullet enregistrÃ©.</p>}
                            </div>
                          </div>
                        );
                      })}
                      {!report?.selectedExperiences?.length && (
                        <p className="text-sm text-muted-foreground italic">Aucune donnÃ©e source disponible.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="job" className="mt-0">
                    <UsedJobPosting meta={jobInput} rawText={run?.jobPost?.rawText} url={jobUrl} />
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

          {/* â”€â”€ RIGHT: Report Panel â”€â”€ */}
          <div className="space-y-3" data-testid="section-report">

            {/* 1. Match Score */}
            {report?.confidence != null && (
              <MatchDiagnosisCard
                confidence={report.confidence}
                diagnosis={report.diagnosis}
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
            <DetailsDisclosure report={report || {}} scoreBreakdown={report?.scoreBreakdown} />

            {/* Application Tracker */}
            <ApplicationTracker runId={run.id} />

          </div>
        </div>

        {/* â”€â”€ ACTION FOOTER â”€â”€ */}
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
                <Library className="w-4 h-4" /> AmÃ©liorer la bibliothÃ¨que
              </Button>
            </Link>
          </div>
          <Button
            onClick={handleExportAnalysis}
            variant="outline"
            className="rounded-xl gap-2 shadow-sm"
            data-testid="button-export-analysis-footer"
          >
            {exported ? <Check className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
            {exported ? "Exporte !" : "Exporter analyse"}
          </Button>
          <Button
            onClick={handleCopy}
            className="rounded-xl gap-2 shadow-sm shadow-primary/20"
            data-testid="button-copy-footer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "CopiÃ© !" : "Copier le CV"}
          </Button>
        </div>

      </div>
    </Layout>
  );
}
