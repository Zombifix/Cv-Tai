import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Settings as SettingsIcon, Trash2, Loader2, Brain, AlertTriangle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/settings/export", { credentials: "include" });
      if (!res.ok) throw new Error("Échec de l'export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cv-tai-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export terminé", description: "Le fichier JSON a été téléchargé." });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleReset = async () => {
    if (resetConfirm !== "SUPPRIMER") return;
    setResetting(true);
    try {
      const res = await fetch("/api/settings/reset", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Échec de la réinitialisation");
      toast({ title: "Données réinitialisées", description: "Toutes les données ont été supprimées." });
      setResetOpen(false);
      setResetConfirm("");
      window.location.href = "/library";
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl flex flex-col gap-8 animate-fade-up">
        {/* Page header */}
        <section className="space-y-2">
          <div className="pill bg-primary/10 text-primary w-fit">
            <SettingsIcon className="h-3 w-3" />
            Paramètres
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Configuration</h1>
          <p className="text-muted-foreground text-sm">Gère ton compte et tes préférences.</p>
        </section>

        {/* AI model */}
        <SettingCard
          icon={<Brain className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          title="Modèle IA"
          description="Configuration du moteur d'intelligence artificielle."
        >
          <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-2xl border border-border/50">
            <span className="text-sm font-semibold">OpenAI — gpt-4o-mini</span>
            <span className="ml-auto pill bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Actif</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Le changement de provider (OpenAI, Anthropic, Mistral...) sera disponible dans une prochaine version.
            La clé API est configurée dans les variables d'environnement Railway.
          </p>
        </SettingCard>

        {/* Export */}
        <SettingCard
          icon={<Download className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          title="Exporter mes données"
          description="Télécharge toutes tes données (profil, expériences, bullets, skills, formations, langues, historique) au format JSON."
        >
          <Button variant="outline" className="rounded-2xl gap-2 btn-press" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Télécharger mes données
          </Button>
        </SettingCard>

        {/* Danger zone */}
        <div className="surface p-6 border-destructive/30 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-destructive/10 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-bold text-destructive">Zone dangereuse</h3>
              <p className="text-sm text-muted-foreground">Actions irréversibles.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-[18px] border border-destructive/20">
            <div>
              <p className="text-sm font-semibold">Réinitialiser toutes les données</p>
              <p className="text-xs text-muted-foreground mt-0.5">Supprime profil, expériences, bullets, skills, formations, langues et historique.</p>
            </div>
            <Button variant="destructive" size="sm" className="rounded-xl btn-press ml-4 flex-shrink-0 gap-1.5" onClick={() => setResetOpen(true)}>
              <Trash2 className="w-4 h-4" /> Réinitialiser
            </Button>
          </div>
        </div>

        {/* Reset confirmation dialog */}
        <Dialog open={resetOpen} onOpenChange={(val) => { setResetOpen(val); setResetConfirm(""); }}>
          <DialogContent className="sm:max-w-[420px] rounded-[24px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" /> Réinitialiser les données
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Cette action est <strong>irréversible</strong>. Toutes tes données seront supprimées :
                profil, expériences, bullets, compétences, formations, langues, et historique de tailoring.
              </p>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Tape <strong>SUPPRIMER</strong> pour confirmer</Label>
                <Input
                  value={resetConfirm}
                  onChange={e => setResetConfirm(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="font-mono rounded-2xl"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setResetOpen(false)}>Annuler</Button>
              <Button variant="destructive" className="rounded-xl btn-press gap-1.5" onClick={handleReset} disabled={resetConfirm !== "SUPPRIMER" || resetting}>
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Tout supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function SettingCard({ icon, iconBg, title, description, children }: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 ${iconBg} rounded-2xl`}>{icon}</div>
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-3 pt-1">{children}</div>
    </div>
  );
}
