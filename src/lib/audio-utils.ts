import apiService from '@/lib/api';

// Types for transcription response
interface TranscriptionResponse {
  text: string;
  lang_code: string;
  status: string;
}

/**
 * Sets up audio visualization for recording
 */
export const setupAudioVisualization = (
  stream: MediaStream,
  analyserRef: React.MutableRefObject<AnalyserNode | null>,
  dataRef: React.MutableRefObject<Uint8Array | null>,
  animationFrameRef: React.MutableRefObject<number | null>,
  setAudioLevel: (level: number) => void
) => {
  // Create audio context for visualization
  const AudioContextClass = window.AudioContext || 
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextClass();
  const analyser = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);
  microphone.connect(analyser);
  analyser.fftSize = 256;
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  analyserRef.current = analyser;
  dataRef.current = dataArray;
  
  const updateAudioLevel = () => {
    if (!analyserRef.current || !dataRef.current) return;
    
    analyserRef.current.getByteFrequencyData(dataRef.current);
    
    let sum = 0;
    for (let i = 0; i < dataRef.current.length; i++) {
      sum += dataRef.current[i];
    }
    const average = sum / dataRef.current.length;
    const normalizedLevel = average / 255;
    
    setAudioLevel(normalizedLevel);
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  };
  
  updateAudioLevel();
};

/**
 * Sets up the audio recording with MediaRecorder
 */
export const setupAudioRecording = (
  stream: MediaStream,
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>,
  handleAudioCallback: (text: string) => void,
  sessionId: string | null,
  toastFn?: (props: { title: string; description: string; variant: "default" | "destructive" | "yellow" }) => void
) => {
  // Create MediaRecorder
  const mediaRecorder = new MediaRecorder(stream);
  mediaRecorderRef.current = mediaRecorder;
  const audioChunks: BlobPart[] = [];
  
  // Configure audio context for processing after recording
  const AudioContextClass = window.AudioContext || 
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  
  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  });
  
  mediaRecorder.addEventListener("stop", async () => {
    // Combine all audio chunks
    const audioBlob = new Blob(audioChunks);
    
    try {
      // Process and optimize audio for transcription
      const audioContext = new AudioContextClass();
      
      // Convert to ArrayBuffer for processing
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create optimal WAV file for transcription
      const optimizedBlob = await createOptimizedWav(audioBuffer);
      handleAudioSubmission(optimizedBlob, handleAudioCallback, sessionId, toastFn);
    } catch (error) {
      console.error("Error processing audio, using original:", error);
      // Fall back to original audio if processing fails
      handleAudioSubmission(audioBlob, handleAudioCallback, sessionId, toastFn);
    }
  });
  
  // Start recording with 1-second chunks
  mediaRecorder.start(1000);
};

/**
 * Processes recorded audio and submits for transcription
 */
const handleAudioSubmission = async (
  audioBlob: Blob, 
  handleAudioCallback: (text: string) => void,
  sessionId: string | null,
  toastFn?: (props: { title: string; description: string; variant: "default" | "destructive" | "yellow" }) => void
) => {
  try {
    const base64Audio = await apiService.blobToBase64(audioBlob);
    // Transcribe the audio with Bhashini Pipeline Compute Call
    const transcription = await apiService.transcribeAudio(
      base64Audio,
      'bhashini', // real Bhashini service ID string
      sessionId
    ) as TranscriptionResponse;
    
    if (transcription && transcription.text) {
      handleAudioCallback(transcription.text);
    } else {
      console.error("Failed to transcribe audio");
      if (toastFn) {
        toastFn({
          title: "Audio Not Recognized",
          description: "We couldn't understand your voice recording. Please try speaking more clearly or type your question instead.",
          variant: "yellow"
        });
      }
    }
  } catch (error) {
    console.error("Error processing audio:", error);
    if (toastFn) {
      toastFn({
        title: "Audio Not Recognized",
        description: "We couldn't understand your voice recording. Please try speaking more clearly or type your question instead.",
        variant: "yellow"
      });
    }
  }
};

/**
 * Creates an optimized WAV file for speech recognition
 */
const createOptimizedWav = async (audioBuffer: AudioBuffer): Promise<Blob> => {
  // Create offline context with 16kHz sample rate (optimal for most speech recognition)
  const offlineContext = new OfflineAudioContext({
    numberOfChannels: 1, // mono (better for speech)
    length: audioBuffer.duration * 16000,
    sampleRate: 16000
  });
  
  // Create source from original audio
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();
  
  // Render optimized audio
  const renderedBuffer = await offlineContext.startRendering();
  
  // Convert to WAV format
  return bufferToWav(renderedBuffer);
};

/**
 * Converts AudioBuffer to WAV Blob
 */
const bufferToWav = (buffer: AudioBuffer): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  
  // Create buffer with WAV header + data
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  
  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // format chunk length
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * bytesPerSample, true); // bits per sample
  
  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write audio data
  const offset = 44;
  const channelData = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(buffer.getChannelData(i));
  }
  
  // Interleave channel data and convert to 16-bit
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      // Convert float sample (-1.0...1.0) to 16-bit PCM
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset + (i * blockAlign) + (channel * bytesPerSample), value, true);
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

/**
 * Helper to write string to DataView
 */
const writeString = (view: DataView, offset: number, string: string): void => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Stops recording and cleans up resources
 */
export const stopRecording = (
  setIsRecording: (isRecording: boolean) => void,
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  animationFrameRef: React.MutableRefObject<number | null>,
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>,
  streamRef: React.MutableRefObject<MediaStream | null>,
  analyserRef: React.MutableRefObject<AnalyserNode | null>,
  dataRef: React.MutableRefObject<Uint8Array | null>,
) => {
  setIsRecording(false);
  
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
  
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }
  
  if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
    mediaRecorderRef.current.stop();
  }
  
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;
  }
  
  analyserRef.current = null;
  dataRef.current = null;
  mediaRecorderRef.current = null;
}; 