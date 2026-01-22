import { useEffect, useRef, useState, createContext, useContext } from 'react';

interface AudioPlayerContextType {
  play: (audioBuffer: ArrayBuffer, messageId: string) => void;
  stop: () => void;
  isPlaying: boolean;
  currentMessageId: string;
  // Streaming controls
  startStream: (messageId: string, mimeType?: string) => boolean;
  appendToStream: (chunk: Uint8Array) => void;
  endStream: () => void;
  isStreaming: boolean;
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
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const chunkQueueRef = useRef<Uint8Array[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const pendingMimeTypeRef = useRef<string>('audio/mpeg');

  useEffect(() => {
    // Create audio element that will be reused
    const audio = new Audio();
    audioRef.current = audio;

    const finishPlayback = () => {
      setIsPlaying(false);
      setCurrentMessageId('');
      setIsStreaming(false);
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };

    audio.onended = finishPlayback;

    audio.onerror = finishPlayback;

    // Fallback: some browsers with MSE occasionally miss 'ended'.
    // Detect near-end during timeupdate and finalize.
    const onTimeUpdate = () => {
      try {
        const a = audioRef.current;
        if (!a) return;
        const duration = a.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;
        const epsilon = 0.2;
        if (a.currentTime > 0 && a.currentTime >= duration - epsilon) {
          // If source ended but 'ended' didn't fire, finalize.
          if (!a.paused) {
            // Let the browser settle; then pause to trigger cleanup
            a.pause();
          }
          finishPlayback();
        }
      } catch {
        // no-op
      }
    };
    audio.addEventListener('timeupdate', onTimeUpdate);

    // Cleanup
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = '';
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
      // Try to infer MIME type from bytes: 'ID3' or 0xFF 0xFB for MP3
      let mime: string = 'audio/wav';
      const view = new Uint8Array(audioBuffer.slice(0, 4));
      const isId3 = view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33; // 'ID3'
      const isMp3Frame = view[0] === 0xff && (view[1] & 0xe0) === 0xe0;
      if (isId3 || isMp3Frame) {
        mime = 'audio/mpeg';
      }

      const audioBlob = new Blob([audioBuffer], { type: mime });
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
    setIsStreaming(false);
    
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    // Teardown streaming if active
    if (mediaSourceRef.current) {
      try {
        if (sourceBufferRef.current && (sourceBufferRef.current as any).abort) {
          try { (sourceBufferRef.current as any).abort(); } catch (e) { console.warn('Abort sourceBuffer failed', e); }
        }
        if (mediaSourceRef.current.readyState === 'open') {
          mediaSourceRef.current.endOfStream();
        }
      } catch (e) { console.warn('Error during streaming teardown', e); }
    }
    mediaSourceRef.current = null;
    sourceBufferRef.current = null;
    chunkQueueRef.current = [];
  };

  const processQueue = () => {
    const sourceBuffer = sourceBufferRef.current;
    if (!sourceBuffer) return;
    if (sourceBuffer.updating) return;
    const next = chunkQueueRef.current.shift();
    if (!next) return;
    try {
      sourceBuffer.appendBuffer(next);
    } catch (e) {
      console.error('Error appending to SourceBuffer:', e);
    }
  };

  const startStream = (messageId: string, mimeType: string = 'audio/mpeg') => {
    stop();
    pendingMimeTypeRef.current = mimeType;

    if (!(window as any).MediaSource) {
      console.warn('MediaSource not supported in this browser. Falling back to non-streaming.');
      return false;
    }

    if (!(window as any).MediaSource.isTypeSupported?.(mimeType)) {
      console.warn(`MIME type not supported for streaming: ${mimeType}`);
      return false;
    }

    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    const objectUrl = URL.createObjectURL(mediaSource);
    audioUrlRef.current = objectUrl;
    setCurrentMessageId(messageId);
    setIsStreaming(true);

    if (audioRef.current) {
      audioRef.current.src = objectUrl;
    }

    mediaSource.addEventListener('sourceopen', () => {
      try {
        const sb = mediaSource.addSourceBuffer(mimeType);
        sourceBufferRef.current = sb;
        sb.addEventListener('updateend', processQueue);
        // Autoplay when data becomes available
        audioRef.current?.play().catch(() => {});
      } catch (e) {
        console.error('Failed to add SourceBuffer:', e);
      }
    });

    return true;
  };

  const appendToStream = (chunk: Uint8Array) => {
    if (!sourceBufferRef.current) {
      // queue until source buffer is ready
      chunkQueueRef.current.push(chunk);
      return;
    }
    chunkQueueRef.current.push(chunk);
    processQueue();
    setIsPlaying(true);
  };

  const endStream = () => {
    try {
      const ms = mediaSourceRef.current;
      const sb = sourceBufferRef.current;
      
      if (ms && ms.readyState === 'open') {
        // If SourceBuffer is updating, wait for it to finish before ending stream
        if (sb && sb.updating) {
          const waitForUpdate = () => {
            if (!sb.updating) {
              try {
                ms.endOfStream();
              } catch (e) {
                console.warn('Error ending MediaSource stream after waiting:', e);
              }
              setIsStreaming(false);
            } else {
              // Check again in next frame
              requestAnimationFrame(waitForUpdate);
            }
          };
          waitForUpdate();
        } else {
          ms.endOfStream();
          setIsStreaming(false);
        }
      } else {
        setIsStreaming(false);
      }
    } catch (e) {
      console.warn('Error ending MediaSource stream:', e);
      setIsStreaming(false);
    }
  };

  const value = {
    play,
    stop,
    isPlaying,
    currentMessageId,
    startStream,
    appendToStream,
    endStream,
    isStreaming
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}; 