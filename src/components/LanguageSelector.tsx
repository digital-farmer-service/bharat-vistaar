import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguage } from "./LanguageProvider";
import { ChevronDown } from "lucide-react";

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();

  const getActiveClass = (currentLang: string) => {
    return language === currentLang ? "font-bold bg-accent/50" : "";
  };

  const getFullLanguageName = (lang: string) => {
    switch (lang) {
      case "en": return "English";
      case "hi": return "हिंदी";
      case "mr": return "मराठी";
      default: return "English";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-1 px-3 py-1.5 text-sm"
          aria-label="Select language"
        >
          {getFullLanguageName(language)}
          <ChevronDown size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          className={getActiveClass("en")}
          onClick={() => setLanguage("en")}
        >
          English
        </DropdownMenuItem>
        {/* <DropdownMenuItem 
          className={getActiveClass("hi")}
          onClick={() => setLanguage("hi")}
        >
          हिंदी
        </DropdownMenuItem> */}
        <DropdownMenuItem 
          className={getActiveClass("mr")}
          onClick={() => setLanguage("mr")}
        >
          मराठी
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
