import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "@/components/AudioWaveform";
import { setupAudioRecording, setupAudioVisualization, stopRecording } from "@/lib/audio-utils";
import apiService from "@/lib/api";
import { useTts } from "@/hooks/use-tts";
import { cn } from "@/lib/utils";
import { Mic, Loader2, Volume2, X } from "lucide-react";

interface VoiceAssistantInlineProps {
  onSendVoice: (text: string) => Promise<{ botMessageId: string; responseText: string }>;
  className?: string;
  autoStart?: boolean;
  onClose?: () => void;
}

export default function VoiceAssistantInline({ onSendVoice, className, autoStart = true, onClose }: VoiceAssistantInlineProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0.5);
  const [transcribedText, setTranscribedText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [botMessageId, setBotMessageId] = useState<string | null>(null);
  const [botResponseText, setBotResponseText] = useState<string | null>(null);
  const [autoPlayEnabled] = useState(true);
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
      console.error("Inline voice mic error:", err);
      // Reset to idle state on mic error instead of closing
      setIsRecording(false);
      setTranscribedText("");
      setIsSending(false);
    }
  }, [doStopRecording]);

  // Auto start when mounted if requested - only once
  useEffect(() => {
    if (autoStart && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      setTimeout(() => startRecording(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]); // Intentionally only depend on 'autoStart' to avoid re-triggering

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
        // If autoplay disabled, exit loading state and return to idle
        setIsSending(false);
        setTimeout(() => {
          setBotMessageId(null);
          setBotResponseText(null);
          setTranscribedText("");
          hasAutoSentRef.current = false;
        }, 1000);
      }
    } catch (e) {
      console.error("Error sending voice text:", e);
      setIsSending(false);
      // Reset to idle state on error instead of closing
      setBotMessageId(null);
      setBotResponseText(null);
      setTranscribedText("");
      hasAutoSentRef.current = false;
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

  // Define the current state for better UX (same as dialog)
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
        // Reset to idle state instead of closing
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

  const ringClass = () => {
    switch (currentState) {
      case 'recording':
        return "border-destructive";
      case 'playing':
        return "border-primary";
      case 'ready':
        return "border-green-500"; // Keep green for ready state as it's appropriate
      case 'sending':
        return "border-orange-500"; // Keep orange for processing state
      default:
        return "border-primary";
    }
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-2 p-3 rounded-xl bg-muted border-2 border-border shadow-lg transition-all duration-300",
        className
      )}
      aria-label="Inline voice assistant"
    >
      {/* Status indicator */}
      <div className="flex items-center justify-center">
        <div
          className={cn(
            "relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 bg-background"
          )}
        >
          {/* Animated ring */}
          <div className={cn("absolute inset-0 rounded-full border-2", ringClass())} />
          
          {/* Main icon */}
          {currentState === 'recording' ? (
            <AudioWaveform isActive={true} audioLevel={audioLevel} />
          ) : currentState === 'sending' ? (
            <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
          ) : currentState === 'playing' ? (
            <Volume2 className="h-4 w-4 text-primary" />
          ) : currentState === 'ready' ? (
            <Mic className="h-4 w-4 text-green-600" />
          ) : (
            <Mic className="h-4 w-4 text-foreground" />
          )}
        </div>
      </div>

      {/* Status text */}
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-foreground transition-colors">
          {currentState === 'recording' && "Listening..."}
          {currentState === 'sending' && "Processing..."}
          {currentState === 'playing' && "Playing"}
          {currentState === 'ready' && "Ready"}
          {currentState === 'idle' && "Voice"}
        </span>
        
        {transcribedText && currentState === 'sending' && (
          <span className="text-xs text-muted-foreground max-w-24 truncate">
            "{transcribedText.length > 20 ? transcribedText.substring(0, 20) + '...' : transcribedText}"
          </span>
        )}
      </div>

      {/* Main button (invisible overlay for click handling) */}
      <button
        onClick={handleMainButtonClick}
        disabled={currentState === 'sending'}
        className="absolute inset-0 w-full h-full rounded-xl cursor-pointer disabled:cursor-not-allowed"
        aria-label={`Voice assistant - ${currentState}`}
      />

      {/* Close button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isRecording) doStopRecording();
          if (isPlaying) stopAudio();
          if (onClose) onClose();
        }}
        aria-label="Close voice assistant"
        className="relative z-10 ml-auto p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}


