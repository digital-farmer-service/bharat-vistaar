import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
  retryWithBackoff,
  isRetryableError,
  type RetryConfig,
} from "./retry-utils";
import { API_RETRY_CONFIG } from "@/config/retry";

declare global {
  interface Window {
    __ENV__?: {
      VITE_API_URL?: string;
      VITE_BACKEND_AUTH_URL?: string;
    };
  }
}

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

// Response shape from the backend token endpoint:
//   POST <VITE_BACKEND_AUTH_URL>?tenantId=br  {}  ->  { token, expiresAt (ISO), cached }
interface AuthTokenResponse {
  token?: string;
  expiresAt?: string;
  cached?: boolean;
}

// localStorage key holding { token, expiry(ms) }
const JWT_STORAGE_KEY = "auth_jwt";
// Refresh a bit before the server-declared expiry to avoid racing the boundary.
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;
// Fallback lifetime when the response omits/garbles expiresAt.
const TOKEN_FALLBACK_LIFETIME_MS = 10 * 60 * 1000;

class ApiService {
  private apiUrl: string = window.__ENV__?.VITE_API_URL || "https://dev-vistaar.da.gov.in";
  private locationData: LocationData | null = null;
  private currentSessionId: string | null = null;
  private axiosInstance: AxiosInstance;
  private authToken: string | null = null;
  private tokenExpiresAt: number | null = null; // epoch ms
  private retryConfig: RetryConfig = API_RETRY_CONFIG;
  // Single shared in-flight token fetch so concurrent callers coalesce to one request.
  private tokenFetchInFlight: Promise<string> | null = null;

