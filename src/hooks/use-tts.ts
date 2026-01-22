import { useState, useRef, useCallback } from 'react';
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
  const { play, stop, isPlaying, currentMessageId } = useAudioPlayer();

  const updateAudioState = useCallback((messageId: string, state: 'idle' | 'loading' | 'ready' | 'playing') => {
    setAudioState(prev => ({
      ...prev,
      [messageId]: state
    }));
  }, []);

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
      
      // Call the new getTranscript API
      const response = await apiService.getTranscript(sessionId, text, language);
      
      if (response.data.audio_data) {
        const audioBuffer = base64ToArrayBuffer(response.data.audio_data);
        audioCache.current.set(messageId, audioBuffer);
        
        if (!pendingPlayRequests.current.get(messageId)) {
          return;
        }
        
        pendingPlayRequests.current.delete(messageId);
        return playAudioFromBuffer(audioBuffer, messageId);
      } else {
        throw new Error('No audio data received');
      }
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
      stopAudio();
    } else {
      stopAudio();
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