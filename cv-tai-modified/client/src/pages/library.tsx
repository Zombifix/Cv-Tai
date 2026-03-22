import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { useExperiences, useCreateExperience, useUpdateExperience, useDeleteExperience } from "@/hooks/use-experiences";
import { useBullets, useCreateBullet, useUpdateBullet, useDeleteBullet, useReEmbedBullets } from "@/hooks/use-bullets";
import { useSkills, useCreateSkill, useUpdateSkill, useDeleteSkill } from "@/hooks/use-skills";
import { useParseExperience } from "@/hooks/use-parse-experience";
import { detectAndParseFormat, type ParsedExperience } from "@/lib/parse-experience-format";
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
import { Plus, Building, Calendar, Pencil, Trash2, Tag, RefreshCw, Briefcase, Zap, Download, Sparkles, AlertCircle, Check, X, MessageSquare, PenLine, ChevronRight, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Experience, Bullet } from "@shared/schema";

/* ══════════════════════════════════════════════════════════════════
   MOTEUR DE QUESTIONS ADAPTATIVES
   En prod → appel LLM via API. Ici → pools contextuels.
   ══════════════════════════════════════════════════════════════════ */
interface SuggestedQuestion {
  id: string;
  question: string;
  tag: string;
}

const QUESTION_POOLS: Record<string, SuggestedQuestion[]> = {
  management: [
    { id: "m1", question: "Combien de personnes managiez-vous directement et indirectement ?", tag: "scope" },
    { id: "m2", question: "Quel a été le conflit le plus difficile dans l'équipe et comment l'avez-vous résolu ?", tag: "conflict-resolution" },
    { id: "m3", question: "Avez-vous mis en place des rituels ou process d'équipe spécifiques ?", tag: "team-rituals" },
    { id: "m4", question: "Un membre de votre équipe a-t-il évolué grâce à votre accompagnement ?", tag: "mentoring" },
  ],
  tech: [
    { id: "t1", question: "Quelle stack technique avez-vous choisie et pourquoi cette décision ?", tag: "tech-stack" },
    { id: "t2", question: "Avez-vous dû convaincre quelqu'un de changer d'approche technique ? Comment ?", tag: "tech-influence" },
    { id: "t3", question: "Quel compromis technique avez-vous dû faire et quel en a été l'impact ?", tag: "tech-tradeoff" },
    { id: "t4", question: "Y a-t-il eu de la dette technique ? Comment l'avez-vous gérée ?", tag: "tech-debt" },
  ],
  project: [
    { id: "p1", question: "Quel était le budget du projet et l'avez-vous respecté ?", tag: "budget" },
    { id: "p2", question: "Quels KPIs avez-vous définis pour mesurer le succès ?", tag: "kpis" },
    { id: "p3", question: "Y a-t-il eu un pivot en cours de route ? Qu'est-ce qui l'a déclenché ?", tag: "pivot" },
    { id: "p4", question: "Qui étaient vos parties prenantes clés et comment gériez-vous leurs attentes ?", tag: "stakeholders" },
  ],
  impact: [
    { id: "i1", question: "Quel résultat chiffré ou mesurable pouvez-vous associer à cette expérience ?", tag: "metrics" },
    { id: "i2", question: "Ce projet a-t-il changé votre façon de travailler ? En quoi ?", tag: "growth" },
    { id: "i3", question: "Avez-vous présenté ce travail devant un CODIR ou des investisseurs ?", tag: "presentation" },
    { id: "i4", question: "Quelle compétence inattendue avez-vous développée grâce à cette expérience ?", tag: "hidden-skill" },
    { id: "i5", question: "Avez-vous formé d'autres personnes sur ce sujet ? Sous quelle forme ?", tag: "teaching" },
  ],
};

