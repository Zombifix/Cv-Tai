import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { useExperiences, useCreateExperience, useUpdateExperience, useDeleteExperience } from "@/hooks/use-experiences";
import { useBullets, useCreateBullet, useUpdateBullet, useDeleteBullet } from "@/hooks/use-bullets";
import { useSkills, useCreateSkill, useUpdateSkill, useDeleteSkill } from "@/hooks/use-skills";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Building, Calendar, Pencil, RefreshCw, Briefcase, Zap, Upload, Sparkles, Check, X, MessageSquare, PenLine, Lightbulb, Search, GraduationCap, Globe, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Experience, Bullet } from "@shared/schema";

/* ══════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════ */
interface Gap { id: string; dimension: string; question: string; priority: number; }

function getDepthInfo(bulletCount: number) {
  if (bulletCount === 0) return { label: "A explorer", variant: "secondary" as const, dots: 0 };
  if (bulletCount <= 2) return { label: "En surface", variant: "outline" as const, dots: 1 };
  if (bulletCount <= 5) return { label: "Approfondie", variant: "outline" as const, dots: 3 };
  return { label: "Riche", variant: "default" as const, dots: 5 };
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
  const [roleCheckOpen, setRoleCheckOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState("");
  const [roleResult, setRoleResult] = useState<any>(null);
  const [roleChecking, setRoleChecking] = useState(false);

  useEffect(() => {
    if (profileLoaded) {
      setProfileDraft({ name: profile.name || "", title: profile.title || "", summary: profile.summary || "" });
      setRoleTarget(profile.targetRole || "");
    }
  }, [profileLoaded]);

  const handleSaveProfile = () => {
    saveProfile(profileDraft);
    setEditingProfile(false);
  };

  const handleCheckRole = async () => {
    if (!roleTarget.trim()) return;
    setRoleChecking(true);
    saveProfile({ targetRole: roleTarget.trim() });
    try {
      const res = await fetch("/api/profile/check-role", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleTarget.trim() }), credentials: "include",
      });
      const data = await res.json();
      setRoleResult(data);
    } catch { setRoleResult(null); }
    finally { setRoleChecking(false); }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-10 max-w-4xl">

        {/* ── PROFILE HEADER ── */}
        <div className="border-b border-border/50 pb-6">
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
            <div className="group cursor-pointer" onClick={() => setEditingProfile(true)}>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{profile.name || "Votre nom"}</h1>
                  <p className="text-base text-muted-foreground mt-0.5">{profile.title || "Votre poste"}</p>
                  {profile.summary && <p className="text-sm text-muted-foreground/70 mt-1">{profile.summary}</p>}
                </div>
                <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
              </div>
            </div>
          )}

          {/* Role target — compact */}
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              <Input value={roleTarget} onChange={e => setRoleTarget(e.target.value)}
                placeholder="Role vise (ex: Lead Product Designer)"
                className="h-8 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent flex-1"
                onKeyDown={e => { if (e.key === "Enter") handleCheckRole(); }} />
              {roleTarget.trim() && (
                <Button variant="ghost" size="sm" onClick={handleCheckRole} disabled={roleChecking} className="h-7 text-xs">
                  {roleChecking ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Analyser"}
                </Button>
              )}
            </div>

            {/* Role check result — narrative */}
            {roleResult && (
              <div className="mt-3 p-4 bg-muted/30 rounded-lg border border-border/50 animate-in fade-in-50 space-y-3">
                <p className="text-sm text-foreground leading-relaxed">{roleResult.summary}</p>
                {roleResult.dimensions?.length > 0 && (
                  <div className="space-y-1.5">
                    {roleResult.dimensions.map((dim: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${dim.status === "fort" ? "bg-green-500" : dim.status === "correct" ? "bg-yellow-500" : dim.status === "leger" ? "bg-orange-500" : "bg-red-400"}`} />
                        <span className="text-muted-foreground w-36 truncate">{dim.name}</span>
                        <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-foreground/30" style={{ width: `${dim.score}%` }} />
                        </div>
                        <span className="text-muted-foreground w-10 text-right">{dim.bullets || 0}b</span>
                      </div>
                    ))}
                  </div>
                )}
                {roleResult.dimensions?.filter((d: any) => d.tip).map((dim: any, i: number) => (
                  <div key={i} className="text-xs bg-background p-2.5 rounded border border-border/50">
                    <span className="font-medium text-foreground">{dim.name} :</span>{" "}
                    <span className="text-muted-foreground">{dim.tip}</span>
                  </div>
                ))}
                <button onClick={() => setRoleResult(null)} className="text-xs text-muted-foreground hover:text-foreground">Fermer</button>
              </div>
            )}
          </div>
        </div>

        {/* ── EXPERIENCES ── */}
        <ExperiencesSection />

        {/* ── SKILLS ── */}
        <SkillsSection />

        {/* ── FORMATIONS ── */}
        <FormationsSection />

        {/* ── LANGUAGES ── */}
        <LanguagesSection />

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
          {experiences.map(exp => (
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

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    try {
      await updateBullet.mutateAsync({ id: editingId, experienceId: experience.id, text: editText.trim() });
      setEditingId(null);
      setEditText("");
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

  return (
    <AccordionItem value={experience.id} className="bg-card border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center pr-4">
        <AccordionTrigger className="flex-1 hover:no-underline py-4 px-5 data-[state=open]:border-b data-[state=open]:border-border/50">
          <div className="flex flex-col items-start text-left gap-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building className="w-3 h-3" /> {experience.company}
              {experience.contractType && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{experience.contractType}</Badge>}
              <span className="opacity-40">|</span>
              <Calendar className="w-3 h-3" />
              {experience.startDate ? format(new Date(experience.startDate), "MMM yyyy") : "N/A"} - {experience.endDate ? format(new Date(experience.endDate), "MMM yyyy") : "Present"}
            </div>
            <span className="font-bold text-base">{experience.title}</span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={depth.variant} className="text-[10px]">{depth.label}</Badge>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < depth.dots ? 'bg-primary' : 'bg-border'}`} />
                ))}
              </div>
              {bulletCount > 0 && <span className="text-[10px] text-muted-foreground">{bulletCount} bullet{bulletCount > 1 ? "s" : ""}</span>}
            </div>
          </div>
        </AccordionTrigger>
        <div className="flex items-center gap-1 pl-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onEnrich}>
            <Sparkles className="w-3.5 h-3.5" /> Enrichir
          </Button>
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
              {bullet.tags && bullet.tags.length > 0 && (
                <div className="flex gap-1 mb-1.5">
                  {bullet.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">{tag}</Badge>
                  ))}
                </div>
              )}
              {editingId === bullet.id ? (
                <div className="space-y-2">
                  <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="text-sm resize-none min-h-[50px]" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={!editText.trim()} className="h-7 text-xs">Enregistrer</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs">Annuler</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground/90 leading-relaxed pr-14">{bullet.text}</p>
              )}
              {editingId !== bullet.id && (
                <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => { setEditingId(bullet.id); setEditText(bullet.text); }} className="text-muted-foreground hover:text-primary p-0.5"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => handleDelete(bullet.id)} className="text-muted-foreground hover:text-destructive p-0.5"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ENRICHMENT PANEL — gap detection + micro-thread
   ══════════════════════════════════════════════════════════════════ */
function EnrichmentPanel({ experience }: { experience: Experience }) {
  const { data: bullets } = useBullets(experience.id);
  const createBullet = useCreateBullet();
  const { toast } = useToast();

  // Gap detection
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [gapsLoading, setGapsLoading] = useState(false);

  // Micro-thread
  const [activeGap, setActiveGap] = useState<Gap | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");
  const [previousAnswers, setPreviousAnswers] = useState<string[]>([]);
  const [currentBullet, setCurrentBullet] = useState<string | null>(null);
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Free add
  const [freeMode, setFreeMode] = useState(false);
  const [freeText, setFreeText] = useState("");

  const answerRef = useRef<HTMLTextAreaElement>(null);

  // Fetch gaps
  const fetchGaps = async () => {
    setGapsLoading(true);
    try {
      const res = await fetch(`/api/experiences/${experience.id}/detect-gaps`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setGaps(Array.isArray(data.gaps) ? data.gaps : []);
      } else { setGaps([]); }
    } catch { setGaps([]); }
    finally { setGapsLoading(false); }
  };

  useEffect(() => { fetchGaps(); }, [experience.id, bullets?.length]);
  useEffect(() => { if ((activeGap || followUp) && answerRef.current) answerRef.current.focus(); }, [activeGap, followUp]);

  // Submit answer (or follow-up answer)
  const handleSubmitAnswer = async () => {
    if (!answerDraft.trim()) return;
    setProcessing(true);

    const allPrevious = [...previousAnswers, answerDraft.trim()];

    try {
      const res = await fetch(`/api/experiences/${experience.id}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dimension: activeGap?.dimension || "general",
          question: followUp || activeGap?.question || "ajout libre",
          answer: answerDraft.trim(),
          previousAnswers: previousAnswers,
        }),
        credentials: "include",
      });
      const data = await res.json();

      setCurrentBullet(data.bullet || answerDraft.trim());
      setCurrentTags(data.tags || []);
      setPreviousAnswers(allPrevious);
      setAnswerDraft("");

      if (data.followUp && !data.isComplete) {
        setFollowUp(data.followUp);
      } else {
        setFollowUp(null);
      }
    } catch {
      setCurrentBullet(answerDraft.trim());
      setFollowUp(null);
    } finally {
      setProcessing(false);
    }
  };

  // Accept and save bullet
  const handleAcceptBullet = async () => {
    if (!currentBullet) return;
    try {
      await createBullet.mutateAsync({
        experienceId: experience.id,
        text: currentBullet.trim(),
        tags: currentTags,
      });
      toast({ title: "Bullet CV enregistre" });
      resetThread();
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  // Reset micro-thread
  const resetThread = () => {
    setActiveGap(null);
    setAnswerDraft("");
    setPreviousAnswers([]);
    setCurrentBullet(null);
    setCurrentTags([]);
    setFollowUp(null);
    setFreeMode(false);
    setFreeText("");
  };

  // Free add with enrichment
  const handleFreeSubmit = async () => {
    if (!freeText.trim()) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/experiences/${experience.id}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimension: "libre", question: "ajout libre", answer: freeText.trim(), previousAnswers: [] }),
        credentials: "include",
      });
      const data = await res.json();
      setCurrentBullet(data.bullet || freeText.trim());
      setCurrentTags(data.tags || ["libre"]);
      setFreeText("");
      setActiveGap({ id: "free", dimension: "libre", question: "Ajout libre", priority: 0 });
    } catch {
      setCurrentBullet(freeText.trim());
      setCurrentTags(["libre"]);
    } finally { setProcessing(false); }
  };

  const isInThread = !!activeGap;

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
      </SheetHeader>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* Current thread — progressive bullet building */}
        {isInThread && currentBullet && (
          <div className="space-y-3 animate-in fade-in-50">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bullet en construction</p>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <Textarea
                value={currentBullet}
                onChange={e => setCurrentBullet(e.target.value)}
                className="text-sm resize-none min-h-[40px] border-0 p-0 focus-visible:ring-0 bg-transparent font-medium"
              />
              {currentTags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {currentTags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
            {/* Previous answers */}
            {previousAnswers.length > 0 && (
              <div className="space-y-1">
                {previousAnswers.map((a, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-3 border-l-2 border-border">{a}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isInThread && !freeMode && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">Analyse des lacunes</p>
            <p className="text-xs text-muted-foreground">
              {gapsLoading ? "Analyse en cours..." : gaps.length > 0 ? `${gaps.length} dimension${gaps.length > 1 ? "s" : ""} a approfondir` : "Cette experience est bien couverte !"}
            </p>
          </div>
        )}
      </div>

      {/* Bottom interaction zone */}
      <div className="border-t border-border/50 bg-muted/20 p-5 space-y-3 shrink-0">

        {/* Follow-up question in micro-thread */}
        {isInThread && followUp && !processing && (
          <div className="space-y-2.5 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
            <p className="text-sm font-medium text-foreground leading-snug">{followUp}</p>
            <div className="flex gap-2">
              <Textarea ref={answerRef} value={answerDraft} onChange={e => setAnswerDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitAnswer(); } }}
                placeholder="Creuse un peu..." className="min-h-[50px] text-sm resize-none" />
              <div className="flex flex-col gap-1.5 justify-end">
                <Button size="sm" onClick={handleSubmitAnswer} disabled={!answerDraft.trim()} className="h-9 px-3">OK</Button>
                <Button variant="ghost" size="sm" onClick={handleAcceptBullet} className="h-7 text-xs text-muted-foreground">Passer</Button>
              </div>
            </div>
          </div>
        )}

        {/* Accept/reject proposed bullet */}
        {isInThread && !followUp && currentBullet && !processing && (
          <div className="flex gap-2 animate-in fade-in-50">
            <Button size="sm" onClick={handleAcceptBullet} disabled={createBullet.isPending} className="flex-1 h-9">
              {createBullet.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
              Valider ce bullet
            </Button>
            <Button size="sm" variant="outline" onClick={resetThread} className="h-9">Annuler</Button>
          </div>
        )}

        {/* Processing indicator */}
        {processing && (
          <div className="flex items-center justify-center py-3 gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" /> Reformulation en cours...
          </div>
        )}

        {/* Initial answer to gap question */}
        {isInThread && !currentBullet && !followUp && !processing && (
          <div className="space-y-2.5 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
            <p className="text-sm font-medium text-foreground leading-snug">{activeGap?.question}</p>
            <div className="flex gap-2">
              <Textarea ref={answerRef} value={answerDraft} onChange={e => setAnswerDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitAnswer(); } }}
                placeholder="Reponds simplement, l'IA reformulera..." className="min-h-[50px] text-sm resize-none" />
              <div className="flex flex-col gap-1.5 justify-end">
                <Button size="sm" onClick={handleSubmitAnswer} disabled={!answerDraft.trim()} className="h-9 px-3">OK</Button>
                <Button variant="ghost" size="sm" onClick={resetThread} className="h-7 text-xs text-muted-foreground">Annuler</Button>
              </div>
            </div>
          </div>
        )}

        {/* Free add input */}
        {freeMode && !isInThread && (
          <div className="space-y-2.5 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <PenLine className="w-4 h-4 text-primary" /> Ajout libre
            </p>
            <div className="flex gap-2">
              <Textarea value={freeText} onChange={e => setFreeText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleFreeSubmit(); } }}
                placeholder="Ce que tu veux ajouter..." className="min-h-[50px] text-sm resize-none" />
              <div className="flex flex-col gap-1.5 justify-end">
                <Button size="sm" onClick={handleFreeSubmit} disabled={!freeText.trim() || processing} className="h-9 px-3">
                  {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "OK"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setFreeMode(false)} className="h-7 text-xs text-muted-foreground">Annuler</Button>
              </div>
            </div>
          </div>
        )}

        {/* Gap questions list */}
        {!isInThread && !freeMode && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5" />
                {gapsLoading ? "Analyse..." : gaps.length > 0 ? "Lacunes detectees" : "Rien a ajouter"}
              </p>
              {!gapsLoading && (
                <button onClick={fetchGaps} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Relancer
                </button>
              )}
            </div>
            {gapsLoading ? (
              <div className="flex items-center justify-center py-3"><RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : (
              gaps.map((gap) => (
                <button key={gap.id} onClick={() => { setActiveGap(gap); setAnswerDraft(""); setPreviousAnswers([]); setCurrentBullet(null); setFollowUp(null); }}
                  className="w-full text-left text-sm p-3 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all leading-snug">
                  <span className="text-[10px] font-semibold uppercase text-primary mr-2">{gap.dimension}</span>
                  {gap.question}
                </button>
              ))
            )}
          </div>
        )}

        {/* Free add button */}
        {!freeMode && !isInThread && (
          <button onClick={() => setFreeMode(true)}
            className="w-full text-sm p-2.5 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2">
            <PenLine className="w-3.5 h-3.5" /> Ajouter librement un element
          </button>
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

  // Fix: use useEffect for pre-filling instead of useState side-effect
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
    } else if (open && !experience) {
      setFormData({ title: "", company: "", contractType: "", startDate: "", endDate: "", description: "" });
    }
  }, [open, experience]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (experience) {
        await updateExp.mutateAsync({ id: experience.id, ...formData });
        toast({ title: "Experience mise a jour" });
      } else {
        await createExp.mutateAsync(formData);
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
            <div className="space-y-2"><Label>Date fin</Label><Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} /></div>
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

  if (isLoading) return <div className="h-40 flex items-center justify-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-accent" /> Competences</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExtract} disabled={extracting} className="gap-2">
            {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {extracting ? "Analyse..." : "Extraire auto"}
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Ajouter</Button>
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

      {/* Skills grouped by category */}
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-5">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground space-y-3">
            <p>Aucune competence.</p>
            <p className="text-xs">Cliquez "Extraire auto" pour detecter vos competences depuis vos experiences.</p>
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
          <p className="text-sm text-muted-foreground">Decochez les competences qui ne vous correspondent pas.</p>
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

  const fetchLangs = async () => {
    try {
      const res = await fetch("/api/languages", { credentials: "include" });
      if (res.ok) setLangs(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchLangs(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await fetch("/api/languages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), level: level.trim() || null }),
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
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle>Ajouter une langue</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 py-4">
              <div className="space-y-2"><Label>Langue</Label><Input required value={name} onChange={e => setName(e.target.value)} placeholder="Anglais" /></div>
              <div className="space-y-2">
                <Label>Niveau</Label>
                <div className="flex gap-2">
                  {["Langue maternelle", "Courant (C1)", "Professionnel (B2)", "Intermediaire (B1)", "Debutant"].map(l => (
                    <button key={l} type="button" onClick={() => setLevel(level === l ? "" : l)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${level === l ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter><Button type="submit">Ajouter</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {langs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune langue ajoutee.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {langs.map((l: any) => (
            <div key={l.id} className="group flex items-center gap-2 px-4 py-2 bg-card rounded-full border border-border/50">
              <span className="font-medium text-sm">{l.name}</span>
              {l.level && <span className="text-xs text-muted-foreground">{l.level}</span>}
              <button onClick={() => handleDelete(l.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
