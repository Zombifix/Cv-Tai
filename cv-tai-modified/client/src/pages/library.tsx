import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { useExperiences, useCreateExperience, useUpdateExperience, useDeleteExperience } from "@/hooks/use-experiences";
import { useBullets, useCreateBullet, useUpdateBullet, useDeleteBullet } from "@/hooks/use-bullets";
import { useSkills, useCreateSkill, useDeleteSkill } from "@/hooks/use-skills";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Building, Calendar, Pencil, RefreshCw, Briefcase, Zap, Upload, Sparkles, Check, X, GraduationCap, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Experience, Bullet } from "@shared/schema";

/* ══════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════ */
interface Gap { id: string; dimension: string; question: string; priority: number; }

function getDepthInfo(bulletCount: number) {
  if (bulletCount === 0) return { label: "Vide", color: "#C45050", bg: "#FEF0EF", dots: 0 };
  if (bulletCount <= 2) return { label: "Ebauche", color: "#B8941F", bg: "#FEF9EC", dots: 1 };
  if (bulletCount <= 3) return { label: "Structure", color: "#4D8A5E", bg: "#EEF5EF", dots: 3 };
  return { label: "Complet", color: "#2D7A3D", bg: "#E0F0E0", dots: 5 };
}

/* ══════════════════════════════════════════════════════════════════
   PROFILE HOOK
   ══════════════════════════════════════════════════════════════════ */
function useProfile() {
  const [profile, setProfile] = useState<any>({ name: "", title: "", summary: "", targetRole: "" });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/profile", { credentials: "include" }).then(r => r.json()).then(p => {
      setProfile(p || { name: "", title: "", summary: "", targetRole: "" });
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const save = useCallback(async (updates: any) => {
    const merged = { ...profile, ...updates };
    setProfile(merged);
    await fetch("/api/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates), credentials: "include",
    });
  }, [profile]);

  return { profile, save, loaded };
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE — Single page, no tabs
   ══════════════════════════════════════════════════════════════════ */
