import { Toaster } from "@/components/ui/toaster.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index.tsx";
import EmbedTracker from "./pages/EmbedTracker.tsx";
import NotFound from "./pages/NotFound.tsx";
import PolylineDemo from "./components/PolylineDemo.tsx";
import PolylineUsageExample from "./components/PolylineUsageExample.tsx";
import PolylineAPIDemo from "./components/PolylineAPIDemo.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/embed" element={<EmbedTracker />} />
          <Route path="/polyline-demo" element={<PolylineDemo />} />
          <Route path="/polyline-usage" element={<PolylineUsageExample />} />
          <Route path="/polyline-api" element={<PolylineAPIDemo />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;