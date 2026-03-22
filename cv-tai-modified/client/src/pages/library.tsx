import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { useExperiences, useCreateExperience, useUpdateExperience, useDeleteExperience } from "@/hooks/use-experiences";
import { useBullets, useCreateBullet, useUpdateBullet, useDeleteBullet } from "@/hooks/use-bullets";
import { useSkills, useCreateSkill, useUpdateSkill, useDeleteSkill } from "@/hooks/use-skills";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Building, Calendar, Pencil, RefreshCw, Briefcase, Zap, Upload, Sparkles, Check, X, MessageSquare, PenLine, Lightbulb, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Experience, Bullet } from "@shared/schema";

/* ══════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════ */
interface Gap {
  id: string;
  dimension: string;
  question: string;
  priority: number;
}

/* ══════════════════════════════════════════════════════════════════
   DEPTH INDICATOR
   ══════════════════════════════════════════════════════════════════ */
function getDepthInfo(bulletCount: number) {
  if (bulletCount === 0) return { label: "A explorer", variant: "secondary" as const, dots: 0 };
  if (bulletCount <= 2) return { label: "En surface", variant: "outline" as const, dots: 1 };
  if (bulletCount <= 5) return { label: "Approfondie", variant: "outline" as const, dots: 3 };
  return { label: "Riche", variant: "default" as const, dots: 5 };
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════ */
export default function Library() {
  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Super-CV Library</h1>
          <p className="text-muted-foreground mt-1">Explorez et enrichissez vos experiences professionnelles.</p>
        </div>

        <Tabs defaultValue="experiences" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="experiences" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Experiences</TabsTrigger>
            <TabsTrigger value="skills" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Skills</TabsTrigger>
          </TabsList>
          <div className="mt-8">
            <TabsContent value="experiences" className="m-0 space-y-6 animate-in fade-in-50 duration-500">
              <ExperiencesSection />
            </TabsContent>
            <TabsContent value="skills" className="m-0 space-y-6 animate-in fade-in-50 duration-500">
              <SkillsSection />
            </TabsContent>
          </div>
        </Tabs>
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

  const [formData, setFormData] = useState({ title: "", company: "", startDate: "", endDate: "", description: "" });

  // Fix: use useEffect for pre-filling instead of useState side-effect
  useEffect(() => {
    if (experience && open) {
      setFormData({
        title: experience.title || "",
        company: experience.company || "",
        startDate: experience.startDate || "",
        endDate: experience.endDate || "",
        description: experience.description || "",
      });
    } else if (open && !experience) {
      setFormData({ title: "", company: "", startDate: "", endDate: "", description: "" });
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
  const [open, setOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<any>(null);

  if (isLoading) return <div className="h-40 flex items-center justify-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-accent" /> Professional Skills</h2>
        <SkillDialog open={open} onOpenChange={setOpen} skill={editingSkill} onClose={() => setEditingSkill(null)} />
      </div>
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        {!skills?.length ? (
          <div className="text-center py-8 text-muted-foreground">Aucune competence ajoutee.</div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {skills.map(skill => (
              <div key={skill.id} onClick={() => { setEditingSkill(skill); setOpen(true); }} className="group cursor-pointer flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-full border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all">
                <span className="font-medium text-sm">{skill.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkillDialog({ open, onOpenChange, skill, onClose }: any) {
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const deleteSkill = useDeleteSkill();
  const { toast } = useToast();
  const [name, setName] = useState("");

  useEffect(() => {
    if (skill && open) setName(skill.name);
    else if (open && !skill) setName("");
  }, [open, skill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (skill) await updateSkill.mutateAsync({ id: skill.id, name });
      else await createSkill.mutateAsync({ name });
      onOpenChange(false); onClose();
    } catch (err) { toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }); }
  };

  const handleDelete = async () => {
    try { await deleteSkill.mutateAsync(skill.id); onOpenChange(false); onClose(); }
    catch (err) { toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) onClose(); }}>
      <DialogTrigger asChild>{!skill && <Button><Plus className="w-4 h-4 mr-2" /> Add Skill</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>{skill ? "Modifier" : "Ajouter une competence"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2"><Label>Nom</Label><Input required value={name} onChange={e => setName(e.target.value)} placeholder="Figma, User Testing, Gestion de projet..." /></div>
          <DialogFooter className="flex justify-between sm:justify-between pt-4">
            {skill ? <Button type="button" variant="destructive" onClick={handleDelete}>Supprimer</Button> : <div />}
            <Button type="submit" disabled={createSkill.isPending || updateSkill.isPending}>Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
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
