import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { useExperiences, useCreateExperience, useUpdateExperience, useDeleteExperience } from "@/hooks/use-experiences";
import { useBullets, useCreateBullet, useUpdateBullet, useDeleteBullet } from "@/hooks/use-bullets";
import { useSkills, useCreateSkill, useUpdateSkill, useDeleteSkill } from "@/hooks/use-skills";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Plus, Building, Calendar, Pencil, Trash2, Tag, RefreshCw, Briefcase, Zap, Upload, Sparkles, AlertCircle, Check, X, MessageSquare, PenLine, ChevronRight, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Experience, Bullet } from "@shared/schema";

/* ══════════════════════════════════════════════════════════════════
   QUESTIONS ADAPTATIVES — via API Groq
   ══════════════════════════════════════════════════════════════════ */
interface SuggestedQuestion {
  id: string;
  question: string;
  tag: string;
}

const FALLBACK_QUESTIONS: SuggestedQuestion[] = [
  { id: "f1", question: "Quel a été votre plus grand défi dans ce rôle ?", tag: "challenge" },
  { id: "f2", question: "Quel résultat mesurable avez-vous obtenu ?", tag: "metrics" },
  { id: "f3", question: "Qu'avez-vous appris que vous n'auriez pas appris ailleurs ?", tag: "growth" },
];

/* ══════════════════════════════════════════════════════════════════
   DEPTH INDICATOR
   ══════════════════════════════════════════════════════════════════ */
