import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { Layout } from "@/components/Layout";
import { LanguageSelectionScreen } from "@/components/LanguageSelectionScreen";

export default function ChatPage() {
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);
  
  // Check if language was previously selected (you could use localStorage)
  useEffect(() => {
    const languageSelected = localStorage.getItem("languageSelected");
    if (languageSelected === "true") {
      setHasSelectedLanguage(true);
    }
  }, []);
  
  const handleLanguageSelected = () => {
    localStorage.setItem("languageSelected", "true");
    setHasSelectedLanguage(true);
  };

  return (
    <Layout showFooter={false}>
      <div className="container mx-auto px-4 h-[calc(100vh-var(--header-height)-var(--input-height))] pt-1">
        {hasSelectedLanguage ? (
          <ChatInterface />
        ) : (
          <LanguageSelectionScreen onLanguageSelected={handleLanguageSelected} />
        )}
      </div>
    </Layout>
  );
}
