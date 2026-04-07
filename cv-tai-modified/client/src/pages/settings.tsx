import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Settings as SettingsIcon, Trash2, RefreshCw, Brain, AlertTriangle, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importData, setImportData] = useState<any>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/settings/export", { credentials: "include" });
      if (!res.ok) throw new Error("Echec de l'export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cv-tai-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export termine", description: "Le fichier JSON a ete telecharge." });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed.experiences && !parsed.profile) {
          toast({ title: "Fichier invalide", description: "Ce fichier ne ressemble pas a un export cv-tai.", variant: "destructive" });
          return;
        }
        setImportData(parsed);
        setImportConfirmOpen(true);
      } catch {
        toast({ title: "Erreur", description: "Impossible de lire ce fichier JSON.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportConfirm = async () => {
    if (!importData) return;
    setImporting(true);
    try {
      const res = await fetch("/api/settings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(importData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Echec de l'import");
      }
      const data = await res.json();
      toast({ title: "Import termine", description: `${data.experiences} experience(s), ${data.bullets} bullet(s), ${data.skills} competence(s) restaure(s).` });
      setImportConfirmOpen(false);
      setImportData(null);
      window.location.href = "/library";
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleReset = async () => {
    if (resetConfirm !== "SUPPRIMER") return;
    setResetting(true);
    try {
      const res = await fetch("/api/settings/reset", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Echec de la reinitialisation");
      toast({ title: "Donnees reinitialises", description: "Toutes les donnees ont ete supprimees." });
      setResetOpen(false);
      setResetConfirm("");
      // Reload to clear all cached state
      window.location.href = "/library";
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" /> Parametres
          </h1>
          <p className="text-muted-foreground mt-1">Configuration de l'application.</p>
        </div>

        {/* ── LLM Configuration ── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Modele IA</h3>
                <p className="text-sm text-muted-foreground">Configuration du moteur d'intelligence artificielle.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Provider actuel</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <span className="text-sm font-medium">OpenAI — gpt-4o-mini</span>
                  <span className="ml-auto text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Actif</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Le changement de provider (OpenAI, Anthropic, Mistral...) sera disponible dans une prochaine version.
                La cle API est configuree dans les variables d'environnement Railway.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Export ── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Exporter mes donnees</h3>
                <p className="text-sm text-muted-foreground">Telecharge toutes tes donnees (profil, experiences, bullets, skills, formations, langues, historique) au format JSON.</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
              Telecharger mes donnees
            </Button>
          </CardContent>
        </Card>

        {/* ── Import ── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Restaurer depuis un export</h3>
                <p className="text-sm text-muted-foreground">Reimporte un fichier JSON cv-tai. Remplace les experiences, bullets, competences, formations et langues existantes.</p>
              </div>
            </div>
            <label htmlFor="import-file-input">
              <Button variant="outline" asChild disabled={importing}>
                <span>
                  {importing ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  Importer un fichier JSON
                </span>
              </Button>
            </label>
            <input
              id="import-file-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFileSelect}
            />
          </CardContent>
        </Card>

        {/* Import Confirmation Dialog */}
        <Dialog open={importConfirmOpen} onOpenChange={(val) => { if (!val) { setImportConfirmOpen(false); setImportData(null); } }}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" /> Confirmer l'import
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4 text-sm">
              {importData && (
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-1 text-xs font-mono">
                  <p>Profil : {importData.profile?.name || "—"}</p>
                  <p>Experiences : {importData.experiences?.length ?? 0}</p>
                  <p>Competences : {importData.skills?.length ?? 0}</p>
                  <p>Formations : {importData.formations?.length ?? 0}</p>
                  <p>Langues : {importData.languages?.length ?? 0}</p>
                  <p className="text-muted-foreground">Exporte le : {importData.exportedAt ? new Date(importData.exportedAt).toLocaleDateString("fr-FR") : "—"}</p>
                </div>
              )}
              <p className="text-muted-foreground">
                Tes experiences, bullets et competences actuelles seront <strong>remplacees</strong> par celles du fichier. L'historique de tailoring est conserve.
              </p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => { setImportConfirmOpen(false); setImportData(null); }}>Annuler</Button>
              <Button onClick={handleImportConfirm} disabled={importing}>
                {importing ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Confirmer l'import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Danger Zone ── */}
        <Card className="border-destructive/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">Zone dangereuse</h3>
                <p className="text-sm text-muted-foreground">Actions irreversibles.</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
              <div>
                <p className="text-sm font-medium">Reinitialiser toutes les donnees</p>
                <p className="text-xs text-muted-foreground mt-0.5">Supprime profil, experiences, bullets, skills, formations, langues et historique.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setResetOpen(true)}>
                <Trash2 className="w-4 h-4 mr-1" /> Reinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reset Confirmation Dialog */}
        <Dialog open={resetOpen} onOpenChange={(val) => { setResetOpen(val); setResetConfirm(""); }}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" /> Reinitialiser les donnees
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Cette action est <strong>irreversible</strong>. Toutes tes donnees seront supprimees :
                profil, experiences, bullets enrichis, competences, formations, langues, et historique de tailoring.
              </p>
              <div className="space-y-2">
                <Label className="text-xs">Tape <strong>SUPPRIMER</strong> pour confirmer</Label>
                <Input
                  value={resetConfirm}
                  onChange={e => setResetConfirm(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="font-mono"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setResetOpen(false)}>Annuler</Button>
              <Button variant="destructive" onClick={handleReset} disabled={resetConfirm !== "SUPPRIMER" || resetting}>
                {resetting ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                Tout supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
