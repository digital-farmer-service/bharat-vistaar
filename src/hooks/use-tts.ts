import { useState, useRef, useCallback, useEffect } from 'react';
import apiService from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/LanguageProvider';
import { useAudioPlayer } from '@/components/AudioPlayer';

interface AudioState {
  [key: string]: 'idle' | 'loading' | 'ready' | 'playing';
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function useTts() {
  const [audioState, setAudioState] = useState<AudioState>({});
  const audioCache = useRef(new Map<string, ArrayBuffer>());
  const pendingPlayRequests = useRef(new Map<string, boolean>());
  const { language, t } = useLanguage();
  const { play, stop, isPlaying, currentMessageId, startStream, appendToStream, endStream } = useAudioPlayer();

  const updateAudioState = useCallback((messageId: string, state: 'idle' | 'loading' | 'ready' | 'playing') => {
    setAudioState(prev => ({
      ...prev,
      [messageId]: state
    }));
  }, []);

  // Sync local audioState when AudioPlayer's isPlaying changes
  useEffect(() => {
    if (currentMessageId) {
      if (isPlaying) {
        updateAudioState(currentMessageId, 'playing');
      } else {
        // Audio stopped playing - transition to ready
        updateAudioState(currentMessageId, 'ready');
      }
    }
  }, [isPlaying, currentMessageId, updateAudioState]);

  const stopAudio = useCallback(() => {
    pendingPlayRequests.current.clear();
    
    if (currentMessageId) {
      stop();
      updateAudioState(currentMessageId, 'ready');
    }
  }, [currentMessageId, stop, updateAudioState]);

  const playAudioFromBuffer = useCallback(async (audioBuffer: ArrayBuffer, messageId: string) => {
    try {
      updateAudioState(messageId, 'playing');
      await play(audioBuffer, messageId);
    } catch (error) {
      console.error('Error playing audio:', error);
      updateAudioState(messageId, 'ready');
      throw error;
    }
  }, [play, updateAudioState]);

  const playAudio = useCallback(async (text: string, messageId: string) => {
    pendingPlayRequests.current.set(messageId, true);
    
    try {
      if (audioCache.current.has(messageId)) {
        const audioBuffer = audioCache.current.get(messageId)!;
        pendingPlayRequests.current.delete(messageId);
        return playAudioFromBuffer(audioBuffer, messageId);
      }

      updateAudioState(messageId, 'loading');
      
      // Get the session ID from the API service
      const sessionId = apiService.getSessionId() || '';
      
      // Attempt streaming first. If not supported, fallback to non-streaming.
      const streamingSupported = startStream(messageId, 'audio/mpeg');
      const collected = await apiService.streamTranscript(
        sessionId,
        text,
        language,
        (bytes) => {
          if (!pendingPlayRequests.current.get(messageId)) return;
          if (streamingSupported) {
            appendToStream(bytes);
          }
        }
      );
      // finalize stream
      if (streamingSupported) {
        endStream();
      }
      // Cache and optionally auto play from full data if not played already
      if (collected && collected.length > 0) {
        const audioBuffer = collected.buffer.slice(collected.byteOffset, collected.byteOffset + collected.byteLength);
        audioCache.current.set(messageId, audioBuffer as ArrayBuffer);
        if (!pendingPlayRequests.current.get(messageId)) {
          return;
        }
        pendingPlayRequests.current.delete(messageId);
        
        // If streaming was used, check if audio is actually playing
        // If not (e.g., autoplay was blocked), fallback to playing from buffer
        if (streamingSupported) {
          // Give stream a moment to start playing, then check
          await new Promise(resolve => setTimeout(resolve, 100));
          if (!isPlaying) {
            // Streaming didn't auto-play (browser blocked it), play from buffer
            return playAudioFromBuffer(audioBuffer as ArrayBuffer, messageId);
          }
          // Audio is already playing via stream, let it continue
          updateAudioState(messageId, 'playing');
          return;
        }
        
        // Streaming not supported, play from buffer
        return playAudioFromBuffer(audioBuffer as ArrayBuffer, messageId);
      }
      throw new Error('No audio data received');
    } catch (error) {
      console.error('Error in playAudio:', error);
      pendingPlayRequests.current.delete(messageId);
      updateAudioState(messageId, 'idle');
      toast({
        title: t("toast.errorPlayingAudio.title") as string,
        description: t("toast.errorPlayingAudio.description") as string,
        variant: "yellow",
      });
    }
  }, [playAudioFromBuffer, updateAudioState, language, t]);

  const toggleAudio = useCallback((text: string, messageId: string) => {
    if (isPlaying && currentMessageId === messageId) {
      // Currently playing this message - stop it
      stopAudio();
    } else {
      // Not playing this message - start playing
      // Only stop if something else is playing
      if (isPlaying && currentMessageId && currentMessageId !== messageId) {
        stopAudio();
      }
      playAudio(text, messageId);
    }
  }, [isPlaying, currentMessageId, stopAudio, playAudio]);

  return {
    isPlaying,
    currentPlayingId: currentMessageId,
    audioState,
    toggleAudio,
    stopAudio,
    playAudio
  };
} 