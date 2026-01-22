
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  const [expandedView, setExpandedView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Toggle between expanded and collapsed view
  const toggleExpandView = () => {
    setExpandedView(prev => !prev);
  };

  return (
    <div className="w-full my-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">Suggestions</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs" 
          onClick={toggleExpandView}
        >
          {expandedView ? "Collapse" : "See all"}
        </Button>
      </div>
      
      <div 
        ref={containerRef}
        className={`grid gap-2 transition-all duration-300 ${
          expandedView ? "grid-cols-2 md:grid-cols-3" : "flex overflow-x-auto no-scrollbar"
        }`}
      >
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            className={`text-sm whitespace-nowrap px-3 py-1 h-auto rounded-full ${
              expandedView ? "w-full" : "flex-shrink-0"
            }`}
            onClick={() => onSelect(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
