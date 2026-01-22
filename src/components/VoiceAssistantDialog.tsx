import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mic, Square, Loader2, Play, StopCircle, Volume2, X, MicVocal } from "lucide-react";
import { AudioWaveform } from "@/components/AudioWaveform";
import { setupAudioRecording, setupAudioVisualization, stopRecording } from "@/lib/audio-utils";
import apiService from "@/lib/api";
import { useTts } from "@/hooks/use-tts";
import { cn } from "@/lib/utils";

interface VoiceAssistantDialogProps {
  onSendVoice: (text: string) => Promise<{ botMessageId: string; responseText: string }>; // sends into chat, auto-TTS handled there
  triggerVariant?: "outline" | "default" | "ghost" | "secondary";
  triggerSize?: "default" | "icon" | "sm" | "lg";
  triggerClassName?: string;
}

export function VoiceAssistantDialog({ onSendVoice, triggerVariant = "outline", triggerSize = "icon", triggerClassName }: VoiceAssistantDialogProps) {
  const [open, setOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0.5);
  const [transcribedText, setTranscribedText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [botMessageId, setBotMessageId] = useState<string | null>(null);
  const [botResponseText, setBotResponseText] = useState<string | null>(null);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [isReadyForNext, setIsReadyForNext] = useState(false);
  const hasAutoSentRef = useRef(false);
  const hasAutoStartedRef = useRef(false);

  // Audio refs
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // TTS controls
  const { isPlaying, currentPlayingId, stopAudio, playAudio } = useTts();

  const doStopRecording = useCallback(() => {
    // Clear the auto-stop timer
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    // Immediately set to sending state
    setIsSending(true);
    
    stopRecording(
      setIsRecording,
      recordingTimerRef,
      animationFrameRef,
      mediaRecorderRef,
      audioStreamRef,
      audioAnalyserRef,
      audioDataRef
    );
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      audioStreamRef.current = stream;
      setupAudioVisualization(stream, audioAnalyserRef, audioDataRef, animationFrameRef, setAudioLevel);

      // Each stop will submit audio and update local text
      setupAudioRecording(
        stream,
        mediaRecorderRef,
        (text: string) => {
          setTranscribedText((prev) => (prev ? prev + " " : "") + text);
        },
        apiService.getSessionId(),
      );
      // Auto-stop after 8s if user doesn't stop earlier
      recordingTimerRef.current = setTimeout(() => {
        doStopRecording();
      }, 8000);
    } catch (err) {
      console.error("Voice dialog mic error:", err);
    }
  }, [doStopRecording]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      if (isRecording) doStopRecording();
      setTranscribedText("");
      setIsSending(false);
      setBotMessageId(null);
      setBotResponseText(null);
      setIsReadyForNext(false);
      hasAutoSentRef.current = false;
      hasAutoStartedRef.current = false;
    } else {
      // Reset auto-play when opening
      setAutoPlayEnabled(true);
      setIsReadyForNext(false);
      hasAutoStartedRef.current = false;
    }
  }, [open, isRecording, doStopRecording]);

  const handleConfirmSend = useCallback(async () => {
    if (!transcribedText.trim()) return;
    try {
      const result = await onSendVoice(transcribedText.trim());
      setBotMessageId(result.botMessageId);
      setBotResponseText(result.responseText);
      
      // Auto-play if enabled
      if (autoPlayEnabled && result.responseText && result.botMessageId) {
        // Small delay to ensure TTS is ready, keep loading state until audio starts
        setTimeout(() => {
          playAudio(result.responseText, result.botMessageId);
        }, 500);
      } else {
        // If autoplay disabled, exit loading state and reset
        setIsSending(false);
        setTimeout(() => {
          setBotMessageId(null);
          setBotResponseText(null);
          setTranscribedText("");
          hasAutoSentRef.current = false;
        }, 1000); // Show message briefly then reset
      }
    } catch (e) {
      console.error("Error sending voice text:", e);
      setIsSending(false);
    }
  }, [transcribedText, onSendVoice, autoPlayEnabled, playAudio]);

  // Auto-send when transcription is received and we're in sending state
  useEffect(() => {
    if (transcribedText.trim() && isSending && !hasAutoSentRef.current) {
      hasAutoSentRef.current = true;
      handleConfirmSend();
    }
  }, [transcribedText, isSending, handleConfirmSend]);

  // Exit loading state when audio starts playing
  useEffect(() => {
    if (botMessageId && isPlaying && currentPlayingId === botMessageId && isSending) {
      // Audio has started, exit loading state
      setIsSending(false);
    }
  }, [botMessageId, isPlaying, currentPlayingId, isSending]);

  // Set ready state when audio finishes playing naturally
  useEffect(() => {
    if (botMessageId && !isPlaying && !isSending && !isReadyForNext) {
      // Audio finished playing, show ready state for next question
      setTimeout(() => {
        setIsReadyForNext(true);
      }, 500); // Small delay to ensure audio has fully stopped
    }
  }, [botMessageId, isPlaying, isSending, currentPlayingId, isReadyForNext]);

  const isThisPlaying = botMessageId && isPlaying && currentPlayingId === botMessageId;

  // Define the current state for better UX
  const getCurrentState = () => {
    if (isRecording) return 'recording';
    if (isSending) return 'sending';
    if (autoPlayEnabled && botMessageId && isThisPlaying) return 'playing';
    if (isReadyForNext) return 'ready';
    // If we have a botMessageId but audio isn't playing and we're not ready, we're preparing
    if (botMessageId && !isThisPlaying && !isReadyForNext) return 'sending';
    return 'idle';
  };

  const currentState = getCurrentState();
  
  // Debug logging for state changes
  useEffect(() => {
    console.log('Current state changed to:', currentState);
  }, [currentState]);

  // Auto-start recording ONLY on initial dialog open
  useEffect(() => {
    if (open && !hasAutoStartedRef.current) {
      // Only auto-start if we haven't already auto-started in this session
      hasAutoStartedRef.current = true;
      setTimeout(() => startRecording(), 100); // Small delay to ensure dialog is fully rendered
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Intentionally only depend on 'open' to avoid re-triggering

  const handleMainButtonClick = () => {
    switch (currentState) {
      case 'idle':
        startRecording();
        break;
      case 'recording':
        doStopRecording();
        break;
      case 'playing':
        stopAudio();
        // Reset to allow new recording after stopping playback
        setBotMessageId(null);
        setBotResponseText(null);
        setTranscribedText("");
        setIsReadyForNext(false);
        hasAutoSentRef.current = false;
        break;
      case 'ready':
        // Reset all states and start new recording
        setBotMessageId(null);
        setBotResponseText(null);
        setTranscribedText("");
        setIsReadyForNext(false);
        hasAutoSentRef.current = false;
        startRecording();
        break;
      // 'sending' state - no action needed, just wait
    }
  };

  const handleEndAutoPlay = () => {
    setAutoPlayEnabled(false);
    if (isPlaying) {
      stopAudio();
    }
    // Reset to idle state
    setBotMessageId(null);
    setBotResponseText(null);
    setTranscribedText("");
    setIsReadyForNext(false);
    hasAutoSentRef.current = false;
  };

  const getButtonContent = () => {
    switch (currentState) {
      case 'idle':
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Mic className="h-12 w-12 text-primary" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse" />
            </div>
            <span className="text-lg font-medium">Tap to speak</span>
          </div>
        );
      
      case 'recording':
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <AudioWaveform isActive={true} audioLevel={audioLevel} />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-destructive animate-ping" />
            </div>
            <span className="text-lg font-medium text-destructive">Listening...</span>
            <span className="text-sm text-muted-foreground">Tap to stop</span>
          </div>
        );
      
      case 'sending':
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/30" />
            </div>
            <span className="text-lg font-medium">
              {botMessageId ? "Preparing audio..." : "Processing..."}
            </span>
            {transcribedText && (
              <div className="max-w-sm text-center">
                <span className="text-sm text-muted-foreground italic">
                  "{transcribedText.length > 50 ? transcribedText.substring(0, 50) + '...' : transcribedText}"
                </span>
              </div>
            )}
            {autoPlayEnabled && botMessageId && (
              <span className="text-xs text-muted-foreground">Audio will play automatically</span>
            )}
            {!autoPlayEnabled && botMessageId && (
              <span className="text-xs text-muted-foreground">Response sent to chat</span>
            )}
          </div>
        );
      
      case 'playing':
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Volume2 className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse" />
            </div>
            <span className="text-lg font-medium">Playing response</span>
            <span className="text-sm text-muted-foreground">Tap to interrupt</span>
          </div>
        );
      
      case 'ready':
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Mic className="h-12 w-12 text-green-600" />
              <div className="absolute inset-0 rounded-full border-2 border-green-600/30 animate-pulse" />
            </div>
            <span className="text-lg font-medium text-green-600">Ready for next question</span>
            <span className="text-sm text-muted-foreground">Tap to ask another question</span>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getButtonVariant = () => {
    switch (currentState) {
      case 'recording':
        return 'destructive';
      case 'playing':
        return 'default';
      case 'ready':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={cn(triggerClassName)} aria-label="Open voice assistant">
          <MicVocal className={triggerSize === "icon" ? "h-4 w-4" : "h-4 w-4 mr-2"} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        {/* Custom close/end button at top right */}
        <Button
          onClick={autoPlayEnabled && (currentState === 'playing' || (currentState === 'sending' && botMessageId)) ? handleEndAutoPlay : () => setOpen(false)}
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
          aria-label={autoPlayEnabled && (currentState === 'playing' || (currentState === 'sending' && botMessageId)) ? "End auto-play mode" : "Close"}
        >
          <X className="h-4 w-4 mr-1" />
          {autoPlayEnabled && (currentState === 'playing' || (currentState === 'sending' && botMessageId)) ? "End" : "Close"}
        </Button>
        
        <div className="flex flex-col items-center py-8">
          <Button
            onClick={handleMainButtonClick}
            variant={getButtonVariant()}
            disabled={currentState === 'sending'}
            className={cn(
              "h-48 w-48 rounded-full transition-all duration-300 hover:scale-105",
              "border-2 shadow-lg",
              currentState === 'recording' && "shadow-destructive/25",
              currentState === 'playing' && "shadow-primary/25"
            )}
            aria-label={`Voice assistant - ${currentState}`}
          >
            {getButtonContent()}
          </Button>
          
          {/* Status text for better UX */}
          {!autoPlayEnabled && (
            <div className="mt-4 text-center">
              <span className="text-sm text-muted-foreground">Auto-play disabled. Check chat for text response.</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VoiceAssistantDialog;


