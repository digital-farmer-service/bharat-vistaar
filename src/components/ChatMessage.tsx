import { Volume2, Copy, ThumbsUp, ThumbsDown, User, UserRound, Bot, BotMessageSquare, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AudioWaveform } from "./AudioWaveform";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/ThemeProvider";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
// import { useKeycloak } from "@react-keycloak/web";
import { useTts } from "@/hooks/use-tts";
import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";

import { useSearchParams } from "react-router-dom";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  onPlayAudio?: () => void;
  onDislike?: (messageId: string, questionText: string, responseText: string) => void;
  onLike?: (messageId: string, questionText: string, responseText: string) => void;
  onRetry?: () => void;
  messageId: string;
  isLoading?: boolean;
  isStreaming?: boolean;
  questionText?: string;
  responseText?: string;
  isFeedbackMessage?: boolean;
  isErrorMessage?: boolean;
  errorTranslationKey?: string;
  retryClickCount?: number;
}

export function ChatMessage({
  message,
  isUser,
  timestamp,
  onPlayAudio,
  onDislike,
  onLike,
  onRetry,
  messageId,
  questionText = '',
  responseText = '',
  isLoading = false,
  isStreaming = false,
  isFeedbackMessage = false,
  isErrorMessage = false,
  errorTranslationKey,
  retryClickCount = 0,
}: ChatMessageProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const { isPlaying, currentPlayingId, audioState, toggleAudio } = useTts();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const urlUsername = searchParams.get("username");

  const getInitials = (username: string) => {
    if (!username) return "U";
    
    // Decode URL-encoded username (e.g., "Ravi%20Pratap" -> "Ravi Pratap")
    const decodedName = decodeURIComponent(username);
    
    // Split by spaces and filter out empty strings
    const words = decodedName.trim().split(/\s+/).filter(word => word.length > 0);
    
    if (words.length === 0) return "U";
    
    // If single word, take first 2 characters
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    
    // If multiple words, take first letter of first two words
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  };
  
  const handlePlayAudio = () => {
    toggleAudio(message, messageId);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    toast({
      title: t("toast.messageCopied.title") as string,
      description: t("toast.messageCopied.description") as string,
    });
  };

  const handleLike = (questionText: string, responseText: string) => {
    if (isDisliked) {
      setIsDisliked(false);
    }
    setIsLiked(!isLiked);
    
    if (!isLiked && onLike) {
      onLike(messageId, questionText, responseText);
    }
  };

  const handleDislike = (questionText: string, responseText: string) => {
    if (isLiked) {
      setIsLiked(false);
    }
    setIsDisliked(!isDisliked);
    
    if (!isDisliked && onDislike) {
      onDislike(messageId, questionText, responseText);
    }
  };

  const iconColor = theme === "dark" ? "white" : "currentColor";

  const markdownComponents: Components = {
    p: ({ children }) => <p className="!mb-4 !leading-relaxed last:!mb-0">{children}</p>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
        {children}
      </a>
    ),
    pre: ({ children }) => (
      <pre className="!bg-muted/50 !p-3 !rounded-lg !overflow-x-auto !my-3 !border !border-border">
        {children}
      </pre>
    ),
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;
      return isInline ? (
        <code className="!bg-muted/50 !rounded !px-1.5 !py-0.5 !text-sm !font-mono" {...props}>{children}</code>
      ) : (
        <code className={className} {...props}>{children}</code>
      );
    },
    hr: () => (
      <hr className="!border-none !h-px !my-4 !bg-primary/30 dark:!bg-primary/40" />
    ),
    ul: ({ children }) => <ul className="!mb-4 !ml-6 !list-disc !space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="!mb-4 !ml-6 !list-decimal !space-y-1">{children}</ol>,
    li: ({ children }) => <li className="!leading-relaxed">{children}</li>,
    h1: ({ children }) => <h1 className="!text-2xl !font-bold !mb-4 !mt-6 first:!mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="!text-xl !font-semibold !mb-3 !mt-5 first:!mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="!text-lg !font-semibold !mb-2 !mt-4 first:!mt-0">{children}</h3>,
    h4: ({ children }) => <h4 className="!text-base !font-semibold !mb-2 !mt-3 first:!mt-0">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="!border-l-4 !border-primary/30 !pl-4 !my-4 !italic !text-muted-foreground">
        {children}
      </blockquote>
    ),
  };

  const renderStreamingIndicator = () => (
    <div className="flex items-center space-x-2 h-6">
      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }}></div>
      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }}></div>
      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }}></div>
    </div>
  );

  const renderAudioButton = () => {
    const state = audioState[messageId] || 'idle';
    const isCurrentlyPlaying = isPlaying && currentPlayingId === messageId;

    return (
      <Button
        variant={isCurrentlyPlaying ? "secondary" : "outline"}
        size="sm"
        onClick={handlePlayAudio}
        className={cn(
          "h-9 px-3 rounded-md bg-primary/10 text-primary hover:bg-primary/20 border-primary/20",
          isCurrentlyPlaying && "bg-primary/20"
        )}
        aria-label={isCurrentlyPlaying ? "Stop audio" : "Listen"}
        disabled={state === 'loading' || isErrorMessage}
      >
        {state === 'loading' ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Volume2 className={cn(
            "h-4 w-4 mr-1",
            isCurrentlyPlaying && "animate-pulse"
          )} />
        )}
        {t("Listen") as string}
      </Button>
    );
  };

  // Use translation key for error messages if present
  const displayMessage = isErrorMessage && errorTranslationKey ? (t(errorTranslationKey) as string) : message;

  // If it's an AI response on mobile (not a user message), use a simplified layout
  if (!isUser && isMobile && (!isLoading || isErrorMessage)) {
    return (
      <TooltipProvider>
        <div className="animate-fade-in my-6 px-1 relative">
          {/* Subtle top separator */}
          {/* <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-muted rounded-full -mt-5 opacity-40" /> */}
          
          <div className={cn(
            "w-full max-w-full pt-1 px-3 py-3 rounded-lg",
            isErrorMessage ? "bg-red-100/20 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30" : ""
          )}>
            <div className={cn(
              "prose prose-sm dark:prose-invert w-full max-w-none",
              "prose-p:!mb-4 prose-p:!leading-relaxed prose-p:last:!mb-0",
              "prose-headings:!font-semibold prose-headings:!text-foreground",
              "prose-ul:!mb-4 prose-ol:!mb-4 prose-li:!leading-relaxed",
              "prose-pre:!bg-muted/50 prose-pre:!border prose-pre:!border-border",
              "prose-code:!bg-muted/50 prose-code:!rounded prose-code:!px-1.5 prose-code:!py-0.5",
              isErrorMessage ? "text-destructive dark:text-red-400 font-medium" : ""
            )}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={markdownComponents}
              >
                {displayMessage}
              </ReactMarkdown>
            </div>
            
            <div className="flex items-center justify-start gap-3 mt-4">
              {isStreaming && !isErrorMessage ? (
                renderStreamingIndicator()
              ) : (
                <>
                  {isErrorMessage && onRetry && retryClickCount < 2 ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onRetry}
                      className="h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                      aria-label="Retry"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {t("toast.retryButton") as string}
                    </Button>
                  ) : (
                    renderAudioButton()
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-8 w-8 p-0 rounded-full hover:bg-muted/50"
                        aria-label="Copy message"
                        disabled={isErrorMessage}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("copyMessage").toString()}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isLiked ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleLike(questionText, responseText)}
                        className={cn(
                          "h-8 w-8 p-0 rounded-full hover:bg-muted/50",
                          isLiked && "like-active"
                        )}
                        aria-label="Like message"
                        disabled={isErrorMessage}
                      >
                        <ThumbsUp className={cn("h-4 w-4", isLiked && "like-active-text")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("likeMessage").toString()}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isDisliked ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleDislike(questionText, responseText)}
                        className="h-8 w-8 p-0 rounded-full hover:bg-muted/50"
                        aria-label="Dislike message"
                        disabled={isErrorMessage}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("dislikeMessage").toString()}</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
          
          {/* Subtle bottom separator */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-muted rounded-full -mb-5 opacity-40" />
        </div>
      </TooltipProvider>
    );
  }

  // If it's a loading message on mobile
  if (!isUser && isMobile && isLoading && !isErrorMessage) {
    return (
      <TooltipProvider>
        <div className="animate-fade-in my-6 px-1 relative">
          {/* Subtle top separator */}
          {/* <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-muted rounded-full -mt-5 opacity-40" /> */}
          
          <div className="w-full max-w-full pt-2">
            <div className="flex items-center space-x-2 h-6 justify-start">
              <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
          
          {/* Subtle bottom separator */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-muted rounded-full -mb-5 opacity-40" />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn(
        "flex w-full items-start gap-2 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        <Avatar className={cn(
          "h-8 w-8 flex-shrink-0",
          isUser ? "ml-2" : "mr-2"
        )}>
          {isUser ? (
            <>
              <AvatarImage src="" alt="User" />
              <AvatarFallback>
                {getInitials(urlUsername || user?.username || "U")}
              </AvatarFallback>
            </>
          ) : (
            <>
              <AvatarImage src="" alt="Bot" />
              <AvatarFallback>
                <BotMessageSquare className="h-4 w-4" />
              </AvatarFallback>
            </>
          )}
        </Avatar>

        <div className={cn(
          "flex flex-col max-w-[80%] min-w-[80px]",
          isUser ? "items-end" : "items-start"
        )}>
          <div className={cn(
            "rounded-2xl px-4 py-2.5 mb-1 w-fit",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-none word-break-break-word"
              : `${displayMessage.length > 0 ? "bg-muted" : "hidden"} rounded-tl-none`
          )}>
            {isLoading && !isErrorMessage ? (
              <div className={cn(
                "flex items-center space-x-2 h-6"
              )}>
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            ) : (
              <div className={cn(
                "prose prose-sm dark:prose-invert max-w-none",
                "prose-p:!mb-4 prose-p:!leading-relaxed prose-p:last:!mb-0",
                "prose-headings:!font-semibold prose-headings:!text-foreground",
                "prose-ul:!mb-4 prose-ol:!mb-4 prose-li:!leading-relaxed",
                "prose-pre:!bg-muted/50 prose-pre:!border prose-pre:!border-border",
                "prose-code:!bg-muted/50 prose-code:!rounded prose-code:!px-1.5 prose-code:!py-0.5",
                isErrorMessage ? "text-destructive dark:text-red-400 font-medium" : ""
              )}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={markdownComponents}
                >
                  {displayMessage}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {!isUser && !isLoading && !isFeedbackMessage && !isMobile && (
            <div className="flex items-center gap-1 mt-1 opacity-70 hover:opacity-100 transition-opacity">
              {isStreaming && !isErrorMessage ? (
                renderStreamingIndicator()
              ) : (
                <>
                  {isErrorMessage && onRetry && retryClickCount < 2 ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onRetry}
                      className="h-8 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                      aria-label="Retry"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-2" />
                      {t("toast.retryButton") as string}
                    </Button>
                  ) : (
                    renderAudioButton()
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-7 w-7 p-0 rounded-full hover:bg-muted/50"
                        aria-label="Copy message"
                        disabled={isErrorMessage}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("copyMessage").toString()}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isLiked ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleLike(questionText, responseText)}
                        className={cn(
                          "h-7 w-7 p-0 rounded-full hover:bg-muted/50",
                          isLiked && "like-active"
                        )}
                        aria-label="Like message"
                        disabled={isErrorMessage}
                      >
                        <ThumbsUp className={cn("h-3.5 w-3.5", isLiked && "like-active-text")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("likeMessage").toString()}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isDisliked ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleDislike(questionText, responseText)}
                        className="h-7 w-7 p-0 rounded-full hover:bg-muted/50"
                        aria-label="Dislike message"
                        disabled={isErrorMessage}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("dislikeMessage").toString()}</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
