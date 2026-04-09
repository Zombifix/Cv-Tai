import { Link } from "wouter";
import { FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-6 animate-fade-up max-w-sm">
        <div className="w-16 h-16 rounded-[20px] bg-muted/60 flex items-center justify-center mx-auto">
          <FileSearch className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <div className="text-6xl font-extrabold tracking-tight text-gradient">404</div>
          <h1 className="text-xl font-bold text-foreground">Page introuvable</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cette page n'existe pas ou a été déplacée.
          </p>
        </div>
        <Link href="/library">
          <Button className="rounded-2xl btn-press shadow-lg shadow-primary/20 gap-2">
            Retour à la bibliothèque
          </Button>
        </Link>
      </div>
    </div>
  );
}
