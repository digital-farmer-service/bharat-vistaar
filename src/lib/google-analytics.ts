// Google Analytics utility functions
// Measurement ID: G-SV0TLS2S41

declare global {
  interface Window {
    gtag: (
      command: string,
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}

/**
 * Initialize Google Analytics
 * This is called automatically when the script loads, but can be used for re-initialization
 */
export const initGoogleAnalytics = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-SV0TLS2S41', {
      page_path: window.location.pathname,
    });
  }
};

/**
 * Track page views
 */
export const trackPageView = (path: string, title?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-SV0TLS2S41', {
      page_path: path,
      page_title: title || document.title,
    });
  }
};

/**
 * Track custom events
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

/**
 * Track user login
 */
export const trackLogin = (method?: string) => {
  trackEvent('login', {
    method: method || 'unknown',
  });
};

/**
 * Track user logout
 */
export const trackLogout = () => {
  trackEvent('logout');
};

/**
 * Track chat/question submission
 */
export const trackQuestion = (questionText: string, sessionId?: string) => {
  trackEvent('question_submitted', {
    question_text: questionText.substring(0, 100), // Limit length
    session_id: sessionId,
  });
};

/**
 * Track response received
 */
export const trackResponse = (
  questionText: string,
  responseLength: number,
  sessionId?: string
) => {
  trackEvent('response_received', {
    question_text: questionText.substring(0, 100), // Limit length
    response_length: responseLength,
    session_id: sessionId,
  });
};

/**
 * Track feedback submission
 */
export const trackFeedback = (
  feedbackType: string,
  questionText?: string,
  sessionId?: string
) => {
  trackEvent('feedback_submitted', {
    feedback_type: feedbackType,
    question_text: questionText?.substring(0, 100),
    session_id: sessionId,
  });
};

/**
 * Track error events
 */
export const trackError = (errorMessage: string, errorType?: string) => {
  trackEvent('exception', {
    description: errorMessage.substring(0, 100),
    fatal: false,
    error_type: errorType,
  });
};

/**
 * Track voice assistant usage
 */
export const trackVoiceAssistant = (action: 'start' | 'stop' | 'error') => {
  trackEvent('voice_assistant', {
    action,
  });
};

/**
 * Track language change
 */
export const trackLanguageChange = (language: string) => {
  trackEvent('language_change', {
    language,
  });
};

/**
 * Set user properties
 */
export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('set', 'user_properties', properties);
  }
};

/**
 * Set user ID for tracking
 */
export const setUserId = (userId: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-SV0TLS2S41', {
      user_id: userId,
    });
  }
};
