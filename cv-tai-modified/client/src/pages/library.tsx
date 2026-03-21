import { useState } from "react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Building, Calendar, Pencil, Trash2, Tag, RefreshCw, Briefcase, Zap, Download, Sparkles, AlertCircle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Library() {
  const { toast } = useToast();
  const reEmbed = useReEmbedBullets();

  const handleReEmbed = async () => {
    try {
      const res = await reEmbed.mutateAsync();
      toast({
        title: "Re-embedding Successful",
        description: `Successfully processed ${res.count} bullets.`,
      });
    } catch (err) {
      toast({
        title: "Failed to re-embed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Super-CV Library</h1>
            <p className="text-muted-foreground mt-1">Manage your professional experiences and skills.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleReEmbed} 
            disabled={reEmbed.isPending}
            className="shadow-sm border-border"
          >
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

// --- Experiences Section ---
function ExperiencesSection() {
  const { data: experiences, isLoading } = useExperiences();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<any>(null);
  
  if (isLoading) return <div className="h-40 flex items-center justify-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin" /></div>;

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
        <Accordion type="multiple" className="space-y-4">
          {experiences.map(exp => (
            <AccordionItem key={exp.id} value={exp.id} className="bg-card border rounded-xl shadow-sm overflow-hidden px-1">
              <div className="flex items-center pr-4">
                <AccordionTrigger className="flex-1 hover:no-underline py-4 px-4 data-[state=open]:border-b data-[state=open]:border-border/50">
                  <div className="flex flex-col items-start text-left">
                    <span className="font-bold text-lg">{exp.title}</span>
                    <span className="text-muted-foreground flex items-center gap-2 mt-1">
                      <Building className="w-3.5 h-3.5" /> {exp.company}
                      <span className="mx-1 opacity-50">•</span>
                      <Calendar className="w-3.5 h-3.5" /> {exp.startDate ? format(new Date(exp.startDate), "MMM yyyy") : "N/A"} - {exp.endDate ? format(new Date(exp.endDate), "MMM yyyy") : "Present"}
                    </span>
                  </div>
                </AccordionTrigger>
                <div className="flex items-center gap-2 pl-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setEditingExp(exp); setOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <AccordionContent className="p-0">
                <div className="bg-muted/20 p-4 md:p-6 border-t border-border/50">
                  {exp.description && <p className="text-sm text-foreground/80 mb-6 max-w-3xl">{exp.description}</p>}
                  <BulletsList experienceId={exp.id} />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

function ExperienceDialog({ open, onOpenChange, experience, onClose }: any) {
  const createExp = useCreateExperience();
  const updateExp = useUpdateExperience();
  const deleteExp = useDeleteExperience();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "", company: "", startDate: "", endDate: "", description: ""
  });

  // Sync state on open
  useState(() => {
    if (experience && open) {
      setFormData({
        title: experience.title,
        company: experience.company,
        startDate: experience.startDate || "",
        endDate: experience.endDate || "",
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
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteExp.isPending}>
                Delete
              </Button>
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

// --- Bullets List ---
function BulletsList({ experienceId }: { experienceId: string }) {
  const { data: bullets, isLoading } = useBullets(experienceId);
  const [open, setOpen] = useState(false);
  const [editingBullet, setEditingBullet] = useState<any>(null);

  if (isLoading) return <div className="text-sm text-muted-foreground py-2">Loading bullets...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Tag className="w-3.5 h-3.5" /> Impact Bullets
        </h4>
        <BulletDialog open={open} onOpenChange={setOpen} bullet={editingBullet} experienceId={experienceId} onClose={() => setEditingBullet(null)} />
      </div>

      {!bullets?.length ? (
        <div className="text-sm text-muted-foreground py-4 px-4 bg-background rounded-lg border border-dashed text-center">
          No impact bullets added yet. 
        </div>
      ) : (
        <ul className="space-y-3">
          {bullets.map(b => (
            <li key={b.id} className="group relative flex gap-3 p-4 bg-background rounded-xl border border-border shadow-sm hover:shadow-md transition-all">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p className="text-sm text-foreground/90 pr-10">{b.text}</p>
              
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground bg-background shadow-sm hover:text-foreground" onClick={() => { setEditingBullet(b); setOpen(true); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BulletDialog({ open, onOpenChange, bullet, experienceId, onClose }: any) {
  const createBullet = useCreateBullet();
  const updateBullet = useUpdateBullet();
  const deleteBullet = useDeleteBullet();
  const { toast } = useToast();

  const [text, setText] = useState("");

  useState(() => {
    if (bullet && open) setText(bullet.text);
    else if (open && !bullet) setText("");
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (bullet) {
        await updateBullet.mutateAsync({ id: bullet.id, experienceId, text });
      } else {
        await createBullet.mutateAsync({ experienceId, text });
      }
      onOpenChange(false);
      onClose();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBullet.mutateAsync({ id: bullet.id, experienceId });
      onOpenChange(false);
      onClose();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) onClose(); }}>
      <DialogTrigger asChild>
        {!bullet && <Button variant="secondary" size="sm" className="h-8 text-xs font-medium"><Plus className="w-3 h-3 mr-1"/> Add Bullet</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bullet ? "Edit Bullet" : "Add Bullet"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Bullet Text</Label>
            <Textarea required value={text} onChange={e => setText(e.target.value)} placeholder="Led a team of 5 engineers to deliver..." className="h-32" />
            <p className="text-xs text-muted-foreground mt-1">Focus on action, context, and quantifiable results.</p>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            {bullet ? (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteBullet.isPending}>Delete</Button>
            ) : <div/>}
            <Button type="submit" disabled={createBullet.isPending || updateBullet.isPending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Skills Section ---
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
        // Free text - need LLM parsing
        handleLLMParse();
        return;
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
        title: editData.title,
        company: editData.company,
        startDate: editData.startDate,
        endDate: editData.endDate,
        description: editData.summary || "",
      });

      const bulletsToCreate = [
        ...(editData.responsibilities || []),
        ...(editData.achievements || []),
      ];

      for (const bulletText of bulletsToCreate) {
        await createBullet.mutateAsync({ experienceId: exp.id, text: bulletText });
      }

      toast({ title: "Experience imported successfully!" });
      onOpenChange(false);
      setRawText("");
      setDetectionResult(null);
      setEditData(null);
      setStep("input");
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
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={"Free text, JSON object, or array of experiences...\nExamples:\n- Senior Engineer at TechCorp 2020-2023\n- JSON object with title, company, dates\n- Array with experiences field"}
                className="h-40 text-sm"
              />
              <p className="text-xs text-muted-foreground">Supports free text, single JSON objects, or experiences array format</p>
            </div>
            <DialogFooter>
              <Button onClick={handleDetectFormat} disabled={!rawText.trim()}>
                Parse & Continue
              </Button>
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
                <div
                  key={idx}
                  onClick={() => handleSelectExperience(idx)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedIdx === idx
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="font-semibold">{exp.title}</div>
                      <div className="text-sm text-muted-foreground">{exp.company}</div>
                      {exp.startDate && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {exp.startDate} → {exp.endDate || "Present"}
                        </div>
                      )}
                    </div>
                    {selectedIdx === idx && <Check className="w-5 h-5 text-primary mt-1" />}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep("input")}>Back</Button>
              <Button onClick={() => handleSelectExperience(selectedIdx)}>
                Import Selected
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "edit" && editData && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={editData.title}
                  onChange={e => setEditData({ ...editData, title: e.target.value })}
                  className={!editData.title ? "border-destructive" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Company *</Label>
                <Input
                  value={editData.company}
                  onChange={e => setEditData({ ...editData, company: e.target.value })}
                  className={!editData.company ? "border-destructive" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editData.startDate || ""}
                  onChange={e => setEditData({ ...editData, startDate: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={editData.endDate || ""}
                  onChange={e => setEditData({ ...editData, endDate: e.target.value || undefined })}
                />
              </div>
            </div>
            {editData.summary && (
              <div className="space-y-2">
                <Label>Summary</Label>
                <Textarea
                  value={editData.summary}
                  onChange={e => setEditData({ ...editData, summary: e.target.value })}
                  className="h-16"
                />
              </div>
            )}
            {editData.responsibilities?.length ? (
              <div className="space-y-2">
                <Label>Responsibilities</Label>
                <div className="space-y-2 bg-muted/30 p-3 rounded-lg max-h-24 overflow-y-auto">
                  {editData.responsibilities.map((r, i) => (
                    <div key={i} className="text-sm p-2 bg-background rounded border">{r}</div>
                  ))}
                </div>
              </div>
            ) : null}
            {editData.achievements?.length ? (
              <div className="space-y-2">
                <Label>Achievements</Label>
                <div className="space-y-2 bg-muted/30 p-3 rounded-lg max-h-24 overflow-y-auto">
                  {editData.achievements.map((a, i) => (
                    <div key={i} className="text-sm p-2 bg-background rounded border">{a}</div>
                  ))}
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