function getAdaptiveQuestions(experience: Experience, existingBullets: Bullet[]): SuggestedQuestion[] {
  const text = [experience.title, experience.description, experience.company, ...existingBullets.map(b => b.text)].filter(Boolean).join(" ").toLowerCase();
  const existingTags = existingBullets.flatMap(b => b.tags || []);

  let pool: SuggestedQuestion[] = [];

  if (text.match(/équipe|manager|lead|encadr|direct|pilotage|team|managed|supervised/)) {
    pool.push(...QUESTION_POOLS.management);
  }
  if (text.match(/develop|tech|code|architect|migration|api|stack|micro|infra|cloud|devops|fullstack|backend|frontend|engineer/)) {
    pool.push(...QUESTION_POOLS.tech);
  }
  if (text.match(/projet|project|launch|livr|roadmap|sprint|budget|agile|scrum|deliver/)) {
    pool.push(...QUESTION_POOLS.project);
  }
  pool.push(...QUESTION_POOLS.impact);

  const seen = new Set<string>();
  return pool
    .filter(q => {
      if (seen.has(q.id)) return false;
      if (existingTags.includes(q.tag)) return false;
      seen.add(q.id);
      return true;
    })
    .slice(0, 3);
}

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
  const { toast } = useToast();
  const reEmbed = useReEmbedBullets();

  const handleReEmbed = async () => {
    try {
      const res = await reEmbed.mutateAsync();
      toast({ title: "Re-embedding Successful", description: `Successfully processed ${res.count} bullets.` });
    } catch (err) {
      toast({ title: "Failed to re-embed", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Super-CV Library</h1>
            <p className="text-muted-foreground mt-1">Explorez et enrichissez vos expériences professionnelles.</p>
          </div>
          <Button variant="outline" onClick={handleReEmbed} disabled={reEmbed.isPending} className="shadow-sm border-border">
            <RefreshCw className={`w-4 h-4 mr-2 ${reEmbed.isPending ? 'animate-spin' : ''}`} />
            {reEmbed.isPending ? "Re-embedding..." : "Re-embed All"}
          </Button>
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
          <SmartImportDialog open={importOpen} onOpenChange={setImportOpen} />
          <ExperienceDialog open={open} onOpenChange={setOpen} experience={editingExp} onClose={() => setEditingExp(null)} />
        </div>
      </div>

      {!experiences?.length ? (
        <Card className="border-dashed border-2 bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">No experiences yet</h3>
            <p className="text-muted-foreground mt-1 mb-4 max-w-sm">Add your past roles to start building your Super-CV library.</p>
            <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Experience</Button>
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
              <p className="text-sm text-foreground/70 line-clamp-2">{experience.description}</p>
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
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const freeRef = useRef<HTMLTextAreaElement>(null);

  const existingBullets = bullets || [];
  const questions = getAdaptiveQuestions(experience, existingBullets);

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
          <p className="text-sm text-foreground/70 mt-1">{experience.description}</p>
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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              {questions.length > 0 ? "Questions suggérées" : "Exploration complète — ajoutez librement"}
            </p>
            {questions.map((q) => (
              <button
                key={q.id}
                onClick={() => { setActiveQuestion(q); setAnswerDraft(""); }}
                className="w-full text-left text-sm p-3 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all leading-snug"
              >
                {q.question}
              </button>
            ))}
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
                {skill.level && <span className="w-5 h-5 flex items-center justify-center rounded-full bg-background text-[10px] text-muted-foreground shadow-sm">{skill.level}</span>}
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
  const [level, setLevel] = useState("");

  useState(() => {
    if (skill && open) { setName(skill.name); setLevel(skill.level?.toString() || ""); }
    else if (open && !skill) { setName(""); setLevel(""); }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name, level: level ? parseInt(level) : undefined };
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
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. React, Python, Project Management" />
          </div>
          <div className="space-y-2">
            <Label>Proficiency Level (1-5)</Label>
            <Input type="number" min="1" max="5" value={level} onChange={e => setLevel(e.target.value)} placeholder="Optional" />
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
function SmartImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (val: boolean) => void }) {
  const { toast } = useToast();
  const createExp = useCreateExperience();
  const createBullet = useCreateBullet();
  const parse = useParseExperience();

  const [rawText, setRawText] = useState("");
  const [detectionResult, setDetectionResult] = useState<any>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editData, setEditData] = useState<ParsedExperience | null>(null);
  const [step, setStep] = useState<"input" | "select" | "edit">("input");

  const handleDetectFormat = () => {
    if (!rawText.trim()) {
      toast({ title: "Please paste some content", variant: "destructive" });
      return;
    }
    const result = detectAndParseFormat(rawText);
    setDetectionResult(result);
    if (result.error) {
      toast({ title: "Format issue", description: result.error, variant: "destructive" });
      return;
    }
    if (result.format === "json-multi") {
      setStep("select");
      setSelectedIdx(0);
    } else if (result.format === "json-single" || result.format === "text") {
      if (result.format === "json-single") {
        setEditData(result.data as ParsedExperience);
        setStep("edit");
      } else {
        handleLLMParse();
      }
    }
  };

  const handleLLMParse = async () => {
    try {
      const result = await parse.mutateAsync(rawText);
      setEditData(result);
      setStep("edit");
    } catch (err) {
      toast({ title: "Parse failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleSelectExperience = (idx: number) => {
    const experiences = detectionResult.data as ParsedExperience[];
    setEditData(experiences[idx]);
    setStep("edit");
  };

  const handleSave = async () => {
    if (!editData?.title || !editData?.company) {
      toast({ title: "Title and company are required", variant: "destructive" });
      return;
    }
    try {
      const exp = await createExp.mutateAsync({
        title: editData.title, company: editData.company,
        startDate: editData.startDate, endDate: editData.endDate,
        description: editData.summary || "",
      });
      const bulletsToCreate = [...(editData.responsibilities || []), ...(editData.achievements || [])];
      for (const bulletText of bulletsToCreate) {
        await createBullet.mutateAsync({ experienceId: exp.id, text: bulletText });
      }
      toast({ title: "Experience imported successfully!" });
      onOpenChange(false);
      setRawText(""); setDetectionResult(null); setEditData(null); setStep("input");
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) { setStep("input"); setRawText(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Import from text
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> Smart Import Experience
          </DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Paste experience content</Label>
              <Textarea
                value={rawText} onChange={e => setRawText(e.target.value)}
                placeholder={"Free text, JSON object, or array of experiences...\nExamples:\n- Senior Engineer at TechCorp 2020-2023\n- JSON object with title, company, dates\n- Array with experiences field"}
                className="h-40 text-sm"
              />
              <p className="text-xs text-muted-foreground">Supports free text, single JSON objects, or experiences array format</p>
            </div>
            <DialogFooter>
              <Button onClick={handleDetectFormat} disabled={!rawText.trim()}>Parse & Continue</Button>
            </DialogFooter>
          </div>
        )}

        {step === "select" && detectionResult?.data && Array.isArray(detectionResult.data) && (
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground mb-4">
              Found {detectionResult.data.length} experiences. Select one to import:
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(detectionResult.data as ParsedExperience[]).map((exp, idx) => (
                <div key={idx} onClick={() => handleSelectExperience(idx)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedIdx === idx ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="font-semibold">{exp.title}</div>
                      <div className="text-sm text-muted-foreground">{exp.company}</div>
                      {exp.startDate && <div className="text-xs text-muted-foreground mt-1">{exp.startDate} → {exp.endDate || "Present"}</div>}
                    </div>
                    {selectedIdx === idx && <Check className="w-5 h-5 text-primary mt-1" />}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep("input")}>Back</Button>
              <Button onClick={() => handleSelectExperience(selectedIdx)}>Import Selected</Button>
            </DialogFooter>
          </div>
        )}

        {step === "edit" && editData && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} className={!editData.title ? "border-destructive" : ""} />
              </div>
              <div className="space-y-2">
                <Label>Company *</Label>
                <Input value={editData.company} onChange={e => setEditData({ ...editData, company: e.target.value })} className={!editData.company ? "border-destructive" : ""} />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={editData.startDate || ""} onChange={e => setEditData({ ...editData, startDate: e.target.value || undefined })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={editData.endDate || ""} onChange={e => setEditData({ ...editData, endDate: e.target.value || undefined })} />
              </div>
            </div>
            {editData.summary && (
              <div className="space-y-2">
                <Label>Summary</Label>
                <Textarea value={editData.summary} onChange={e => setEditData({ ...editData, summary: e.target.value })} className="h-16" />
              </div>
            )}
            {editData.responsibilities?.length ? (
              <div className="space-y-2">
                <Label>Responsibilities</Label>
                <div className="space-y-2 bg-muted/30 p-3 rounded-lg max-h-24 overflow-y-auto">
                  {editData.responsibilities.map((r, i) => <div key={i} className="text-sm p-2 bg-background rounded border">{r}</div>)}
                </div>
              </div>
            ) : null}
            {editData.achievements?.length ? (
              <div className="space-y-2">
                <Label>Achievements</Label>
                <div className="space-y-2 bg-muted/30 p-3 rounded-lg max-h-24 overflow-y-auto">
                  {editData.achievements.map((a, i) => <div key={i} className="text-sm p-2 bg-background rounded border">{a}</div>)}
                </div>
              </div>
            ) : null}
            <DialogFooter className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => { setStep("input"); setEditData(null); }}>Back</Button>
              <Button onClick={handleSave} disabled={createExp.isPending || createBullet.isPending || !editData.title || !editData.company}>
                {createExp.isPending ? "Saving..." : "Save Experience"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