export default function Library() {
  const { profile, save: saveProfile, loaded: profileLoaded } = useProfile();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: "", title: "", summary: "" });

  useEffect(() => {
    if (profileLoaded) {
      setProfileDraft({ name: profile.name || "", title: profile.title || "", summary: profile.summary || "" });
    }
  }, [profileLoaded]);

  const handleSaveProfile = () => {
    saveProfile(profileDraft);
    setEditingProfile(false);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-10 max-w-4xl">

        {/* ── PROFILE HEADER ── */}
        <Card className="border border-border">
          <CardContent className="p-5">
          {editingProfile ? (
            <div className="space-y-3 animate-in fade-in-50">
              <Input value={profileDraft.name} onChange={e => setProfileDraft({ ...profileDraft, name: e.target.value })}
                placeholder="Prenom Nom" className="text-2xl font-bold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent" />
              <Input value={profileDraft.title} onChange={e => setProfileDraft({ ...profileDraft, title: e.target.value })}
                placeholder="Senior Product Designer" className="text-base text-muted-foreground border-0 p-0 h-auto focus-visible:ring-0 bg-transparent" />
              <Input value={profileDraft.summary} onChange={e => setProfileDraft({ ...profileDraft, summary: e.target.value })}
                placeholder="Une phrase qui te resume (optionnel)" className="text-sm text-muted-foreground border-0 p-0 h-auto focus-visible:ring-0 bg-transparent" />
              <Button size="sm" onClick={handleSaveProfile}>Valider</Button>
            </div>
          ) : (
            <div className="cursor-pointer group" onClick={() => setEditingProfile(true)}>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{profile.name || "Votre nom"}</h1>
                  <p className="text-base text-muted-foreground mt-0.5">{profile.title || "Votre poste"}</p>
                  {profile.summary && <p className="text-sm text-muted-foreground/70 mt-1">{profile.summary}</p>}
                </div>
                <Pencil className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
            </div>
          )}
          </CardContent>
        </Card>

        {/* ── EXPERIENCES ── */}
        <ExperiencesSection />

        {/* ── SKILLS ── */}
        <SkillsSection />

        {/* ── FORMATIONS + LANGUAGES — side by side ── */}
        <div className="grid grid-cols-2 gap-6">
          <FormationsSection />
          <LanguagesSection />
        </div>

      </div>
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EXPERIENCES SECTION — Accordion + Enrichment Sheet
   ══════════════════════════════════════════════════════════════════ */
function ExperiencesSection() {
  const { data: experiences, isLoading } = useExperiences();
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<any>(null);
  const [enrichingExpId, setEnrichingExpId] = useState<string | null>(null);

  if (isLoading) return <div className="h-40 flex items-center justify-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin" /></div>;

  const enrichingExp = experiences?.find(e => e.id === enrichingExpId) || null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" /> Work History
        </h2>
        <div className="flex gap-2">
          <CVImportDialog open={importOpen} onOpenChange={setImportOpen} />
          <ExperienceDialog open={editOpen} onOpenChange={setEditOpen} experience={editingExp} onClose={() => setEditingExp(null)} />
        </div>
      </div>

      {!experiences?.length ? (
        <Card className="border-dashed border-2 bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">Importez votre CV</h3>
            <p className="text-muted-foreground mt-1 mb-4 max-w-sm">Uploadez un PDF ou collez le texte de votre CV pour pre-remplir vos experiences.</p>
            <div className="flex gap-2">
              <Button onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" /> Importer un CV</Button>
              <Button variant="outline" onClick={() => setEditOpen(true)}><Plus className="w-4 h-4 mr-2" /> Ajouter manuellement</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {[...experiences].sort((a, b) => {
            const dateA = a.endDate ? new Date(a.endDate).getTime() : Date.now();
            const dateB = b.endDate ? new Date(b.endDate).getTime() : Date.now();
            return dateB - dateA;
          }).map(exp => (
            <ExperienceAccordionItem
              key={exp.id}
              experience={exp}
              onEdit={() => { setEditingExp(exp); setEditOpen(true); }}
              onEnrich={() => setEnrichingExpId(exp.id)}
            />
          ))}
        </Accordion>
      )}

      {/* Enrichment Sheet */}
      <Sheet open={!!enrichingExp} onOpenChange={(val) => { if (!val) setEnrichingExpId(null); }}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          {enrichingExp && <EnrichmentPanel experience={enrichingExp} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EXPERIENCE ACCORDION ITEM — bullets visible + edit + enrich
   ══════════════════════════════════════════════════════════════════ */
function ExperienceAccordionItem({ experience, onEdit, onEnrich }: {
  experience: Experience; onEdit: () => void; onEnrich: () => void;
}) {
  const { data: bullets } = useBullets(experience.id);
  const updateBullet = useUpdateBullet();
  const deleteBullet = useDeleteBullet();
  const { toast } = useToast();
  const bulletCount = bullets?.length || 0;
  const depth = getDepthInfo(bulletCount);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [retagging, setRetagging] = useState<string | null>(null);
  const [editEval, setEditEval] = useState<Record<string, boolean> | null>(null);
  const [editReasons, setEditReasons] = useState<Record<string, string> | null>(null);
  const [editSuggestion, setEditSuggestion] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const handleReEvaluate = async () => {
    if (!editText.trim()) return;
    setEvaluating(true);
    try {
      const res = await fetch(`/api/experiences/${experience.id}/tag-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText.trim() }),
        credentials: "include",
      });
      const data = await res.json();
      setEditTags(data.tags || editTags);
      setEditEval(data.evaluation || null);
      setEditReasons(data.reasons || null);
      setEditSuggestion(data.suggestion || null);
    } catch {} finally { setEvaluating(false); }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    try {
      await updateBullet.mutateAsync({ id: editingId, experienceId: experience.id, text: editText.trim(), tags: editTags });
      setEditingId(null);
      setEditText("");
      setEditTags([]);
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBullet.mutateAsync({ id, experienceId: experience.id });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleRetag = async (bulletId: string, bulletText: string) => {
    setRetagging(bulletId);
    try {
      const res = await fetch(`/api/experiences/${experience.id}/tag-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bulletText }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.tags?.length > 0) {
        await updateBullet.mutateAsync({ id: bulletId, experienceId: experience.id, tags: data.tags });
        toast({ title: "Tags mis a jour" });
      }
    } catch {} finally { setRetagging(null); }
  };

  const cardRef = useRef<HTMLDivElement>(null);
  const btnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const btns = btnsRef.current;
    if (!card || !btns) return;
    btns.style.visibility = "hidden";
    const show = () => { btns.style.visibility = "visible"; };
    const hide = () => { btns.style.visibility = "hidden"; };
    card.addEventListener("mouseenter", show);
    card.addEventListener("mouseleave", hide);
    return () => {
      card.removeEventListener("mouseenter", show);
      card.removeEventListener("mouseleave", hide);
    };
  }, []);

  return (
    <div ref={cardRef}>
    <AccordionItem value={experience.id} className="bg-card border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center pr-4">
        <AccordionTrigger className="flex-1 hover:no-underline py-4 px-5 data-[state=open]:border-b data-[state=open]:border-border/50">
          <div className="flex flex-col items-start text-left gap-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building className="w-3 h-3" /> {experience.company}
              {experience.contractType && <Badge variant="outline" className="text-xs px-2 py-0.5">{experience.contractType}</Badge>}
              <span className="opacity-40">|</span>
              <Calendar className="w-3 h-3" />
              {experience.startDate ? format(new Date(experience.startDate), "MMM yyyy") : "N/A"} - {experience.endDate ? format(new Date(experience.endDate), "MMM yyyy") : "Present"}
            </div>
            <span className="font-bold text-base">{experience.title}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: depth.bg, color: depth.color }}>{depth.label}</span>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < depth.dots ? depth.color : "#e8e5de" }} />
                ))}
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <div ref={btnsRef} className="flex items-center gap-1 ml-auto pl-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
          {bulletCount < 5 && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onEnrich}>
              <Sparkles className="w-3.5 h-3.5" /> Enrichir
            </Button>
          )}
        </div>
      </div>
      <AccordionContent className="p-0">
        <div className="p-5 space-y-3">
          {experience.description && (
            <p className="text-sm text-foreground/70 whitespace-pre-line mb-4">{experience.description}</p>
          )}

          {(!bullets || bullets.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun bullet. Clique sur Enrichir pour commencer.</p>
          )}

          {bullets?.map(bullet => (
            <div key={bullet.id} className="group relative bg-muted/30 rounded-lg p-3 border border-border/30 hover:border-border transition-colors">
              {editingId === bullet.id ? (
                <div className="space-y-3">
                  <Textarea value={editText} onChange={e => { setEditText(e.target.value); setEditEval(null); setEditReasons(null); setEditSuggestion(null); }} className="text-sm resize-none min-h-[50px]" />
                  {/* Editable tags */}
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {editTags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-0.5 text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded-md">
                        {tag}
                        <button onClick={() => setEditTags(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 hover:text-destructive">×</button>
                      </span>
                    ))}
                    <input
                      type="text" value={newTag} onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && newTag.trim()) { e.preventDefault(); setEditTags(prev => [...prev, newTag.trim()]); setNewTag(""); } }}
                      placeholder="+ tag" className="text-xs w-20 bg-transparent border-b border-dashed border-muted-foreground/30 outline-none px-1 py-0.5"
                    />
                  </div>
                  {/* Evaluation badges with reasons */}
                  {editEval && (
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { key: "clarte", label: "Clarte" },
                        { key: "contexte", label: "Contexte" },
                        { key: "scope", label: "Scope" },
                        { key: "impact", label: "Impact" },
                        { key: "completude", label: "Completude" },
                      ].map(({ key, label }) => (
                        <span key={key} title={editReasons?.[key] || ""} className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-help ${
                          editEval[key] ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        }`}>
                          {editEval[key] ? "✓" : "○"} {label}
                        </span>
                      ))}
                    </div>
                  )}
                  {editSuggestion && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg">
                      <span className="font-medium">Suggestion :</span> {editSuggestion}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={!editText.trim()} className="h-7 text-xs">Enregistrer</Button>
                    <Button size="sm" variant="outline" onClick={handleReEvaluate} disabled={!editText.trim() || evaluating} className="h-7 text-xs">
                      {evaluating ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      Evaluer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setNewTag(""); setEditEval(null); setEditReasons(null); setEditSuggestion(null); }} className="h-7 text-xs">Annuler</Button>
                  </div>
                </div>
              ) : (
                <>
                  {bullet.tags && bullet.tags.length > 0 ? (
                    <div className="flex gap-1.5 mb-1.5 flex-wrap">
                      {bullet.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs px-2 py-0.5">{tag}</Badge>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRetag(bullet.id, bullet.text)}
                      disabled={retagging === bullet.id}
                      className="text-xs text-primary hover:underline mb-1.5 flex items-center gap-1"
                    >
                      {retagging === bullet.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generer les tags
                    </button>
                  )}
                  <p className="text-sm text-foreground/90 leading-relaxed pr-14">{bullet.text}</p>
                </>
              )}
              {editingId !== bullet.id && (
                <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => { setEditingId(bullet.id); setEditText(bullet.text); setEditTags(bullet.tags || []); setEditEval(null); setEditReasons(null); setEditSuggestion(null); }} className="text-muted-foreground hover:text-primary p-0.5"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => handleDelete(bullet.id)} className="text-muted-foreground hover:text-destructive p-0.5"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ENRICHMENT PANEL — gap detection + micro-thread
   ══════════════════════════════════════════════════════════════════ */
function EnrichmentPanel({ experience }: { experience: Experience }) {
  const { data: bullets } = useBullets(experience.id);
  const createBullet = useCreateBullet();
  const { toast } = useToast();

  const MAX_BULLETS = 5;
  const bulletCount = bullets?.length || 0;
  const remaining = MAX_BULLETS - bulletCount;

  // Flow state
  type Step = "loading" | "axes" | "list" | "edit";
  const [step, setStep] = useState<Step>("loading");
  const [axes, setAxes] = useState<string[]>([]);

  // Edit state
  const [editText, setEditText] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editEval, setEditEval] = useState<Record<string, boolean> | null>(null);
  const [editReasons, setEditReasons] = useState<Record<string, string> | null>(null);
  const [editSuggestion, setEditSuggestion] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [evaluated, setEvaluated] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // On mount: check if bullets exist
  useEffect(() => {
    if (bulletCount > 0) {
      setStep("list");
    } else {
      fetchAxes();
    }
  }, [experience.id]);

  const fetchAxes = async () => {
    setStep("loading");
    try {
      const res = await fetch(`/api/experiences/${experience.id}/extract-axes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      });
      const data = await res.json();
      const suggested = (data.axes || []).map((a: any) => a.text || a).filter(Boolean);
      setAxes(suggested);
      setStep(suggested.length > 0 ? "axes" : "edit");
    } catch { setStep("edit"); }
  };

  // Start editing a bullet (from axis or blank)
  const startEdit = (prefill?: string) => {
    setEditText(prefill || "");
    setEditTags([]);
    setEditEval(null);
    setEditSuggestion(null);
    setEvaluated(false);
    setStep("edit");
    setTimeout(() => textRef.current?.focus(), 100);
  };

  // Call LLM to tag + evaluate
  const handleEvaluate = async () => {
    if (!editText.trim()) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/experiences/${experience.id}/tag-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText.trim() }),
        credentials: "include",
      });
      const data = await res.json();
      setEditTags(data.tags || []);
      setEditEval(data.evaluation || null);
      setEditReasons(data.reasons || null);
      setEditSuggestion(data.suggestion || null);
      setEvaluated(true);
    } catch {
      setEditTags(["general"]);
      setEvaluated(true);
    } finally { setProcessing(false); }
  };

  // Save bullet (auto-tag if no tags)
  const handleSave = async () => {
    if (!editText.trim()) return;
    let finalTags = editTags;
    // Auto-tag if user hasn't tagged
    if (finalTags.length === 0) {
      try {
        const res = await fetch(`/api/experiences/${experience.id}/tag-evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: editText.trim() }),
          credentials: "include",
        });
        const data = await res.json();
        finalTags = data.tags || ["general"];
        setEditTags(finalTags);
        setEditEval(data.evaluation || null);
        setEditReasons(data.reasons || null);
      } catch { finalTags = ["general"]; }
    }
    try {
      await createBullet.mutateAsync({
        experienceId: experience.id,
        text: editText.trim(),
        tags: finalTags,
      });
      toast({ title: "Bullet enregistre" });
      setEditText("");
      setEditTags([]);
      setEditEval(null);
      setEditSuggestion(null);
      setEvaluated(false);
      setStep("list");
    } catch (e: any) {
      if (e.message?.includes("similaire")) {
        toast({ title: "Doublon", description: "Un bullet similaire existe deja." });
      } else {
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      }
    }
  };

  const removeTag = (idx: number) => setEditTags(prev => prev.filter((_, i) => i !== idx));
  const addTag = () => {
    if (newTagText.trim()) {
      setEditTags(prev => [...prev, newTagText.trim()]);
      setNewTagText("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <SheetHeader className="p-6 pb-4 border-b border-border/50 space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building className="w-3.5 h-3.5" /> {experience.company}
          {experience.startDate && (
            <>
              <span className="opacity-40">|</span>
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(experience.startDate), "MMM yyyy")} - {experience.endDate ? format(new Date(experience.endDate), "MMM yyyy") : "Present"}
            </>
          )}
        </div>
        <SheetTitle className="text-lg font-bold">{experience.title}</SheetTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{bulletCount}/{MAX_BULLETS} bullets</Badge>
          {remaining <= 0 && <span className="text-[10px] text-amber-600">Limite atteinte</span>}
        </div>
      </SheetHeader>

      {/* ── LOADING ── */}
      {step === "loading" && (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* ── AXES — suggestions from description ── */}
      {step === "axes" && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <p className="text-sm font-medium">Axes detectes dans ta description</p>
            <p className="text-xs text-muted-foreground mt-1">Clique sur un axe pour l'utiliser comme base de bullet. Tu pourras l'editer.</p>
          </div>

          <div className="space-y-2">
            {axes.map((axis, i) => (
              <button
                key={i}
                onClick={() => startEdit(axis)}
                disabled={remaining <= 0}
                className="w-full text-left text-sm p-3 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all leading-snug disabled:opacity-50"
              >
                {axis}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── LIST — existing bullets ── */}
      {step === "list" && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {bullets && bullets.length > 0 ? (
            <div className="space-y-3">
              {bullets.map((b: any) => (
                <div key={b.id} className="text-sm p-3 rounded-lg border border-border bg-background">
                  <p className="leading-snug">{b.text}</p>
                  {b.tags?.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {b.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs px-2 py-0.5">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun bullet. Clique ci-dessous pour en ajouter.</p>
          )}
        </div>
      )}

      {/* ── EDIT — write / edit a bullet ── */}
      {step === "edit" && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Redige ton bullet</p>
            <Textarea
              ref={textRef}
              value={editText}
              onChange={e => { setEditText(e.target.value); setEvaluated(false); }}
              placeholder="Ex: Premier designer CRM Accor : structuration produit, definition de la vision et alignement DA pour des parcours coherents"
              className="min-h-[100px] text-sm resize-none"
            />
          </div>

          {/* Tags (shown after evaluation or editable anytime) */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</p>
            <div className="flex gap-1 flex-wrap items-center">
              {editTags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-0.5 text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded-md">
                  {tag}
                  <button onClick={() => removeTag(i)} className="ml-0.5 hover:text-destructive">×</button>
                </span>
              ))}
              <input
                type="text"
                value={newTagText}
                onChange={e => setNewTagText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="+ tag"
                className="text-xs w-20 bg-transparent border-b border-dashed border-muted-foreground/30 outline-none px-1 py-0.5"
              />
            </div>
            {editTags.length === 0 && !evaluated && (
              <p className="text-[10px] text-muted-foreground">Les tags seront generes automatiquement. Tu peux aussi les ajouter toi-meme.</p>
            )}
          </div>

          {/* Evaluation badges */}
          {editEval && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evaluation</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "clarte", label: "Clarte" },
                  { key: "contexte", label: "Contexte" },
                  { key: "scope", label: "Scope" },
                  { key: "impact", label: "Impact" },
                  { key: "completude", label: "Completude" },
                ].map(({ key, label }) => (
                  <span key={key} title={editReasons?.[key] || ""} className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-help ${
                    editEval[key] ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                  }`}>
                    {editEval[key] ? "✓" : "○"} {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestion */}
          {editSuggestion && (
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg">
              <span className="font-medium">Suggestion :</span> {editSuggestion}
            </div>
          )}
        </div>
      )}

      {/* ── BOTTOM BAR ── */}
      <div className="border-t border-border/50 bg-muted/20 p-5 space-y-3 shrink-0">

        {/* Axes mode — also show "write from scratch" */}
        {step === "axes" && (
          <div className="space-y-2">
            <Button variant="outline" onClick={() => startEdit()} className="w-full" disabled={remaining <= 0}>
              <Plus className="w-4 h-4 mr-2" /> Ecrire un bullet librement
            </Button>
          </div>
        )}

        {/* List mode — add button */}
        {step === "list" && (
          <div className="space-y-2">
            {remaining > 0 && axes.length > 0 && bulletCount < axes.length && (
              <Button variant="outline" onClick={() => setStep("axes")} className="w-full">
                <Sparkles className="w-4 h-4 mr-2" /> Voir les axes suggeres ({axes.length - bulletCount} restants)
              </Button>
            )}
            <Button onClick={() => startEdit()} className="w-full" disabled={remaining <= 0}>
              <Plus className="w-4 h-4 mr-2" /> {remaining <= 0 ? "Limite atteinte (5/5)" : "Ajouter un bullet"}
            </Button>
          </div>
        )}

        {/* Edit mode — evaluate + save */}
        {step === "edit" && (
          <div className="space-y-2">
            {!evaluated && !processing && (
              <Button onClick={handleEvaluate} disabled={!editText.trim()} variant="outline" className="w-full">
                <Sparkles className="w-4 h-4 mr-2" /> Tagger + Evaluer
              </Button>
            )}
            {processing && (
              <div className="flex items-center justify-center py-2 gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" /> Analyse...
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!editText.trim() || createBullet.isPending} className="flex-1">
                <Check className="w-4 h-4 mr-2" /> Enregistrer
              </Button>
              <Button variant="outline" onClick={() => setStep(bulletCount > 0 ? "list" : axes.length > 0 ? "axes" : "list")}>
                Retour
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EXPERIENCE DIALOG — fixed pre-filling
   ══════════════════════════════════════════════════════════════════ */
function ExperienceDialog({ open, onOpenChange, experience, onClose }: any) {
  const createExp = useCreateExperience();
  const updateExp = useUpdateExperience();
  const deleteExp = useDeleteExperience();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ title: "", company: "", contractType: "", startDate: "", endDate: "", description: "" });
  const [isCurrent, setIsCurrent] = useState(false);

  useEffect(() => {
    if (experience && open) {
      setFormData({
        title: experience.title || "",
        company: experience.company || "",
        contractType: experience.contractType || "",
        startDate: experience.startDate || "",
        endDate: experience.endDate || "",
        description: experience.description || "",
      });
      setIsCurrent(!experience.endDate);
    } else if (open && !experience) {
      setFormData({ title: "", company: "", contractType: "", startDate: "", endDate: "", description: "" });
      setIsCurrent(false);
    }
  }, [open, experience]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...formData, endDate: isCurrent ? null : formData.endDate || null };
      if (experience) {
        await updateExp.mutateAsync({ id: experience.id, ...data });
        toast({ title: "Experience mise a jour" });
      } else {
        await createExp.mutateAsync(data);
        toast({ title: "Experience ajoutee" });
      }
      onOpenChange(false);
      onClose();
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer cette experience ?")) return;
    try {
      await deleteExp.mutateAsync(experience.id);
      toast({ title: "Experience supprimee" });
      onOpenChange(false);
      onClose();
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) onClose(); }}>
      <DialogTrigger asChild>
        {!experience && <Button><Plus className="w-4 h-4 mr-2" /> Add Experience</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle>{experience ? "Modifier" : "Ajouter une experience"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Titre</Label><Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Product Designer" /></div>
            <div className="space-y-2"><Label>Entreprise</Label><Input required value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} placeholder="Accor" /></div>
            <div className="space-y-2"><Label>Date debut</Label><Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Date fin</Label>
              <Input type="date" value={isCurrent ? "" : formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} disabled={isCurrent} className={isCurrent ? "opacity-40" : ""} />
              <label className="flex items-center gap-2 cursor-pointer mt-1" onClick={() => setIsCurrent(!isCurrent)}>
                <div className={`w-8 h-[18px] rounded-full p-0.5 transition-colors ${isCurrent ? "bg-primary" : "bg-border"}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${isCurrent ? "translate-x-3.5" : "translate-x-0"}`} />
                </div>
                <span className="text-xs text-muted-foreground">Poste actuel</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type de contrat</Label>
            <div className="flex gap-2">
              {["CDI", "Freelance", "CDD", "Stage", "Alternance"].map(ct => (
                <button key={ct} type="button" onClick={() => setFormData({ ...formData, contractType: formData.contractType === ct ? "" : ct })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${formData.contractType === ct ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"}`}>
                  {ct}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Description du role..." className="h-24" /></div>
          <DialogFooter className="pt-4 flex justify-between sm:justify-between">
            {experience ? <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteExp.isPending}>Supprimer</Button> : <div />}
            <Button type="submit" disabled={createExp.isPending || updateExp.isPending}>{experience ? "Enregistrer" : "Creer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SKILLS SECTION
   ══════════════════════════════════════════════════════════════════ */
function SkillsSection() {
  const { data: skills, isLoading } = useSkills();
  const createSkill = useCreateSkill();
  const deleteSkill = useDeleteSkill();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [proposed, setProposed] = useState<Array<{name: string; category: string; accepted: boolean}>>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("Techniques");

  const CATEGORIES = ["Outils", "Methodologies", "Soft Skills", "Domaines", "Techniques"];
  const CATEGORY_ICONS: Record<string, string> = {
    "Outils": "wrench",
    "Methodologies": "compass",
    "Soft Skills": "users",
    "Domaines": "globe",
    "Techniques": "code",
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catSkills = (skills || []).filter(s => (s.category || "Techniques") === cat);
    if (catSkills.length > 0) acc[cat] = catSkills;
    return acc;
  }, {} as Record<string, typeof skills>);

  // Uncategorized
  const uncategorized = (skills || []).filter(s => !s.category || !CATEGORIES.includes(s.category));
  if (uncategorized.length > 0) grouped["Autres"] = uncategorized;

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const res = await fetch("/api/skills/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (!data.skills?.length) {
        toast({ title: "Aucune nouvelle competence detectee" });
        setExtracting(false);
        return;
      }
      setProposed(data.skills.map((s: any) => ({ ...s, accepted: true })));
      setReviewOpen(true);
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveProposed = async () => {
    const toSave = proposed.filter(s => s.accepted);
    let saved = 0;
    for (const s of toSave) {
      try {
        await createSkill.mutateAsync({ name: s.name, category: s.category } as any);
        saved++;
      } catch { /* skip duplicates */ }
    }
    toast({ title: `${saved} competence${saved > 1 ? "s" : ""} ajoutee${saved > 1 ? "s" : ""}` });
    setReviewOpen(false);
    setProposed([]);
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;
    try {
      await createSkill.mutateAsync({ name: addName.trim(), category: addCategory } as any);
      setAddName("");
      setAddOpen(false);
      toast({ title: "Competence ajoutee" });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteSkill.mutateAsync(id); }
    catch (err) { toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }); }
  };

  const totalSkills = (skills || []).length;
  const atLimit = totalSkills >= 15;

  if (isLoading) return <div className="h-40 flex items-center justify-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Competences</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExtract} disabled={extracting || atLimit} className="gap-2 h-8 text-xs">
            {extracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {atLimit ? "Limite atteinte" : extracting ? "Analyse..." : "Extraire auto"}
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs" disabled={atLimit}><Plus className="w-3.5 h-3.5 mr-1" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader><DialogTitle>Ajouter une competence</DialogTitle></DialogHeader>
              <form onSubmit={handleAddManual} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input required value={addName} onChange={e => setAddName(e.target.value)} placeholder="Figma, User Testing..." />
                </div>
                <div className="space-y-2">
                  <Label>Categorie</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat} type="button" onClick={() => setAddCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${addCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createSkill.isPending}>Enregistrer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Skills grouped by category — 2 columns */}
      <div className="bg-card border rounded-xl p-5 shadow-sm grid grid-cols-2 gap-x-8 gap-y-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-6 text-muted-foreground col-span-2">
            <p className="text-sm">Aucune competence.</p>
            <p className="text-xs mt-1">Cliquez "Extraire auto" pour detecter vos competences.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, catSkills]) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{category}</p>
              <div className="flex flex-wrap gap-2">
                {catSkills!.map(skill => (
                  <div key={skill.id} className="group flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full border border-border/50 hover:border-destructive/30 transition-all">
                    <span className="font-medium text-sm">{skill.name}</span>
                    <button onClick={() => handleDelete(skill.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Dialog for extracted skills */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Competences detectees
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Decochez pour exclure. Les competences decochees ne seront <strong>plus jamais reproposees</strong>.</p>
          <div className="space-y-4 py-4">
            {CATEGORIES.map(cat => {
              const catItems = proposed.filter(s => s.category === cat);
              if (!catItems.length) return null;
              return (
                <div key={cat}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {catItems.map((skill, idx) => {
                      const globalIdx = proposed.findIndex(s => s.name === skill.name);
                      return (
                        <button key={idx} onClick={() => {
                          setProposed(prev => prev.map((s, i) => i === globalIdx ? { ...s, accepted: !s.accepted } : s));
                        }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            skill.accepted
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-muted text-muted-foreground border-border line-through opacity-50"
                          }`}>
                          {skill.accepted ? <Check className="w-3 h-3 inline mr-1" /> : <X className="w-3 h-3 inline mr-1" />}
                          {skill.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveProposed} disabled={createSkill.isPending || proposed.filter(s => s.accepted).length === 0}>
              {createSkill.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              Ajouter {proposed.filter(s => s.accepted).length} competence{proposed.filter(s => s.accepted).length > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SkillDialog({ open, onOpenChange, skill, onClose }: any) {
  // Kept for backward compat but no longer used as primary
  return null;
}

/* ══════════════════════════════════════════════════════════════════
   CV IMPORT DIALOG
   ══════════════════════════════════════════════════════════════════ */
interface ParsedExp { title: string; company: string; startDate?: string; endDate?: string | null; description?: string; bullets?: string[]; selected?: boolean; }

function CVImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (val: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"input" | "loading" | "review">("input");
  const [rawText, setRawText] = useState("");
  const [parsedExps, setParsedExps] = useState<ParsedExp[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setStep("input"); setRawText(""); setParsedExps([]); setSaving(false); };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) { toast({ title: "Format non supporte", description: "PDF uniquement.", variant: "destructive" }); return; }
    setStep("loading");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = () => reject(new Error("Lecture impossible"));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/import/cv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileBase64: base64 }), credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (!data.experiences?.length) { toast({ title: "Aucune experience trouvee", variant: "destructive" }); setStep("input"); return; }
      setParsedExps(data.experiences.map((e: any) => ({ ...e, selected: true }))); setStep("review");
    } catch (err) { toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }); setStep("input"); }
  };

  const handleTextSubmit = async () => {
    if (!rawText.trim()) return;
    setStep("loading");
    try {
      const res = await fetch("/api/import/cv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: rawText }), credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (!data.experiences?.length) { toast({ title: "Aucune experience trouvee", variant: "destructive" }); setStep("input"); return; }
      setParsedExps(data.experiences.map((e: any) => ({ ...e, selected: true }))); setStep("review");
    } catch (err) { toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }); setStep("input"); }
  };

  const toggleExp = (idx: number) => { setParsedExps(prev => prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e)); };

  const handleSaveAll = async () => {
    const toSave = parsedExps.filter(e => e.selected);
    if (!toSave.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/import/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ experiences: toSave }), credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: `${data.created} experience${data.created > 1 ? "s" : ""} importee${data.created > 1 ? "s" : ""}` });
      queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
      onOpenChange(false); reset();
    } catch (err) { toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }); setSaving(false); }
  };

  const selectedCount = parsedExps.filter(e => e.selected).length;

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) reset(); }}>
      <DialogTrigger asChild><Button className="gap-2"><Upload className="w-4 h-4" /> Importer un CV</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Importer votre CV</DialogTitle></DialogHeader>

        {step === "input" && (
          <div className="space-y-4 py-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-sm">Deposez votre CV ici ou cliquez</p>
              <p className="text-xs text-muted-foreground mt-1">PDF uniquement</p>
            </div>
            <div className="flex items-center gap-3"><div className="flex-1 h-px bg-border" /><span className="text-xs text-muted-foreground">ou collez le texte</span><div className="flex-1 h-px bg-border" /></div>
            <Textarea value={rawText} onChange={e => setRawText(e.target.value)} placeholder="Collez le contenu de votre CV ou profil LinkedIn ici..." className="h-32 text-sm" />
            <DialogFooter><Button onClick={handleTextSubmit} disabled={!rawText.trim()}>Analyser</Button></DialogFooter>
          </div>
        )}

        {step === "loading" && (
          <div className="py-12 text-center space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="font-medium">Analyse en cours...</p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{parsedExps.length} experience{parsedExps.length > 1 ? "s" : ""} trouvee{parsedExps.length > 1 ? "s" : ""}. Decochez celles que vous ne voulez pas.</p>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {parsedExps.map((exp, idx) => (
                <div key={idx} onClick={() => toggleExp(idx)} className={`p-4 rounded-lg border cursor-pointer transition-all ${exp.selected ? "border-primary/50 bg-primary/5" : "border-border opacity-50"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 shrink-0 ${exp.selected ? "bg-primary border-primary" : "border-border"}`}>
                      {exp.selected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{exp.title}</div>
                      <div className="text-sm text-muted-foreground">{exp.company}</div>
                      {exp.startDate && <div className="text-xs text-muted-foreground mt-1">{exp.startDate} - {exp.endDate || "Present"}</div>}
                      {exp.bullets && exp.bullets.length > 0 && (
                        <div className="mt-2 space-y-1">{exp.bullets.map((b, i) => <div key={i} className="text-xs text-foreground/60 pl-3 border-l-2 border-border">{b}</div>)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => { setStep("input"); setParsedExps([]); }}>Retour</Button>
              <Button onClick={handleSaveAll} disabled={saving || selectedCount === 0}>
                {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Import...</> : `Importer ${selectedCount} experience${selectedCount > 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FORMATIONS SECTION
   ══════════════════════════════════════════════════════════════════ */
function FormationsSection() {
  const [formations, setFormations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [school, setSchool] = useState("");
  const [degree, setDegree] = useState("");
  const [year, setYear] = useState("");
  const { toast } = useToast();

  const fetchFormations = async () => {
    try {
      const res = await fetch("/api/formations", { credentials: "include" });
      if (res.ok) setFormations(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchFormations(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school.trim() || !degree.trim()) return;
    try {
      await fetch("/api/formations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school: school.trim(), degree: degree.trim(), year: year.trim() || null }),
        credentials: "include",
      });
      setSchool(""); setDegree(""); setYear(""); setAddOpen(false);
      fetchFormations();
      toast({ title: "Formation ajoutee" });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/formations/${id}`, { method: "DELETE", credentials: "include" });
    fetchFormations();
  };

  if (loading) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <GraduationCap className="w-3.5 h-3.5" /> Formation
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle>Ajouter une formation</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 py-4">
              <div className="space-y-2"><Label>Ecole</Label><Input required value={school} onChange={e => setSchool(e.target.value)} placeholder="Web School Factory" /></div>
              <div className="space-y-2"><Label>Diplome</Label><Input required value={degree} onChange={e => setDegree(e.target.value)} placeholder="Master en Digital Design" /></div>
              <div className="space-y-2"><Label>Annee</Label><Input value={year} onChange={e => setYear(e.target.value)} placeholder="2019" /></div>
              <DialogFooter><Button type="submit">Ajouter</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {formations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune formation ajoutee.</p>
      ) : (
        <div className="space-y-2">
          {formations.map((f: any) => (
            <div key={f.id} className="group flex items-center justify-between p-3 bg-card rounded-lg border border-border/50">
              <div>
                <p className="text-sm font-medium">{f.degree}</p>
                <p className="text-xs text-muted-foreground">{f.school}{f.year ? ` · ${f.year}` : ""}</p>
              </div>
              <button onClick={() => handleDelete(f.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LANGUAGES SECTION
   ══════════════════════════════════════════════════════════════════ */
function LanguagesSection() {
  const [langs, setLangs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const { toast } = useToast();

  const LANG_SUGGESTIONS = ["Francais", "Anglais", "Espagnol", "Allemand", "Italien", "Portugais", "Chinois", "Arabe", "Japonais"];
  const LEVELS = ["Langue maternelle", "Courant (C1)", "Professionnel (B2)", "Intermediaire (B1)", "Scolaire", "Notions"];

  const fetchLangs = async () => {
    try {
      const res = await fetch("/api/languages", { credentials: "include" });
      if (res.ok) setLangs(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchLangs(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      await fetch("/api/languages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), level: level || null }),
        credentials: "include",
      });
      setName(""); setLevel(""); setAddOpen(false);
      fetchLangs();
      toast({ title: "Langue ajoutee" });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/languages/${id}`, { method: "DELETE", credentials: "include" });
    fetchLangs();
  };

  if (loading) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Globe className="w-3.5 h-3.5" /> Langues
        </h2>
        <Dialog open={addOpen} onOpenChange={(val) => { setAddOpen(val); if (!val) { setName(""); setLevel(""); } }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader><DialogTitle>Ajouter une langue</DialogTitle></DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label>Langue</Label>
                <div className="flex flex-wrap gap-2">
                  {LANG_SUGGESTIONS.map(l => (
                    <button key={l} type="button" onClick={() => setName(name === l ? "" : l)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${name === l ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Autre langue..." className="mt-2 h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Niveau</Label>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map(l => (
                    <button key={l} type="button" onClick={() => setLevel(level === l ? "" : l)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${level === l ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter><Button onClick={handleAdd} disabled={!name.trim()}>Ajouter</Button></DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {langs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune langue ajoutee.</p>
      ) : (
        <div className="space-y-2">
          {langs.map((l: any) => (
            <div key={l.id} className="group flex items-center justify-between p-3 bg-card rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">{l.name}</span>
                {l.level && <span className="text-xs text-muted-foreground">{l.level}</span>}
              </div>
              <button onClick={() => handleDelete(l.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
