import { Snowflake, Zap, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "@/components/ThemeProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMemo } from "react";

interface EmptyStateScreenProps {
  setInputValue: (value: string) => void;
}

export function EmptyStateScreen({ setInputValue }: EmptyStateScreenProps) {
  const { language, t } = useLanguage();
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  // Get all questions from translations and randomly select 3
  // Memoize to keep same questions until language changes
  const questions = useMemo(() => {
    const allQuestions = t("questions");
    if (Array.isArray(allQuestions)) {
      // Shuffle and take first 3
      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 3);
    }
    return [];
  }, [t]);

  // Capabilities text
  const capabilities = t("capabilities");


  // Limitations/remember text
  const limitations = t("limitations");

  // Section titles - use translation system with proper fallback
  const titles = {
    ask: t("sectionTitleAsk") as string || "Ask",
    capabilities: t("sectionTitleCapabilities") as string || "Capabilities",
    remember: t("sectionTitleRemember") as string || "Remember"
  };
  
  const handleQuestionClick = (question: string) => {
    setInputValue(question);
  };
  
  // Icon colors based on theme
  const askIconColor = theme === "dark" ? "text-primary" : "text-primary";
  const capIconColor = theme === "dark" ? "text-secondary" : "text-secondary";
  const remIconColor = theme === "dark" ? "text-amber-500" : "text-amber-500";
  
  const content = (
    <div className="flex flex-col px-4 py-8 w-full mx-auto animate-fade-in">
      <div className="flex justify-center w-full pb-24 md:pb-28 md:pt-24">
        {/* Ask Section */}
        <div className="flex flex-col items-center max-w-md w-full">
          <div className="flex flex-col items-center mb-4">
            <Snowflake className={`h-8 w-8 mb-2 ${askIconColor}`} />
            <h2 className="text-xl font-semibold">{titles.ask}</h2>
          </div>
          <div className="w-full space-y-3">
            {Array.isArray(questions) && questions.map((question, index) => (
              <div 
                key={index} 
                className="bg-muted px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/10 transition-colors flex items-center justify-center h-auto min-h-[6rem]"
                onClick={() => handleQuestionClick(question)}
              >
                <p className="text-sm md:text-base text-center px-4 py-2">{question}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Capabilities Section */}
        {/* <div className="flex flex-col items-center">
          <div className="flex flex-col items-center mb-4">
            <Zap className={`h-8 w-8 mb-2 ${capIconColor}`} />
            <h2 className="text-xl font-semibold">{titles.capabilities}</h2>
          </div>
          <div className="w-full space-y-3">
            {Array.isArray(capabilities) && capabilities.map((capability, index) => (
              <div key={index} className="bg-muted p-4 rounded-lg h-auto min-h-[6rem]">
                <p className="text-sm md:text-base">{capability}</p>
              </div>
            ))}
          </div>
        </div> */}
        
        {/* Remember Section */}
        {/* <div className="flex flex-col items-center">
          <div className="flex flex-col items-center mb-4">
            <AlertTriangle className={`h-8 w-8 mb-2 ${remIconColor}`} />
            <h2 className="text-xl font-semibold">{titles.remember}</h2>
          </div>
          <div className="w-full space-y-3">
            {Array.isArray(limitations) && limitations.map((limitation, index) => (
              <div key={index} className="bg-muted p-4 rounded-lg h-auto min-h-[6rem]">
                <p className="text-sm md:text-base">{limitation}</p>
              </div>
            ))}
          </div>
        </div> */}
      </div>
    </div>
  );
  
  // On mobile, wrap in ScrollArea for better scrolling
  return isMobile ? (
    <ScrollArea className="h-[calc(100vh-var(--header-height)-var(--input-height))]">
      {content}
    </ScrollArea>
  ) : content;
} 