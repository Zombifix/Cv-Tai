import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Library from "./pages/library";
import Tailor from "./pages/tailor";
import Result from "./pages/result";
import History from "./pages/history";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/library" />} />
      <Route path="/library" component={Library} />
      <Route path="/tailor" component={Tailor} />
      <Route path="/history" component={History} />
      <Route path="/results/:id" component={Result} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
