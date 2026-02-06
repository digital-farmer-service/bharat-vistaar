import { useLanguage } from "@/components/LanguageProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface EmptyStateScreenProps {
  setInputValue: (value: string) => void;
}

export function EmptyStateScreen({ setInputValue }: EmptyStateScreenProps) {
  const { language, t } = useLanguage();
  const isMobile = useIsMobile();

  const content = (
    <div 
      className="flex flex-col items-center justify-center w-full px-4 py-8 animate-fade-in"
      style={{
        minHeight: isMobile ? 'calc(100vh - var(--header-height) - var(--input-height))' : '100%',
        height: '100%'
      }}
    >
      {/* Welcome Container - Following Figma design */}
      <div 
        className="flex flex-col items-center gap-[3px]" 
        style={{
          maxWidth: '200px',
          width: '100%'
        }}
      >
        {/* Welcome Image */}
        <div 
          className="flex items-center justify-center mb-[3px]"
          style={{
            width: isMobile ? '120px' : '135px',
            height: isMobile ? '160px' : '180px',
            flexShrink: 0
          }}
        >
          <img 
            src="/welcome.png" 
            alt="Welcome" 
            className="w-full h-full object-contain"
            style={{
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        </div>
        
        {/* Text Container */}
        <div className="flex flex-col items-center gap-[3px] w-full">
          {/* Namaste Greeting */}
          {/* <p 
            className="w-full text-center"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: isMobile ? '13px' : '14px',
              lineHeight: '17px'
            }}
          >
            {t("namaste") as string} {userName}
          </p> */}
          
          {/* Help You Today Text */}
          <p 
            className="w-full text-center"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: isMobile ? '15px' : '16px',
              lineHeight: '19px'
            }}
          >
            {t("helpYouToday") as string}
          </p>
        </div>
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