function getDepthInfo(bulletCount: number) {
  if (bulletCount === 0) return { label: "À explorer", variant: "secondary" as const, dots: 0 };
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
          <p className="text-muted-foreground mt-1">Explorez et enrichissez vos expériences professionnelles.</p>
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
   EXPERIENCES SECTION
   - Cards remplacent l'Accordion pour permettre le clic → exploration
   - Sheet latéral pour l'enrichissement
   ══════════════════════════════════════════════════════════════════ */
function ExperiencesSection() {
  const { data: experiences, isLoading } = useExperiences();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<any>(null);
  const [exploringExpId, setExploringExpId] = useState<string | null>(null);

  if (isLoading) return <div className="h-40 flex items-center justify-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin" /></div>;

  const exploringExp = experiences?.find(e => e.id === exploringExpId) || null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" /> Work History
        </h2>
        <div className="flex gap-2">
          <CVImportDialog open={importOpen} onOpenChange={setImportOpen} />
          <ExperienceDialog open={open} onOpenChange={setOpen} experience={editingExp} onClose={() => setEditingExp(null)} />
        </div>
      </div>

      {!experiences?.length ? (
        <Card className="border-dashed border-2 bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">Importez votre CV</h3>
            <p className="text-muted-foreground mt-1 mb-4 max-w-sm">Uploadez un PDF ou collez le texte de votre CV pour pré-remplir vos expériences automatiquement.</p>
            <div className="flex gap-2">
              <Button onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" /> Importer un CV</Button>
              <Button variant="outline" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Ajouter manuellement</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {experiences.map(exp => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              isExploring={exploringExpId === exp.id}
              onExplore={() => setExploringExpId(exp.id)}
              onEdit={() => { setEditingExp(exp); setOpen(true); }}
            />
          ))}
        </div>
      )}

      {/* Exploration Sheet */}
      <Sheet open={!!exploringExp} onOpenChange={(val) => { if (!val) setExploringExpId(null); }}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          {exploringExp && (
            <EnrichmentPanel experience={exploringExp} onClose={() => setExploringExpId(null)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EXPERIENCE CARD — avec indicateur de profondeur
   ══════════════════════════════════════════════════════════════════ */
function ExperienceCard({ experience, isExploring, onExplore, onEdit }: {
  experience: Experience;
  isExploring: boolean;
  onExplore: () => void;
  onEdit: () => void;
}) {
  const { data: bullets } = useBullets(experience.id);
  const bulletCount = bullets?.length || 0;
  const depth = getDepthInfo(bulletCount);

  return (
    <Card className={`transition-all duration-200 hover:shadow-md cursor-pointer group ${isExploring ? 'ring-2 ring-primary shadow-md' : 'hover:border-primary/30'}`}>
      <CardContent className="p-5" onClick={onExplore}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Building className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{experience.company}</span>
              <span className="opacity-40">•</span>
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {experience.startDate ? format(new Date(experience.startDate), "MMM yyyy") : "N/A"} – {experience.endDate ? format(new Date(experience.endDate), "MMM yyyy") : "Present"}
              </span>
            </div>
            <h3 className="font-bold text-lg leading-tight mb-2">{experience.title}</h3>
            {experience.description && (
              <p className="text-sm text-foreground/70 line-clamp-3 whitespace-pre-line">{experience.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              <Badge variant={depth.variant} className="text-xs">
                {depth.label}
              </Badge>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i < depth.dots ? 'bg-primary' : 'bg-border'}`} />
                ))}
              </div>
              {bulletCount > 0 && (
                <span className="text-xs text-muted-foreground">{bulletCount} bullet{bulletCount > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="w-4 h-4" />
            </Button>
            <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ENRICHMENT PANEL (dans le Sheet)
   - Bullets existants en haut (scrollable)
   - Questions adaptatives en bas (fixe)
   - Ajout libre toujours accessible
   ══════════════════════════════════════════════════════════════════ */
function EnrichmentPanel({ experience, onClose }: { experience: Experience; onClose: () => void }) {
  const { data: bullets, isLoading } = useBullets(experience.id);
  const createBullet = useCreateBullet();
  const deleteBullet = useDeleteBullet();
  const { toast } = useToast();

  const [activeQuestion, setActiveQuestion] = useState<SuggestedQuestion | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");
  const [freeMode, setFreeMode] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [questions, setQuestions] = useState<SuggestedQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const freeRef = useRef<HTMLTextAreaElement>(null);

  const existingBullets = bullets || [];

  // Fetch adaptive questions from API (re-fetches when bullets change)
  const fetchQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const res = await fetch(`/api/experiences/${experience.id}/suggest-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(Array.isArray(data.questions) ? data.questions : FALLBACK_QUESTIONS);
      } else {
        setQuestions(FALLBACK_QUESTIONS);
      }
    } catch {
      setQuestions(FALLBACK_QUESTIONS);
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [experience.id, existingBullets.length]);

  useEffect(() => {
    if (activeQuestion && answerRef.current) answerRef.current.focus();
  }, [activeQuestion]);

  useEffect(() => {
    if (freeMode && freeRef.current) freeRef.current.focus();
  }, [freeMode]);

  const handleSubmitAnswer = async () => {
    if (!answerDraft.trim() || !activeQuestion) return;
    try {
      await createBullet.mutateAsync({
        experienceId: experience.id,
        text: answerDraft.trim(),
        tags: [activeQuestion.tag],
      });
      toast({ title: "Réponse enregistrée" });
      setActiveQuestion(null);
      setAnswerDraft("");
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleSubmitFree = async () => {
    if (!freeText.trim()) return;
    try {
      await createBullet.mutateAsync({
        experienceId: experience.id,
        text: freeText.trim(),
        tags: ["free-add"],
      });
      toast({ title: "Élément ajouté" });
      setFreeText("");
      setFreeMode(false);
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteBullet = async (bulletId: string) => {
    try {
      await deleteBullet.mutateAsync({ id: bulletId, experienceId: experience.id });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <SheetHeader className="p-6 pb-4 border-b border-border/50 space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building className="w-3.5 h-3.5" />
          {experience.company}
          {experience.startDate && (
            <>
              <span className="opacity-40">•</span>
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(experience.startDate), "MMM yyyy")} – {experience.endDate ? format(new Date(experience.endDate), "MMM yyyy") : "Present"}
            </>
          )}
        </div>
        <SheetTitle className="text-xl font-bold">{experience.title}</SheetTitle>
        {experience.description && (
          <p className="text-sm text-foreground/70 mt-1 whitespace-pre-line">{experience.description}</p>
        )}
      </SheetHeader>

      {/* Corps scrollable — bullets existants */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
        )}

        {!isLoading && existingBullets.length === 0 && (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Lightbulb className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Aucun enrichissement pour l'instant.<br />
              Choisissez une question ci-dessous ou ajoutez librement.
            </p>
          </div>
        )}

        {existingBullets.map((bullet) => (
          <div key={bullet.id} className="group relative bg-card rounded-lg p-4 border border-border/50 hover:border-border transition-colors">
            {bullet.tags && bullet.tags.length > 0 && (
              <div className="flex gap-1.5 mb-2">
                {bullet.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-sm text-foreground/90 leading-relaxed pr-8">{bullet.text}</p>
            <button
              onClick={() => handleDeleteBullet(bullet.id)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Zone d'interaction bas — toujours visible */}
      <div className="border-t border-border/50 bg-muted/20 p-5 space-y-3 shrink-0">

        {/* Réponse à une question */}
        {activeQuestion && !freeMode && (
          <div className="space-y-2.5 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
            <p className="text-sm font-medium text-foreground leading-snug">{activeQuestion.question}</p>
            <div className="flex gap-2">
              <Textarea
                ref={answerRef}
                value={answerDraft}
                onChange={e => setAnswerDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitAnswer(); } }}
                placeholder="Votre réponse…"
                className="min-h-[72px] text-sm resize-none"
              />
              <div className="flex flex-col gap-1.5 justify-end">
                <Button size="sm" onClick={handleSubmitAnswer} disabled={!answerDraft.trim() || createBullet.isPending} className="h-9 px-3">
                  {createBullet.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "OK"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setActiveQuestion(null); setAnswerDraft(""); }} className="h-7 text-xs text-muted-foreground">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Ajout libre */}
        {freeMode && (
          <div className="space-y-2.5 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <PenLine className="w-4 h-4 text-primary" /> Ajout libre
            </p>
            <div className="flex gap-2">
              <Textarea
                ref={freeRef}
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitFree(); } }}
                placeholder="Certification, compétence, contexte, réalisation… tout ce qui manque."
                className="min-h-[72px] text-sm resize-none"
              />
              <div className="flex flex-col gap-1.5 justify-end">
                <Button size="sm" onClick={handleSubmitFree} disabled={!freeText.trim() || createBullet.isPending} className="h-9 px-3">
                  {createBullet.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Ajouter"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setFreeMode(false); setFreeText(""); }} className="h-7 text-xs text-muted-foreground">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Questions suggérées */}
        {!activeQuestion && !freeMode && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                {questionsLoading ? "Génération des questions…" : questions.length > 0 ? "Questions suggérées" : "Ajoutez librement un élément"}
              </p>
              {!questionsLoading && (
                <button onClick={fetchQuestions} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1" title="Nouvelles questions">
                  <RefreshCw className="w-3 h-3" /> Rafraîchir
                </button>
              )}
            </div>
            {questionsLoading ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              questions.map((q) => (
              <button
                key={q.id}
                onClick={() => { setActiveQuestion(q); setAnswerDraft(""); }}
                className="w-full text-left text-sm p-3 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all leading-snug"
              >
                {q.question}
              </button>
            ))
            )}
          </div>
        )}

        {/* Bouton ajout libre — toujours visible */}
        {!freeMode && (
          <button
            onClick={() => { setFreeMode(true); setActiveQuestion(null); setAnswerDraft(""); }}
            className="w-full text-sm p-2.5 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
          >
            <PenLine className="w-3.5 h-3.5" />
            Ajouter librement un élément
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EXPERIENCE DIALOG (inchangé)
   ══════════════════════════════════════════════════════════════════ */
function ExperienceDialog({ open, onOpenChange, experience, onClose }: any) {
  const createExp = useCreateExperience();
  const updateExp = useUpdateExperience();
  const deleteExp = useDeleteExperience();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "", company: "", startDate: "", endDate: "", description: ""
  });

  useState(() => {
    if (experience && open) {
      setFormData({
        title: experience.title, company: experience.company,
        startDate: experience.startDate || "", endDate: experience.endDate || "",
        description: experience.description || "",
      });
    } else if (open && !experience) {
      setFormData({ title: "", company: "", startDate: "", endDate: "", description: "" });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (experience) {
        await updateExp.mutateAsync({ id: experience.id, ...formData });
        toast({ title: "Experience updated" });
      } else {
        await createExp.mutateAsync(formData);
        toast({ title: "Experience added" });
      }
      onOpenChange(false);
      onClose();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this experience?")) return;
    try {
      await deleteExp.mutateAsync(experience.id);
      toast({ title: "Experience deleted" });
      onOpenChange(false);
      onClose();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) onClose(); }}>
      <DialogTrigger asChild>
        {!experience && <Button><Plus className="w-4 h-4 mr-2" /> Add Experience</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{experience ? "Edit Experience" : "Add Experience"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Software Engineer" />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Tech Corp" />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Brief overview of the role..." className="h-24" />
          </div>
          <DialogFooter className="pt-4 flex justify-between sm:justify-between">
            {experience ? (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteExp.isPending}>Delete</Button>
            ) : <div/>}
            <Button type="submit" disabled={createExp.isPending || updateExp.isPending}>
              {experience ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SKILLS SECTION (inchangé)
   ══════════════════════════════════════════════════════════════════ */
function SkillsSection() {
  const { data: skills, isLoading } = useSkills();
  const [open, setOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<any>(null);

  if (isLoading) return <div className="h-40 flex items-center justify-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent" /> Professional Skills
        </h2>
        <SkillDialog open={open} onOpenChange={setOpen} skill={editingSkill} onClose={() => setEditingSkill(null)} />
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-sm">
        {!skills?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No skills added yet. Let's add some core competencies!
          </div>
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

/* ══════════════════════════════════════════════════════════════════
   SKILL DIALOG (inchangé)
   ══════════════════════════════════════════════════════════════════ */
function SkillDialog({ open, onOpenChange, skill, onClose }: any) {
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const deleteSkill = useDeleteSkill();
  const { toast } = useToast();

  const [name, setName] = useState("");

  useState(() => {
    if (skill && open) { setName(skill.name); }
    else if (open && !skill) { setName(""); }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name };
      if (skill) await updateSkill.mutateAsync({ id: skill.id, ...payload });
      else await createSkill.mutateAsync(payload);
      onOpenChange(false);
      onClose();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSkill.mutateAsync(skill.id);
      onOpenChange(false);
      onClose();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) onClose(); }}>
      <DialogTrigger asChild>
        {!skill && <Button><Plus className="w-4 h-4 mr-2" /> Add Skill</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{skill ? "Edit Skill" : "Add Skill"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Skill Name</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. React, Figma, User Testing" />
          </div>
          <DialogFooter className="flex justify-between sm:justify-between pt-4">
            {skill ? <Button type="button" variant="destructive" onClick={handleDelete}>Delete</Button> : <div/>}
            <Button type="submit" disabled={createSkill.isPending || updateSkill.isPending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SMART IMPORT DIALOG (inchangé)
   ══════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════
   CV IMPORT DIALOG — PDF upload + text paste → multi-experience
   ══════════════════════════════════════════════════════════════════ */
interface ParsedExp {
  title: string;
  company: string;
  startDate?: string;
  endDate?: string | null;
  description?: string;
  bullets?: string[];
  selected?: boolean;
}

function CVImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (val: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"input" | "loading" | "review">("input");
  const [rawText, setRawText] = useState("");
  const [parsedExps, setParsedExps] = useState<ParsedExp[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("input");
    setRawText("");
    setParsedExps([]);
    setSaving(false);
    setDragOver(false);
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Format non supporté", description: "Seuls les fichiers PDF sont acceptés.", variant: "destructive" });
      return;
    }
    setStep("loading");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import/cv", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (!data.experiences?.length) {
        toast({ title: "Aucune expérience trouvée", description: "L'IA n'a pas pu extraire d'expériences de ce document.", variant: "destructive" });
        setStep("input");
        return;
      }
      setParsedExps(data.experiences.map((e: any) => ({ ...e, selected: true })));
      setStep("review");
    } catch (err) {
      toast({ title: "Erreur d'import", description: (err as Error).message, variant: "destructive" });
      setStep("input");
    }
  };

  const handleTextSubmit = async () => {
    if (!rawText.trim()) return;
    setStep("loading");

    try {
      const res = await fetch("/api/import/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (!data.experiences?.length) {
        toast({ title: "Aucune expérience trouvée", description: "L'IA n'a pas pu extraire d'expériences de ce texte.", variant: "destructive" });
        setStep("input");
        return;
      }
      setParsedExps(data.experiences.map((e: any) => ({ ...e, selected: true })));
      setStep("review");
    } catch (err) {
      toast({ title: "Erreur d'import", description: (err as Error).message, variant: "destructive" });
      setStep("input");
    }
  };

  const toggleExp = (idx: number) => {
    setParsedExps(prev => prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e));
  };

  const handleSaveAll = async () => {
    const toSave = parsedExps.filter(e => e.selected);
    if (!toSave.length) return;
    setSaving(true);

    try {
      const res = await fetch("/api/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experiences: toSave }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: `${data.created} expérience${data.created > 1 ? "s" : ""} importée${data.created > 1 ? "s" : ""}` });
      queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
      onOpenChange(false);
      reset();
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
      setSaving(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const selectedCount = parsedExps.filter(e => e.selected).length;

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="w-4 h-4" /> Importer un CV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Importer votre CV
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1: Input */}
        {step === "input" && (
          <div className="space-y-4 py-4">
            {/* PDF Upload zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-sm">Déposez votre CV ici ou cliquez pour parcourir</p>
              <p className="text-xs text-muted-foreground mt-1">PDF uniquement · 10 Mo max</p>
            </div>

            {/* Separator */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">ou collez le texte</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Text paste */}
            <Textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Collez le contenu de votre CV ou profil LinkedIn ici…"
              className="h-32 text-sm"
            />
            <DialogFooter>
              <Button onClick={handleTextSubmit} disabled={!rawText.trim()}>
                Analyser
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 2: Loading */}
        {step === "loading" && (
          <div className="py-12 text-center space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            <div>
              <p className="font-medium">Analyse en cours…</p>
              <p className="text-sm text-muted-foreground mt-1">L'IA extrait vos expériences</p>
            </div>
          </div>
        )}

        {/* STEP 3: Review */}
        {step === "review" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {parsedExps.length} expérience{parsedExps.length > 1 ? "s" : ""} trouvée{parsedExps.length > 1 ? "s" : ""}. Décochez celles que vous ne voulez pas importer.
            </p>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {parsedExps.map((exp, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleExp(idx)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    exp.selected ? "border-primary/50 bg-primary/5" : "border-border opacity-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                      exp.selected ? "bg-primary border-primary" : "border-border"
                    }`}>
                      {exp.selected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{exp.title}</div>
                      <div className="text-sm text-muted-foreground">{exp.company}</div>
                      {exp.startDate && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {exp.startDate} → {exp.endDate || "Présent"}
                        </div>
                      )}
                      {exp.description && (
                        <p className="text-xs text-foreground/70 mt-2">{exp.description}</p>
                      )}
                      {exp.bullets && exp.bullets.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {exp.bullets.map((b, i) => (
                            <div key={i} className="text-xs text-foreground/60 pl-3 border-l-2 border-border">
                              {b}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => { setStep("input"); setParsedExps([]); }}>
                Retour
              </Button>
              <Button onClick={handleSaveAll} disabled={saving || selectedCount === 0}>
                {saving ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Import en cours…</>
                ) : (
                  `Importer ${selectedCount} expérience${selectedCount > 1 ? "s" : ""}`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