  constructor() {
    this.restoreToken();
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authToken ? `Bearer ${this.authToken}` : "NA",
      },
    });

    // 401/403 interceptor: fetch a fresh token once and retry the original request.
    // Native fetch() paths (streaming) handle their own single retry inline.
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config as
          | (InternalAxiosRequestConfig & { _retried?: boolean })
          | undefined;
        const status = error.response?.status;

        if (
          !originalRequest ||
          (status !== 401 && status !== 403) ||
          originalRequest._retried
        ) {
          return Promise.reject(error);
        }
        originalRequest._retried = true;

        try {
          const newToken = await this.fetchAuthToken();
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return this.axiosInstance(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
    );
  }

  // ---- Token lifecycle -----------------------------------------------------

  /** Backend auth endpoint. Warns (no silent fallback) if misconfigured. */
  private authEndpoint(): string {
    const url = window.__ENV__?.VITE_BACKEND_AUTH_URL;
    if (!url) {
      console.warn(
        "VITE_BACKEND_AUTH_URL is not configured; auth token requests will fail. " +
          "Set window.__ENV__.VITE_BACKEND_AUTH_URL (env-config.js)."
      );
    }
    return url as string;
  }

  private persistToken(token: string, expiryMs: number): void {
    try {
      localStorage.setItem(
        JWT_STORAGE_KEY,
        JSON.stringify({ token, expiry: expiryMs })
      );
    } catch (error) {
      console.error("Error persisting auth token:", error);
    }
  }

  private restoreToken(): void {
    try {
      const raw = localStorage.getItem(JWT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { token?: string; expiry?: number };
      if (parsed?.token && typeof parsed.expiry === "number") {
        this.authToken = parsed.token;
        this.tokenExpiresAt = parsed.expiry;
      }
    } catch (error) {
      console.error("Error restoring auth token:", error);
    }
  }

  /**
   * Fetch a fresh token from the backend and store it.
   * Single-flight: concurrent callers share one network request.
   */
  async fetchAuthToken(): Promise<string> {
    if (this.tokenFetchInFlight) return this.tokenFetchInFlight;

    const inFlight = (async (): Promise<string> => {
      // Bare axios (not axiosInstance) — no bearer on the auth call, avoids the
      // 401/403 interceptor recursing into itself.
      const response = await axios.post(this.authEndpoint(), {}, {
        headers: { "Content-Type": "application/json" },
        params: { tenantId: "br" }, // DIGIT tenant — required by gateway routing/authz
      });

      const data = (response.data ?? {}) as AuthTokenResponse;
      const token = data.token;
      if (!token) {
        throw new Error("Auth token endpoint returned no token");
      }

      const parsed = data.expiresAt ? Date.parse(data.expiresAt) : NaN;
      const expiryMs = Number.isNaN(parsed)
        ? Date.now() + TOKEN_FALLBACK_LIFETIME_MS
        : parsed;

      this.authToken = token;
      this.tokenExpiresAt = expiryMs;
      this.persistToken(token, expiryMs);
      this.axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      return token;
    })();

    this.tokenFetchInFlight = inFlight;
    try {
      return await inFlight;
    } finally {
      this.tokenFetchInFlight = null;
    }
  }

  /** Return a usable token, refreshing if missing or within the expiry buffer. */
  async getValidToken(): Promise<string> {
    if (
      this.authToken &&
      this.tokenExpiresAt &&
      Date.now() < this.tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS
    ) {
      return this.authToken;
    }
    return this.fetchAuthToken();
  }

  /** Ensure a token exists (used by AuthContext on mount). */
  async ensureToken(): Promise<void> {
    await this.getValidToken();
  }

  /** Drop all token state. */
  clearToken(): void {
    this.authToken = null;
    this.tokenExpiresAt = null;
    try {
      localStorage.removeItem(JWT_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing auth token:", error);
    }
    this.axiosInstance.defaults.headers.common["Authorization"] = "NA";
  }

  // ---- Retry config --------------------------------------------------------

  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  // ---- Chat / TTS ----------------------------------------------------------

  async sendUserQuery(
    msg: string,
    session: string,
    sourceLang: string,
    targetLang: string,
    onStreamData?: (data: string) => void,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<ChatResponse> {
    const executeQuery = async (): Promise<ChatResponse> => {
      const token = await this.getValidToken();

      const params = {
        session_id: session,
        query: msg,
        source_lang: sourceLang,
        target_lang: targetLang,
        ...(this.locationData && {
          location: `${this.locationData.latitude},${this.locationData.longitude}`,
        }),
      };

      if (onStreamData) {
        // Streaming response via native fetch (axios can't stream in the browser).
        const url = `${this.apiUrl}/api/chat/?${new URLSearchParams(params)}`;
        let response = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        // One fresh-token retry on auth failure.
        if (!response.ok && (response.status === 401 || response.status === 403)) {
          const freshToken = await this.fetchAuthToken();
          response = await fetch(url, {
            method: "GET",
            headers: { Authorization: `Bearer ${freshToken}` },
          });
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        let fullResponse = "";
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          onStreamData(chunk);
        }

        return { response: fullResponse, status: "success" };
      } else {
        // Regular non-streaming request (interceptor handles 401/403 retry).
        const config = {
          params,
          headers: { Authorization: `Bearer ${token}` },
        };
        const response = await this.axiosInstance.get("/api/chat/", config);
        return response.data;
      }
    };

    try {
      return await retryWithBackoff(
        executeQuery,
        this.retryConfig,
        onRetry,
        isRetryableError
      );
    } catch (error) {
      console.error("Error sending user query after retries:", error);
      throw error;
    }
  }

  async getSuggestions(
    session: string,
    targetLang: string = "hi"
  ): Promise<SuggestionItem[]> {
    const executeSuggestions = async (): Promise<SuggestionItem[]> => {
      const token = await this.getValidToken();

      const params = {
        session_id: session,
        target_lang: targetLang,
      };

      const config = {
        params,
        headers: { Authorization: `Bearer ${token}` },
      };

      const response = await this.axiosInstance.get("api/suggest/", config);
      return response.data.map((item: string) => ({
        question: item,
      }));
    };

    try {
      return await retryWithBackoff(
        executeSuggestions,
        this.retryConfig,
        undefined,
        isRetryableError
      );
    } catch (error) {
      console.error("Error getting suggestions after retries:", error);
      throw error;
    }
  }

  async transcribeAudio(
    audioBase64: string,
    serviceType: string = "bhashini",
    sessionId: string,
    lang_code: string
  ): Promise<TranscriptionResponse> {
    try {
      const token = await this.getValidToken();

      const payload = {
        audio_content: audioBase64,
        service_type: serviceType,
        session_id: sessionId,
        lang_code: lang_code,
      };

      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const response = await this.axiosInstance.post(
        "api/transcribe/",
        payload,
        config
      );
      return response.data;
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw error;
    }
  }

  async getTranscript(
    sessionId: string,
    text: string,
    targetLang: string
  ): Promise<AxiosResponse<TTSResponse>> {
    const token = await this.getValidToken();

    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };

    return this.axiosInstance.post(
      `api/tts/`,
      {
        session_id: sessionId,
        text: text,
        target_lang: targetLang,
      },
      config
    );
  }

  // Stream TTS response and emit decoded audio bytes progressively
  async streamTranscript(
    sessionId: string,
    text: string,
    targetLang: string,
    onBytes: (bytes: Uint8Array) => void
  ): Promise<Uint8Array> {
    const token = await this.getValidToken();

    const payload = {
      session_id: sessionId,
      text: text,
      target_lang: targetLang,
    };
    const doFetch = (bearer: string) =>
      fetch(`${this.apiUrl}/api/tts/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(payload),
      });

    let response = await doFetch(token);

    // One fresh-token retry on auth failure.
    if (!response.ok && (response.status === 401 || response.status === 403)) {
      const freshToken = await this.fetchAuthToken();
      response = await doFetch(freshToken);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      // Fallback to non-streaming JSON if body isn't readable
      const json = await response.json();
      const base64 = (json?.audio_data ||
        json?.data?.audio_data ||
        "") as string;
      if (!base64) return new Uint8Array();
      const binaryString = atob(base64);
      const out = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++)
        out[i] = binaryString.charCodeAt(i);
      onBytes(out);
      return out;
    }

    const decoder = new TextDecoder();
    let textBuf = "";
    let base64Buf = "";
    let foundStart = false;
    const chunks: Uint8Array[] = [];

    const flushDecodable = () => {
      // Only decode multiples of 4 to keep Base64 alignment
      const len = base64Buf.length - (base64Buf.length % 4);
      if (len <= 0) return;
      const slice = base64Buf.slice(0, len);
      base64Buf = base64Buf.slice(len);
      if (!slice) return;
      try {
        const bin = atob(slice);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        onBytes(bytes);
        chunks.push(bytes);
      } catch (e) {
        console.warn(
          "Base64 decode failed for slice; skipping until next chunk"
        );
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const part = decoder.decode(value, { stream: true });
      textBuf += part;

      if (!foundStart) {
        const idx = textBuf.indexOf('"audio_data"');
        if (idx >= 0) {
          // Find the first quote after colon
          const colonIdx = textBuf.indexOf(":", idx);
          const firstQuote = textBuf.indexOf('"', colonIdx + 1);
          if (firstQuote >= 0) {
            foundStart = true;
            // Everything after firstQuote+1 contributes to base64, until closing quote
            base64Buf += textBuf.slice(firstQuote + 1);
          }
        }
      } else {
        base64Buf += part;
      }

      if (foundStart) {
        // Stop consuming when we reach a closing quote for audio_data
        const closing = base64Buf.indexOf('"');
        if (closing >= 0) {
          const b64 = base64Buf.slice(0, closing);
          base64Buf = b64; // trim to exact content
          flushDecodable();
          // Decode any leftover
          if (base64Buf.length > 0) {
            try {
              const bin = atob(base64Buf);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              onBytes(bytes);
              chunks.push(bytes);
            } catch (e) {
              console.warn("Final base64 decode failed", e);
            }
          }
          break; // We are done reading audio_data field
        } else {
          flushDecodable();
        }
      }
    }

    // Concatenate chunks to a single Uint8Array
    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    const out = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }

  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64String = (reader.result as string).split(",")[1];
          resolve(base64String);
        } catch (error) {
          reject(new Error("Failed to convert blob to base64"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read blob"));
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
