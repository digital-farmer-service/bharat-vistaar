import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { environment } from '@/config/environment';

export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface ChatResponse {
  response: string;
  status: string;
}

export interface TranscriptionResponse {
  text: string;
  lang_code: string;
  status: string;
}

export interface SuggestionItem {
  question: string;
}

interface TTSResponse {
  status: string;
  audio_data: string;
  session_id: string;
}

// Constants
const JWT_STORAGE_KEY = 'auth_jwt';

class ApiService {
  private apiUrl: string = environment.apiUrl;
  private locationData: LocationData | null = null;
  private currentSessionId: string | null = null;
  private axiosInstance: AxiosInstance;
  private authToken: string | null = null;  

  constructor() {
    this.authToken = this.getAuthToken();
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authToken ? `Bearer ${this.authToken}` : 'NA'
      }
    });
    
    // Log the token being used
    // console.log('Using auth token:', this.authToken );
  }

  private getAuthToken(): string | null {
    try {
      const tokenData = localStorage.getItem(JWT_STORAGE_KEY);
      if (!tokenData) return null;
      
      const parsedData = JSON.parse(tokenData);
      const now = new Date().getTime();
      
      // Check if token is expired
      if (now > parsedData.expiry) {
        localStorage.removeItem(JWT_STORAGE_KEY);
        return null;
      }
      
      return parsedData.token;
    } catch (error) {
      console.error("Error retrieving JWT for API calls:", error);
      return null;
    }
  }

  private refreshAuthToken(): void {
    this.authToken = this.getAuthToken();
    if (this.authToken) {
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
    } else {
      this.axiosInstance.defaults.headers.common['Authorization'] = 'NA';
      this.redirectToErrorPage();
    }
  }
  
  private redirectToErrorPage(): void {
    // Check if we're in a browser environment and not already on error page
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/error')) {
      window.location.href = '/error?reason=auth';
    }
  }

  updateAuthToken(): void {
    this.refreshAuthToken();
  }

  private getAuthHeaders(): Record<string, string> {
    // Always get fresh token before generating headers
    this.refreshAuthToken();
    return {
      'Authorization': this.authToken ? `Bearer ${this.authToken}` : 'NA'
    };
  }

  private validateAuth(): boolean {
    if (!this.authToken) {
      this.redirectToErrorPage();
      return false;
    }
    return true;
  }

  async sendUserQuery(
    msg: string,
    session: string,
    sourceLang: string,
    targetLang: string,
    onStreamData?: (data: string) => void
  ): Promise<ChatResponse> {
    try {
      this.refreshAuthToken();
      if (!this.validateAuth()) {
        return { response: "Authentication error", status: "error" };
      }
      
      const params = {
        session_id: session,
        query: msg,
        source_lang: sourceLang,
        target_lang: targetLang,
        ...(this.locationData && { location: `${this.locationData.latitude},${this.locationData.longitude}` })
      };

      const headers = this.getAuthHeaders();

      if (onStreamData) {
        // Handle streaming response
        const response = await fetch(`${this.apiUrl}/api/chat/?${new URLSearchParams(params)}`, {
          method: 'GET',
          headers: headers          
        });

        if (!response.ok) {
          if (response.status === 429) {
            const error = new Error('Rate limit exceeded');
            (error as any).status = 429;
            throw error;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        let fullResponse = '';
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          onStreamData(chunk);
        }

        return { response: fullResponse, status: 'success' };
      } else {
        // Regular non-streaming request
        const config = {
          params,
          headers: this.getAuthHeaders()
        };
        const response = await this.axiosInstance.get('/api/chat/', config);
        return response.data;
      }
    } catch (error) {
      console.error('Error sending user query:', error);
      throw error;
    }
  }

  async getSuggestions(session: string, targetLang: string = 'mr'): Promise<SuggestionItem[]> {
    try {
      this.refreshAuthToken();
      if (!this.validateAuth()) {
        return [];
      }
      
      const params = {
        session_id: session,
        target_lang: targetLang
      };

      const config = {
        params,
        headers: this.getAuthHeaders()
      };

      const response = await this.axiosInstance.get('/api/suggest/', config);
      return response.data.map((item: string) => ({
        question: item
      }));
    } catch (error) {
      console.error('Error getting suggestions:', error);
      throw error;
    }
  }

  async transcribeAudio(
    audioBase64: string,
    serviceType: string = 'whisper',
    sessionId: string
  ): Promise<TranscriptionResponse> {
    try {
      this.refreshAuthToken();
      if (!this.validateAuth()) {
        return { text: "", lang_code: "", status: "error" };
      }
      
      const payload = {
        audio_content: audioBase64,
        service_type: serviceType,
        session_id: sessionId
      };

      // Explicitly set headers for this request
      const config = {
        headers: this.getAuthHeaders()
      };

      const response = await this.axiosInstance.post('/api/transcribe/', payload, config);
      return response.data;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  getTranscript(sessionId: string, text: string, targetLang: string): Promise<AxiosResponse<TTSResponse>> {
    this.refreshAuthToken();
    if (!this.validateAuth()) {
      return Promise.reject(new Error("Authentication required"));
    }
    
    const config = {
      headers: this.getAuthHeaders()
    };
    
    return this.axiosInstance.post(`/api/tts/`, {
      session_id: sessionId,
      text: text,
      target_lang: targetLang
    }, config);
  }

  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        } catch (error) {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  }

  setLocationData(location: LocationData): void {
    this.locationData = location;
  }

  getLocationData(): LocationData | null {
    return this.locationData;
  }

  setSessionId(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  getSessionId(): string | null {
    return this.currentSessionId;
  }
}

// Create a singleton instance
const apiService = new ApiService();
export default apiService; 