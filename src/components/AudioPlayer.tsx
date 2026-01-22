import { useEffect, useRef, useState, createContext, useContext } from 'react';

interface AudioPlayerContextType {
  play: (audioBuffer: ArrayBuffer, messageId: string) => void;
  stop: () => void;
  isPlaying: boolean;
  currentMessageId: string;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

export const AudioPlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Create audio element that will be reused
    const audio = new Audio();
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentMessageId('');
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };

    audio.onerror = () => {
      setIsPlaying(false);
      setCurrentMessageId('');
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };

    // Cleanup
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const play = async (audioBuffer: ArrayBuffer, messageId: string) => {
    // Stop any currently playing audio
    stop();

    try {
      if (!audioRef.current) return;

      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      // Set the source and load the audio
      audioRef.current.src = audioUrl;
      
      await audioRef.current.play();
      
      setIsPlaying(true);
      setCurrentMessageId(messageId);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      setCurrentMessageId('');
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    }
  };

  const stop = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    
    setIsPlaying(false);
    setCurrentMessageId('');
    
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const value = {
    play,
    stop,
    isPlaying,
    currentMessageId
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}; 