import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/ChatMessage";
import { useLanguage } from "@/components/LanguageProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import apiService from "@/lib/api";
import { EmptyStateScreen } from "@/components/EmptyStateScreen";
import AutoResizeTextarea from "@/components/AutoResizeTextarea";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
  isStreaming?: boolean;
  questionId?: string;
  questionText?: string;
  isErrorMessage?: boolean;
  errorTranslationKey?: string;
  retryAttempt?: number;
  maxRetryAttempts?: number;
  canRetry?: boolean;
  originalUserMessage?: string;
  retryClickCount?: number;
  imageUrl?: string;
}

export function ChatInterface() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [inputPositioned, setInputPositioned] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const initialSuggestionRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMessageLoading, setIsMessageLoading] = useState(false);

  // Image attachment states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Suggestion related states
  const [displayedSuggestion, setDisplayedSuggestion] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState("");
  const [typingIndex, setTypingIndex] = useState(0);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState<string[]>([]);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);

  // Suggestion refresh interval configuration (tweakable)
  const [suggestionRefreshInterval, setSuggestionRefreshInterval] =
    useState(10000); // 10 seconds in milliseconds
  const [suggestionRefreshCount, setSuggestionRefreshCount] = useState(0);
  const [maxSuggestionRefreshes, setMaxSuggestionRefreshes] = useState(5);
  const suggestionRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Add this effect to update the input height CSS variable
  useEffect(() => {
    const updateInputHeight = () => {
      if (inputContainerRef.current) {
        const inputHeight = inputContainerRef.current.offsetHeight;
        document.documentElement.style.setProperty(
          "--input-height",
          `${inputHeight}px`,
        );
      }
    };

    // Call initially and set up resize observer
    updateInputHeight();

    const resizeObserver = new ResizeObserver(updateInputHeight);
    if (inputContainerRef.current) {
      resizeObserver.observe(inputContainerRef.current);
    }

    window.addEventListener("resize", updateInputHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateInputHeight);
    };
  }, []);

  // Helper functions for managing messages
  const addMessage = (text: string, isUser: boolean, options = {}): string => {
    const id = `${isUser ? "user" : "bot"}-${uuidv4()}`;
    const newMessage: Message = {
      id,
      text,
      isUser,
      timestamp: new Date(),
      ...options,
    };

    setMessages((prev) => [...prev, newMessage]);
    return id;
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)),
    );
  };


  // Helper function to update suggestion refresh interval (tweakable)
  const updateSuggestionRefreshInterval = (intervalMs: number) => {
    setSuggestionRefreshInterval(intervalMs);
  };

  // Helper function to update max suggestion refreshes (tweakable)
  const updateMaxSuggestionRefreshes = (maxRefreshes: number) => {
    setMaxSuggestionRefreshes(maxRefreshes);
  };

  // Function to start suggestion refresh cycle
  const startSuggestionRefreshCycle = (currentSession: string) => {
    // Clear any existing timer
    if (suggestionRefreshTimerRef.current) {
      clearInterval(suggestionRefreshTimerRef.current);
    }

    // Reset counter and call immediately (first call)
    setSuggestionRefreshCount(1);
    // fetchSuggestions(currentSession);

    // Start the interval for remaining calls if we haven't reached max
    if (maxSuggestionRefreshes > 1) {
      suggestionRefreshTimerRef.current = setInterval(() => {
        setSuggestionRefreshCount((prevCount) => {
          const newCount = prevCount + 1;

          // if (newCount <= maxSuggestionRefreshes) {
          // fetchSuggestions(currentSession);
          // }

          // Stop the timer if we've reached the max count
          if (
            newCount >= maxSuggestionRefreshes &&
            suggestionRefreshTimerRef.current
          ) {
            clearInterval(suggestionRefreshTimerRef.current);
            suggestionRefreshTimerRef.current = null;
          }

          return newCount;
        });
      }, suggestionRefreshInterval);
    }
  };

  // Get user location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          apiService.setLocationData(locationData);
        },
        (error) => {
          console.log("Unable to retrieve location:", error);

          // Show toast notification based on the error
          // switch(error.code) {
          //   case error.PERMISSION_DENIED:
          //     toast({
          //       title: t("toast.locationPermissionDenied.title") as string,
          //       description: t("toast.locationPermissionDenied.description") as string,
          //       variant: "yellow",
          //     });
          //     break;
          //   case error.POSITION_UNAVAILABLE:
          //     toast({
          //       title: t("toast.locationUnavailable.title") as string,
          //       description: t("toast.locationUnavailable.description") as string,
          //       variant: "yellow",
          //     });
          //     break;
          //   case error.TIMEOUT:
          //     toast({
          //       title: t("toast.locationTimeout.title") as string,
          //       description: t("toast.locationTimeout.description") as string,
          //       variant: "yellow",
          //     });
          //     break;
          //   default:
          //     toast({
          //       title: t("toast.locationError.title") as string,
          //       description: t("toast.locationError.description") as string,
          //       variant: "yellow",
          //     });
          // }
        },
      );
    } else {
      // toast({
      //   title: t("toast.locationNotSupported.title") as string,
      //   description: t("toast.locationNotSupported.description") as string,
      //   variant: "yellow",
      // });
    }
  };

  const setNewSuggestion = (
    suggestions: SuggestionItem[] | { question: string },
  ) => {
    let suggestionsList: string[];

    if (Array.isArray(suggestions)) {
      suggestionsList = suggestions.map((s) => s.question);
    } else {
      suggestionsList = [suggestions.question];
    }

    setAllSuggestions(suggestionsList);
    setCurrentSuggestion(suggestionsList[0]);
    setCurrentSuggestionIndex(0);
  };

  // Effect to cycle through suggestions every 10 seconds
  useEffect(() => {
    if (allSuggestions.length === 0) return;

    const cycleTimer = setInterval(() => {
      setCurrentSuggestionIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % allSuggestions.length;
        setCurrentSuggestion(allSuggestions[nextIndex]);
        return nextIndex;
      });
    }, 10000); // 10 seconds

    return () => clearInterval(cycleTimer);
  }, [allSuggestions]);

  // Cleanup suggestion refresh timer on unmount
  useEffect(() => {
    // initChatApiPerformanceObserver();
    return () => {
      if (suggestionRefreshTimerRef.current) {
        clearInterval(suggestionRefreshTimerRef.current);
      }
    };
  }, []);

  // Image attachment handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImage(null);
    setImagePreviewUrl(null);
  };

  // Handle text message sending
  const handleSendMessage = async () => {
    const textToSend = inputValue.trim();
    if ((textToSend === "" && !selectedImage) || isMessageLoading) return;

    const imageToUpload = selectedImage;
    const imageMimeType = selectedImage?.type;
    const imageUrlToShow = imagePreviewUrl;

    if (!inputPositioned) setInputPositioned(true);
    scrollToBottomOfMessages();

    addMessage(textToSend, true, { imageUrl: imageUrlToShow || undefined });
    const loadingMessageId = addMessage("", false, { isLoading: true });

    setIsMessageLoading(true);
    setInputValue("");
    setSelectedImage(null);
    setImagePreviewUrl(null);

    let fileStoreId: string | undefined;
    if (imageToUpload) {
      try {
        fileStoreId = await apiService.uploadToFilestore(imageToUpload);
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        toast({
          title: t("toast.imageUploadFailed.title") as string || "Upload failed",
          description: t("toast.imageUploadFailed.description") as string || "Could not upload image. Sending text only.",
          variant: "yellow",
        });
      }
    }

    try {
      await sendMessageToApi(textToSend, loadingMessageId, {
        fileStoreId,
        mimeType: imageMimeType,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      updateMessage(loadingMessageId, {
        text: "",
        isLoading: false,
        isErrorMessage: true,
        errorTranslationKey: "toast.apiError.description",
      });
    } finally {
      setIsMessageLoading(false);
    }
  };

  // When an error occurs, ensure the UI updates completely
  const forceUIRefresh = () => {
    // Force a style update to trigger reflow
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.overflow = "hidden";
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.style.overflow = "";
        }
        scrollToBottomOfMessages();
      }, 50);
    }
  };

  // Sends a query to the Becken crop-disease chat backend
  const sendMessageToApi = async (
    text: string,
    loadingMessageId: string,
    options?: { fileStoreId?: string; mimeType?: string },
  ): Promise<{ messageId: string; finalText: string | null }> => {
    const questionId = uuidv4();

    updateMessage(loadingMessageId, {
      isLoading: true,
      isStreaming: false,
      questionId,
      questionText: text,
    });

    try {
      const response = await apiService.sendBeckenQuery({
        queryText: text,
        sessionId: sessionId ?? undefined,
        fileStoreId: options?.fileStoreId,
        mimeType: options?.mimeType,
      });

      // Persist the backend's session ID for subsequent turns
      if (response.sessionId) {
        setSessionId(response.sessionId);
        apiService.setSessionId(response.sessionId);
      }

      if (response.responseText) {
        updateMessage(loadingMessageId, {
          text: response.responseText,
          isLoading: false,
          isStreaming: false,
          questionId,
          questionText: text,
          canRetry: false,
        });
        return { messageId: loadingMessageId, finalText: response.responseText };
      } else {
        updateMessage(loadingMessageId, {
          text: "",
          isErrorMessage: true,
          isLoading: false,
          isStreaming: false,
          questionId,
          questionText: text,
          errorTranslationKey: "toast.apiEmptyResponse.description",
          canRetry: true,
          originalUserMessage: text,
        });
        return { messageId: loadingMessageId, finalText: null };
      }
    } catch (error) {
      console.error("Becken error:", error);
      updateMessage(loadingMessageId, {
        text: "",
        isLoading: false,
        isErrorMessage: true,
        errorTranslationKey: "toast.apiError.description",
        canRetry: true,
        originalUserMessage: text,
      });
      forceUIRefresh();
      return { messageId: loadingMessageId, finalText: null };
    }
  };

  // Handle manual retry for failed messages
  const handleRetry = async (messageId: string) => {
    const message = messages.find((msg) => msg.id === messageId);
    if (!message || !message.originalUserMessage) return;

    // Increment retry click count
    const currentRetryClickCount = (message.retryClickCount || 0) + 1;

    // If this is the 3rd click (after 2 visible clicks), hide the button and don't retry
    if (currentRetryClickCount >= 3) {
      updateMessage(messageId, {
        canRetry: false,
        retryClickCount: currentRetryClickCount,
      });
      return;
    }

    // Update message to show retrying state and increment click count
    updateMessage(messageId, {
      isLoading: true,
      isErrorMessage: false,
      errorTranslationKey: undefined,
      canRetry: currentRetryClickCount < 2, // Hide button after 2nd click
      retryClickCount: currentRetryClickCount,
    });

    setIsMessageLoading(true);

    try {
      await sendMessageToApi(message.originalUserMessage, messageId);
    } catch (error) {
      console.error("Error retrying message:", error);
    } finally {
      setIsMessageLoading(false);
    }
  };

  // UI interactions
  const handleSuggestionSelect = (suggestion: string) => {
    setInputValue(suggestion);
  };

  // Modify isNearBottom to handle scroll calculations better
  const isNearBottom = useCallback(() => {
    // Find the real scrollable element more reliably
    const findCurrentScrollElement = () => {
      if (viewportRef.current) return viewportRef.current;

      if (scrollContainerRef.current) {
        const viewport = scrollContainerRef.current.closest(
          "[data-radix-scroll-area-viewport]",
        );
        if (viewport) return viewport as HTMLDivElement;
      }

      return scrollContainerRef.current;
    };

    const scrollElement = findCurrentScrollElement();
    if (!scrollElement) {
      // console.log('No scroll element found in isNearBottom');
      return true; // Default to true if we can't find the container
    }

    const threshold = 80; // 50px from bottom threshold

    const scrollHeight = scrollElement.scrollHeight;
    const scrollTop = scrollElement.scrollTop;
    const clientHeight = scrollElement.clientHeight;
    const bottomPosition = scrollHeight - scrollTop - clientHeight;
    return bottomPosition < threshold;
  }, []);

  // Modify the scrollToBottom function to prevent unwanted scrolling when keyboard is open
  const scrollToBottom = useCallback(() => {
    // Don't auto-scroll when keyboard is open on mobile
    if (isMobile && isKeyboardVisible) return;

    const shouldScroll = isNearBottom();
    if (shouldScroll) {
      const scrollElement =
        viewportRef.current ||
        (scrollContainerRef.current?.closest(
          "[data-radix-scroll-area-viewport]",
        ) as HTMLDivElement) ||
        scrollContainerRef.current;

      if (scrollElement) {
        const bottomPosition =
          scrollElement.scrollHeight -
          scrollElement.scrollTop -
          scrollElement.clientHeight;

        // If exactly at bottom (within 1px), use instant scroll, otherwise smooth scroll
        const scrollBehavior = bottomPosition <= 1 ? "auto" : "smooth";
        messagesEndRef.current?.scrollIntoView({
          behavior: scrollBehavior as ScrollBehavior,
        });
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [isMobile, isKeyboardVisible, isNearBottom]);

  // Modify scrollToBottomOfMessages to respect keyboard state on mobile
  const scrollToBottomOfMessages = () => {
    // Don't force scroll when keyboard is open on mobile
    if (isMobile && isKeyboardVisible) return;

    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      const scrollElement =
        viewportRef.current ||
        (scrollContainerRef.current?.closest(
          "[data-radix-scroll-area-viewport]",
        ) as HTMLDivElement) ||
        scrollContainerRef.current;

      if (scrollElement) {
        // Always scroll to bottom regardless of current position
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
      // Also use scrollIntoView as backup
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputValue(text);
  };

  // Effects
  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    // Don't auto-scroll when keyboard is open on mobile
    if (isMobile && isKeyboardVisible) return;

    // Always scroll to bottom when messages change
    scrollToBottom();
  }, [messages, isMobile, isKeyboardVisible, scrollToBottom]);

  // Remove the typing animation effect for suggestions
  useEffect(() => {
    if (!isTyping || !currentSuggestion) return;

    if (typingIndex >= currentSuggestion.length) {
      setIsTyping(false);
      return;
    }

    const typingTimeout = setTimeout(() => {
      setDisplayedSuggestion(
        (prev) => prev + currentSuggestion.charAt(typingIndex),
      );
      setTypingIndex((prev) => prev + 1);
    }, 50);

    return () => clearTimeout(typingTimeout);
  }, [isTyping, typingIndex, currentSuggestion]);

  // Auto-resize handled by AutoResizeTextarea component

  // Add a keyboard detection effect
  useEffect(() => {
    if (!isMobile) return;

    // Helper function to handle keyboard detection
    const handleKeyboardAppearance = () => {
      // On iOS, we can detect keyboard appearance by window height changes
      const visualViewport = window.visualViewport;
      if (!visualViewport) return;

      // Track keyboard visibility by comparing visual viewport height to window inner height
      const handleVisualViewportChange = () => {
        const kbHeight = Math.max(
          0,
          window.innerHeight - visualViewport.height,
        );
        document.documentElement.style.setProperty(
          "--keyboard-offset",
          `${kbHeight}px`,
        );

        setKeyboardHeight(kbHeight);

        // Only change keyboard visibility state if significant height change
        if (kbHeight > 100 && !isKeyboardVisible) {
          setIsKeyboardVisible(true);

          // Make sure input sits directly on top of keyboard with no gap
          if (inputContainerRef.current) {
            // Remove the bottom property since we'll use transform in the component
            inputContainerRef.current.style.bottom = "0";
          }
        } else if (kbHeight <= 100 && isKeyboardVisible) {
          setIsKeyboardVisible(false);

          // Keyboard is hidden
          if (inputContainerRef.current) {
            inputContainerRef.current.style.bottom = "0";
          }
        }
      };

      visualViewport.addEventListener("resize", handleVisualViewportChange);
      return () =>
        visualViewport.removeEventListener(
          "resize",
          handleVisualViewportChange,
        );
    };

    const cleanup = handleKeyboardAppearance();
    return cleanup;
  }, [isMobile, isKeyboardVisible]);

  const handlePreviousSuggestion = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setCurrentSuggestionIndex((prevIndex) => {
      const newIndex =
        prevIndex > 0 ? prevIndex - 1 : allSuggestions.length - 1;
      setCurrentSuggestion(allSuggestions[newIndex]);
      return newIndex;
    });
  };

  const handleNextSuggestion = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setCurrentSuggestionIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % allSuggestions.length;
      setCurrentSuggestion(allSuggestions[nextIndex]);
      return nextIndex;
    });
  };

  // Render a different input for mobile
  const renderMobileInput = () => {
    // Fix for iOS to ensure the input sticks to the keyboard
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const adjustedHeight =
      isIOS && isKeyboardVisible ? keyboardHeight - 1 : keyboardHeight; // -1px to ensure visual contact on iOS

    return (
      <>
        {/* Hidden image file input */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        <div
          className="fixed left-0 right-0 bottom-0 z-20 flex flex-col"
          style={{
            transform: isKeyboardVisible
              ? `translateY(-${adjustedHeight}px)`
              : "none",
            paddingBottom: "0"
          }}
        >
          <div className="mx-3 mb-2">
            <div
              className="flex items-center gap-2"
            >
              {currentSuggestion && (
                <div
                  className="flex-1 bg-background/95 p-3 backdrop-blur rounded-lg text-sm cursor-pointer border border-primary hover:border hover:border-primary transition-all"
                  onClick={() => handleSuggestionSelect(currentSuggestion)}
                >
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={handlePreviousSuggestion}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="font-medium">{currentSuggestion}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={handleNextSuggestion}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div
            ref={inputContainerRef}
            className={cn(
              "bg-background border-t border-border transition-all duration-200",
              isKeyboardVisible ? "shadow-lg border-b-0" : "",
            )}
          >
            <div className="px-3 pt-3 pb-1 relative">
              {/* Image preview */}
              {imagePreviewUrl && (
                <div className="mb-2 flex items-start gap-2">
                  <div className="relative">
                    <img src={imagePreviewUrl} alt="Attachment preview" className="h-16 w-16 rounded-lg object-cover border border-border" />
                    <button onClick={handleRemoveImage} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center" aria-label="Remove image">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 bg-card backdrop-blur-sm rounded-lg border-2 border-border shadow-lg hover:shadow-xl hover:border-primary/50 transition-all ring-1 ring-border/50 p-2">
                <AutoResizeTextarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  onFocus={() => {
                    // Ensure positioning gets updated on focus
                    if (window.visualViewport) {
                      const kbHeight = Math.max(
                        0,
                        window.innerHeight - window.visualViewport.height,
                      );
                      if (kbHeight > 100) {
                        setIsKeyboardVisible(true);
                        setKeyboardHeight(kbHeight);
                      }
                    }
                  }}
                  placeholder={t("inputPlaceholder") as string}
                  className="flex-1 transition-all duration-100"
                  style={{
                    paddingRight: "8px",
                    paddingLeft: "8px",
                    paddingTop: "6px",
                    paddingBottom: "6px",
                    fontSize: isMobile ? "16px" : "",
                  }}
                  disabled={isMessageLoading}
                  minRows={1}
                  maxRows={6}
                />
                <div className="flex flex-shrink-0 gap-2">
                  <Button
                    onClick={() => imageInputRef.current?.click()}
                    variant={selectedImage ? "secondary" : "outline"}
                    size="icon"
                    className="rounded-full flex-shrink-0 h-9 w-9"
                    aria-label="Attach image"
                    disabled={isMessageLoading}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={(inputValue.trim() === "" && !selectedImage) || isMessageLoading}
                    variant="default"
                    size="icon"
                    className="rounded-full flex-shrink-0 h-9 w-9"
                    aria-label={t("send") as string}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Update cleanup in useEffect to stop audio when component unmounts
  useEffect(() => {
    return () => {
      // No need to stop audio here as the AudioPlayer handles its own cleanup
    };
  }, []);

  return (
    <div className="flex flex-col h-full relative p-[0px!important]">
      {messages.length === 0 ? (
        <EmptyStateScreen setInputValue={setInputValue} />
      ) : (
        <ScrollArea className="flex-1 h-[calc(100vh-var(--header-height)-var(--input-height))]">
          <div
            ref={(el) => {
              scrollContainerRef.current = el;
              // Also set viewportRef to the parent scroll viewport
              if (el) {
                const viewport = el.closest(
                  "[data-radix-scroll-area-viewport]",
                ) as HTMLDivElement;
                if (viewport) viewportRef.current = viewport;
              }
            }}
            className={cn(
              isMobile
                ? isKeyboardVisible
                  ? "pb-24 md:pb-20"
                  : "pb-32 md:pb-20 mt-20"
                : "pb-24 md:pb-20",
              messages.length === 1 ? "min-h-[70vh]" : "", // Ensure single message has enough height
            )}
          >
            <div
              className={cn(
                "message-container",
                isMobile ? "space-y-4 px-2" : "space-y-4 px-4", // Increased spacing on mobile
              )}
            >
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message.text}
                  isUser={message.isUser}
                  timestamp={message.timestamp}
                  imageUrl={message.imageUrl}
                  onRetry={message.canRetry ? () => handleRetry(message.id) : undefined}
                  messageId={message.id}
                  isLoading={message.isLoading}
                  isErrorMessage={message.isErrorMessage}
                  errorTranslationKey={message.errorTranslationKey}
                  retryClickCount={message.retryClickCount}
                />
              ))}
              <div ref={messagesEndRef} className="h-8" />
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Render different input containers for mobile vs desktop */}
      {isMobile ? (
        renderMobileInput()
      ) : (
        <>
          {/* Hidden image file input (desktop) */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 supports-[backdrop-filter]:bg-background/0">
          <div className="border-border">
            <div className="p-4">
              <div className="relative max-w-2xl mx-auto">
                {currentSuggestion && (
                  <div className="absolute -top-16 left-4 right-4 z-10">
                    <div
                      className="flex-1 bg-background/95 p-3 backdrop-blur rounded-lg text-sm cursor-pointer hover:border hover:border-primary transition-all border"
                      onClick={() => handleSuggestionSelect(currentSuggestion)}
                    >
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handlePreviousSuggestion}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="font-medium">{currentSuggestion}</div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handleNextSuggestion}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Desktop image preview */}
                {imagePreviewUrl && (
                  <div className="mb-2 flex items-start gap-2">
                    <div className="relative">
                      <img src={imagePreviewUrl} alt="Attachment preview" className="h-16 w-16 rounded-lg object-cover border border-border" />
                      <button onClick={handleRemoveImage} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center" aria-label="Remove image">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-card backdrop-blur-sm rounded-lg border-2 border-border shadow-lg hover:shadow-xl hover:border-primary/50 transition-all ring-1 ring-border/50 p-2">
                  <AutoResizeTextarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    placeholder={t("inputPlaceholder") as string}
                    className="flex-1 transition-all duration-100"
                    style={{
                      paddingRight: "8px",
                      paddingLeft: "8px",
                      fontSize: isMobile ? "16px" : "",
                    }}
                    minRows={1}
                    maxRows={6}
                  />
                  <Button
                    onClick={() => imageInputRef.current?.click()}
                    variant={selectedImage ? "secondary" : "outline"}
                    size="icon"
                    className="rounded-full flex-shrink-0"
                    aria-label="Attach image"
                    disabled={isMessageLoading}
                  >
                    <ImagePlus className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={(inputValue.trim() === "" && !selectedImage) || isMessageLoading}
                    variant="default"
                    size="icon"
                    className="rounded-full flex-shrink-0"
                    aria-label={t("send") as string}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

    </div>
  );
}
