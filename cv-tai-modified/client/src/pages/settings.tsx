import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Settings as SettingsIcon, Trash2, RefreshCw, Brain, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

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
                  <span className="text-sm font-medium">Groq — llama-3.3-70b-versatile</span>
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
