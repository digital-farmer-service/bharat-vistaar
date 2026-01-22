import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider, useLanguage } from "@/components/LanguageProvider";
import { AudioPlayerProvider } from "@/components/AudioPlayer";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import ErrorPage from "./pages/ErrorPage";
import { useAuth } from "./contexts/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Component to update the document title
const TitleUpdater = () => {
  const { t } = useLanguage();
  
  useEffect(() => {
    document.title = t("appTitle") as string;
  }, [t]);
  
  return null;
};

const App = () => {
  const { isLoading } = useAuth();
  
  // Show loading state while auth is initializing
  if (isLoading) {
    return <div className="bg-foreground/80 flex justify-center items-center h-screen text-background">Loading...</div>;
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <LanguageProvider>
          <TitleUpdater />
          <AudioPlayerProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/error" element={<ErrorPage />} />
                  <Route path="/chat" element={
                    <PrivateRoute>
                      <ChatPage />
                    </PrivateRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AudioPlayerProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
