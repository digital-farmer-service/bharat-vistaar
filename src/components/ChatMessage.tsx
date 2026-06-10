import { Copy, RotateCcw, BotMessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  imageUrl?: string;
  onRetry?: () => void;
  messageId: string;
  isLoading?: boolean;
  isErrorMessage?: boolean;
  errorTranslationKey?: string;
  retryClickCount?: number;
}

export function ChatMessage({
  message,
  isUser,
  timestamp,
  imageUrl,
  onRetry,
  messageId,
  isLoading = false,
  isErrorMessage = false,
  errorTranslationKey,
  retryClickCount = 0,
}: ChatMessageProps) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const urlUsername = searchParams.get("username");

  const getInitials = (username: string) => {
    if (!username) return "U";
    const decodedName = decodeURIComponent(username);
    const words = decodedName.trim().split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) return "U";
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    toast({
      title: t("toast.messageCopied.title") as string,
      description: t("toast.messageCopied.description") as string,
    });
  };

  const displayMessage =
    isErrorMessage && errorTranslationKey
      ? (t(errorTranslationKey) as string)
      : message;

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
      const isInline = !/language-(\w+)/.exec(className || '');
      return isInline ? (
        <code className="!bg-muted/50 !rounded !px-1.5 !py-0.5 !text-sm !font-mono" {...props}>{children}</code>
      ) : (
        <code className={className} {...props}>{children}</code>
      );
    },
    ul: ({ children }) => <ul className="!mb-4 !ml-6 !list-disc !space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="!mb-4 !ml-6 !list-decimal !space-y-1">{children}</ol>,
    li: ({ children }) => <li className="!leading-relaxed">{children}</li>,
    h1: ({ children }) => <h1 className="!text-2xl !font-bold !mb-4 !mt-6 first:!mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="!text-xl !font-semibold !mb-3 !mt-5 first:!mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="!text-lg !font-semibold !mb-2 !mt-4 first:!mt-0">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="!border-l-4 !border-primary/30 !pl-4 !my-4 !italic !text-muted-foreground">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="!border-none !h-px !my-4 !bg-primary/30 dark:!bg-primary/40" />,
  };

  const renderDots = () => (
    <div className="flex items-center space-x-1.5 h-5 px-1 py-1">
      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );

  // ── User message ─────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex items-end gap-2 justify-end animate-fade-in px-1">
        <div className="flex flex-col items-end gap-1.5 max-w-[78%]">
          {/* Image shown as its own card, separate from text bubble */}
          {imageUrl && (
            <div className="rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/10 dark:ring-white/10">
              <img
                src={imageUrl}
                alt="Attached crop image"
                className="block max-w-[260px] max-h-[260px] object-cover"
              />
            </div>
          )}
          {/* Text bubble – only rendered when there is text */}
          {message && (
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed break-words">
              {message}
            </div>
          )}
        </div>
        <Avatar className="h-7 w-7 flex-shrink-0 mb-0.5">
          <AvatarImage src="" alt="User" />
          <AvatarFallback className="text-xs">
            {getInitials(urlUsername || user?.username || "U")}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  // ── Bot loading ───────────────────────────────────────────────────────────
  if (isLoading && !isErrorMessage) {
    return (
      <div className="flex items-start gap-2 animate-fade-in px-1">
        <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
          <AvatarImage src="" alt="Bot" />
          <AvatarFallback><BotMessageSquare className="h-4 w-4" /></AvatarFallback>
        </Avatar>
        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
          {renderDots()}
        </div>
      </div>
    );
  }

  // ── Bot response — mobile (full width, no avatar) ─────────────────────────
  if (isMobile) {
    return (
      <TooltipProvider>
        <div className="animate-fade-in py-2 px-1">
          <div className={cn(
            "rounded-xl px-3 py-3",
            isErrorMessage
              ? "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30"
              : "",
          )}>
            <div className={cn(
              "prose prose-sm dark:prose-invert w-full max-w-none",
              "prose-p:!mb-4 prose-p:!leading-relaxed prose-p:last:!mb-0",
              "prose-headings:!font-semibold prose-headings:!text-foreground",
              "prose-ul:!mb-4 prose-ol:!mb-4 prose-li:!leading-relaxed",
              "prose-pre:!bg-muted/50 prose-pre:!border prose-pre:!border-border",
              "prose-code:!bg-muted/50 prose-code:!rounded prose-code:!px-1.5 prose-code:!py-0.5",
              isErrorMessage ? "text-destructive dark:text-red-400 font-medium" : "",
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                {displayMessage}
              </ReactMarkdown>
            </div>
            <div className="flex items-center gap-2 mt-3">
              {isErrorMessage && onRetry && retryClickCount < 2 ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onRetry}
                  className="h-8 px-3 rounded-lg text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  {t("toast.retryButton") as string}
                </Button>
              ) : !isErrorMessage ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-7 w-7 p-0 rounded-full hover:bg-muted/80"
                      aria-label="Copy"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t("copyMessage").toString()}</p></TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // ── Bot response — desktop (avatar + bubble, copy on hover) ──────────────
  return (
    <TooltipProvider>
      <div className="flex items-start gap-2 animate-fade-in group px-1">
        <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
          <AvatarImage src="" alt="Bot" />
          <AvatarFallback><BotMessageSquare className="h-4 w-4" /></AvatarFallback>
        </Avatar>
        <div className="flex flex-col max-w-[80%]">
          <div className={cn(
            "rounded-2xl rounded-tl-sm px-4 py-3",
            isErrorMessage
              ? "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30"
              : "bg-muted",
          )}>
            <div className={cn(
              "prose prose-sm dark:prose-invert max-w-none",
              "prose-p:!mb-4 prose-p:!leading-relaxed prose-p:last:!mb-0",
              "prose-headings:!font-semibold prose-headings:!text-foreground",
              "prose-ul:!mb-4 prose-ol:!mb-4 prose-li:!leading-relaxed",
              "prose-pre:!bg-muted/50 prose-pre:!border prose-pre:!border-border",
              "prose-code:!bg-muted/50 prose-code:!rounded prose-code:!px-1.5 prose-code:!py-0.5",
              isErrorMessage ? "text-destructive dark:text-red-400 font-medium" : "",
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                {displayMessage}
              </ReactMarkdown>
            </div>
          </div>
          {/* Action row — fades in on hover */}
          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {isErrorMessage && onRetry && retryClickCount < 2 ? (
              <Button
                variant="default"
                size="sm"
                onClick={onRetry}
                className="h-7 px-2.5 rounded-lg text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {t("toast.retryButton") as string}
              </Button>
            ) : !isErrorMessage ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-6 w-6 p-0 rounded-full hover:bg-muted/80"
                    aria-label="Copy"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{t("copyMessage").toString()}</p></TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
