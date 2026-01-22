import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { useState } from "react";

interface LanguageOption {
  code: "en" | "hi" | "mr";
  nativeName: string;
  englishName: string;
  selectText: string;
}

export function LanguageSelectionScreen({ onLanguageSelected }: { onLanguageSelected: () => void }) {
  const { setLanguage } = useLanguage();
  const [hoveredLanguage, setHoveredLanguage] = useState<string | null>(null);
  
  const languageOptions: LanguageOption[] = [
    {
      code: "en",
      nativeName: "English",
      englishName: "English",
      selectText: "Select English"
    },
    // {
    //   code: "hi",
    //   nativeName: "हिंदी",
    //   englishName: "Hindi",
    //   selectText: "हिंदी चुनें"
    // },
    {
      code: "mr",
      nativeName: "मराठी",
      englishName: "Marathi",
      selectText: "मराठी निवडा"
    }
  ];
  
  const handleLanguageSelect = (languageCode: "en" | "hi" | "mr") => {
    setLanguage(languageCode);
    onLanguageSelected();
  };
  
  const playAudio = (languageCode: "en" | "hi" | "mr") => {
    const audioFiles: Record<"en" | "hi" | "mr", string> = {
      en: "/en.wav", 
      hi: "/hi.wav",
      mr: "/mr.wav",
    };

    const filePath = audioFiles[languageCode];
    if (filePath) {
      new Audio(filePath).play();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {languageOptions.map((lang) => (
          <div 
            key={lang.code}
            className="relative"
            onMouseEnter={() => setHoveredLanguage(lang.code)}
            onMouseLeave={() => setHoveredLanguage(null)}
          >
            <Button
              variant="outline"
              size="lg"
              className="w-full h-32 flex flex-col items-center justify-center gap-4 text-lg border-2 hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => handleLanguageSelect(lang.code)}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg font-medium text-muted-foreground">{lang.selectText}</span>
                <span className="text-2xl font-semibold">{lang.nativeName}</span>
                <span className="text-sm text-muted-foreground">{lang.englishName !== lang.nativeName ? lang.englishName : ""}</span>
              </div>
            </Button>
            
            {/* Only show hover text on desktop (hidden on mobile) */}
            <div className={`absolute -bottom-8 w-full text-center text-sm transition-opacity duration-300 hidden md:block ${hoveredLanguage === lang.code ? "opacity-100" : "opacity-0"}`}>
              <span className="text-foreground bg-background px-2 py-1 rounded-md shadow-sm">{lang.selectText}</span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-3 -top-3 bg-background shadow-sm border"
              onClick={(e) => {
                e.stopPropagation();
                playAudio(lang.code);
              }}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
