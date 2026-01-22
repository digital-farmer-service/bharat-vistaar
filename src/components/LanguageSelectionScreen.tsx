import { useLanguage } from "@/components/LanguageProvider";
import type { Language } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { trackLanguageChange } from "@/lib/google-analytics";

interface LanguageOption {
  code: Language;
  nativeName: string;
  englishName: string;
  selectText: string;
}

export function LanguageSelectionScreen({ onLanguageSelected }: { onLanguageSelected: () => void }) {
  const { setLanguage } = useLanguage();
  
  const languageOptions: LanguageOption[] = [
    {
      code: "en",
      nativeName: "English",
      englishName: "English",
      selectText: "Select English"
    },
    {
      code: "hi",
      nativeName: "हिंदी",
      englishName: "Hindi",
      selectText: "हिंदी चुनें"
    },
    { code: "mr", nativeName: "मराठी", englishName: "Marathi", selectText: "मराठी निवडा" },
    // { code: "bn", nativeName: "বাংলা", englishName: "Bengali", selectText: "বাংলা নির্বাচন করুন" },
    // { code: "ta", nativeName: "தமிழ்", englishName: "Tamil", selectText: "தமிழைத் தேர்ந்தெடுக்கவும்" },
    // { code: "te", nativeName: "తెలుగు", englishName: "Telugu", selectText: "తెలుగు ఎంచుకోండి" },
    // { code: "kn", nativeName: "ಕನ್ನಡ", englishName: "Kannada", selectText: "ಕನ್ನಡ ಆಯ್ಕೆಮಾಡಿ" },
    // { code: "ml", nativeName: "മലയാളം", englishName: "Malayalam", selectText: "മലയാളം തിരഞ്ഞെടുക്കുക" },
    // { code: "gu", nativeName: "ગુજરાતી", englishName: "Gujarati", selectText: "ગુજરાતી પસંદ કરો" },
    // { code: "pa", nativeName: "ਪੰਜਾਬੀ", englishName: "Punjabi", selectText: "ਪੰਜਾਬੀ ਚੁਣੋ" },
    // { code: "or", nativeName: "ଓଡିଆ", englishName: "Odia", selectText: "ଓଡିଆ ବାଛନ୍ତୁ" },
    // { code: "as", nativeName: "অসমীয়া", englishName: "Assamese", selectText: "অসমীয়া বাছনি কৰক" },
    // { code: "ur", nativeName: "اردو", englishName: "Urdu", selectText: "اردو منتخب کریں" },
  ];
  
  const handleLanguageSelect = (languageCode: Language) => {
    setLanguage(languageCode);
    trackLanguageChange(languageCode);
    onLanguageSelected();
  };

  const playAudio = (languageCode: Language) => {
    const audioFiles: Partial<Record<Language, string>> = {
      en: "/en.wav",
      hi: "/hi.wav",
      mr: "/mr.wav"
    };

    const filePath = audioFiles[languageCode];
    if (filePath) {
      new Audio(filePath).play();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-4xl">
        {languageOptions.map((lang) => (
          <div key={lang.code} className="relative w-full sm:w-64">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-24 flex flex-col items-center justify-center gap-2 text-lg border-2 hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => handleLanguageSelect(lang.code)}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl font-semibold">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.englishName !== lang.nativeName ? lang.englishName : ""}</span>
              </div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-2 -top-2 bg-background shadow-sm border h-8 w-8"
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
