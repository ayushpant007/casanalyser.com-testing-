import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InAppBrowserGuard } from "@/components/InAppBrowserGuard";
import Home from "@/pages/home";
import Intro from "@/pages/intro";
import ConciseReport from "@/pages/ConciseReport";
import CDSL from "@/pages/cdsl";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Contact from "@/pages/contact";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Intro} />
      <Route path="/app" component={Home} />
      <Route path="/cdsl" component={CDSL} />
      <Route path="/reports/:id/concise" component={ConciseReport} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/contact" component={Contact} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <InAppBrowserGuard />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
