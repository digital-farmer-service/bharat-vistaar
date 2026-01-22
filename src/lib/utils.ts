import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { franc } from 'franc'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface DetectedLanguage {
  code: string;
  name: string;
}

export function detectIndianLanguage(text: string): DetectedLanguage {
    // Skip empty text
    if (!text || text.trim().length === 0) {
        return { code: 'en', name: 'English' };
    }

    const detectedLang = franc(text);
    if (detectedLang === 'und' || !langMap[detectedLang]) {
        // First try to detect if it's Hindi/Marathi since that was our speciality
        const result = detectHindiMarathi(text);
        if (result !== 'en') {
            return result === 'hi' 
                ? { code: 'hi', name: 'Hindi' } 
                : { code: 'mr', name: 'Marathi' };
        }
        // If it's not Hindi/Marathi, check for other Indian scripts
        return detectIndianScripts(text);
    }
    // franc returns ISO 639-3 codes, convert to our format
    return langMap[detectedLang];
}

function detectIndianScripts(text: string): DetectedLanguage {
    // Define Unicode ranges for different Indian scripts
    const languageRanges = {
        Bengali: {
            start: 0x0980,
            end: 0x09FF,
            code: 'bn',
            name: 'Bengali'
        },
        Gujarati: {
            start: 0x0A80,
            end: 0x0AFF,
            code: 'gu',
            name: 'Gujarati'
        },
        Gurmukhi: {
            start: 0x0A00,
            end: 0x0A7F,
            code: 'pa',
            name: 'Punjabi'
        },
        Kannada: {
            start: 0x0C80,
            end: 0x0CFF,
            code: 'kn',
            name: 'Kannada'
        },
        Malayalam: {
            start: 0x0D00,
            end: 0x0D7F,
            code: 'ml',
            name: 'Malayalam'
        },
        Tamil: {
            start: 0x0B80,
            end: 0x0BFF,
            code: 'ta',
            name: 'Tamil'
        },
        Telugu: {
            start: 0x0C00,
            end: 0x0C7F,
            code: 'te',
            name: 'Telugu'
        },
        Odia: {
            start: 0x0B00,
            end: 0x0B7F,
            code: 'or',
            name: 'Odia'
        }
    };

    // Count characters in each script range
    const scriptCounts: { [key: string]: number } = {};
    
    for (const char of text) {
        const code = char.charCodeAt(0);
        
        for (const [script, range] of Object.entries(languageRanges)) {
            if (code >= range.start && code <= range.end) {
                scriptCounts[script] = (scriptCounts[script] || 0) + 1;
                break;
            }
        }
    }

    // Find the script with maximum character count
    let maxScript = '';
    let maxCount = 0;

    for (const [script, count] of Object.entries(scriptCounts)) {
        if (count > maxCount) {
            maxCount = count;
            maxScript = script;
        }
    }

    // If no Indian script detected, return English
    if (!maxScript) {
        return { code: 'en', name: 'English' };
    }

    const detectedScript = languageRanges[maxScript as keyof typeof languageRanges];
    return { code: detectedScript.code, name: detectedScript.name };
}

// Example usage:
// console.log(detectIndianLanguage('नमस्ते')); // Output: "hi"
// console.log(detectIndianLanguage('वणक्कम्')); // Output: "ta"
// console.log(detectIndianLanguage('Hello')); // Output: "en"


interface WordFrequency {
    [key: string]: number;
}

export function detectHindiMarathi(text: string): string {
    // Return early if text is empty or not in Devanagari script
    if (!text || text.trim().length === 0) {
        return 'en';
    }

    // First check if the text is in Devanagari script
    const devanagariRange = {
        start: 0x0900,
        end: 0x097F
    };

    let isDevanagari = false;
    for (const char of text) {
        const code = char.charCodeAt(0);
        if (code >= devanagariRange.start && code <= devanagariRange.end) {
            isDevanagari = true;
            break;
        }
    }

    if (!isDevanagari) {
        return 'en';
    }

    // Common words and patterns unique to each language
    const hindiMarkers: WordFrequency = {
        'है': 2,
        'में': 2,
        'का': 2,
        'को': 2,
        'के': 2,
        'एक': 1,
        'और': 1,
        'हैं': 2,
        'कर': 1,
        'मैं': 2,
        'पर': 1,
        'नहीं': 2,
        'से': 1,
        'हम': 1,
        'थी': 1,
        'था': 1
    };

    const marathiMarkers: WordFrequency = {
        'आहे': 2,
        'मध्ये': 2,
        'ची': 2,
        'चा': 2,
        'ला': 2,
        'एक': 1,
        'आणि': 2,
        'मी': 1,
        'तो': 1,
        'ती': 1,
        'ते': 1,
        'होते': 2,
        'करत': 1,
        'नाही': 2,
        'माझा': 2,
        'तर': 1
    };

    // Character combinations more common in Marathi
    const marathiCharPatterns = [
        'ळ', // retroflex lateral approximant
        'ञ्', // nya
        'त्य',
        'मध्य',
        'ण्य'
    ];

    let hindiScore = 0;
    let marathiScore = 0;

    // Convert text to lowercase and split into words
    const words = text.toLowerCase().split(/[\s,।]+/);

    // Check for word markers
    words.forEach(word => {
        if (hindiMarkers[word]) {
            hindiScore += hindiMarkers[word];
        }
        if (marathiMarkers[word]) {
            marathiScore += marathiMarkers[word];
        }
    });

    // Check for Marathi character patterns
    marathiCharPatterns.forEach(pattern => {
        const regex = new RegExp(pattern, 'g');
        const matches = text.match(regex);
        if (matches) {
            marathiScore += matches.length * 2;
        }
    });

    // Additional Marathi indicators
    if (text.includes('ळ')) {
        marathiScore += 3; // 'ळ' is very common in Marathi
    }

    // Check for common Hindi sentence endings
    if (text.match(/है।$/)) {
        hindiScore += 2;
    }

    // Check for common Marathi sentence endings
    if (text.match(/आहे।$/)) {
        marathiScore += 2;
    }

    // Return result based on scores
    if (marathiScore > hindiScore) {
        return 'mr';
    } else if (hindiScore > marathiScore) {
        return 'hi';
    } else {
        // Default to Hindi if scores are equal and we know it's Devanagari
        return 'hi';
    }
}

const langMap: { [key: string]: DetectedLanguage } = {
    'eng': { code: 'en', name: 'English' },
    'hin': { code: 'hi', name: 'Hindi' },
    'mar': { code: 'mr', name: 'Marathi' },
    'ben': { code: 'bn', name: 'Bengali' },
    'guj': { code: 'gu', name: 'Gujarati' },
    'pan': { code: 'pa', name: 'Punjabi' },
    'kan': { code: 'kn', name: 'Kannada' },
    'mal': { code: 'ml', name: 'Malayalam' },
    'tam': { code: 'ta', name: 'Tamil' },
    'tel': { code: 'te', name: 'Telugu' },
    'ori': { code: 'or', name: 'Odia' }
};

// Example usage:
// console.log(detectHindiMarathi('मैं एक किताब पढ़ रहा हूं')); // Hindi
// console.log(detectHindiMarathi('मी एक पुस्तक वाचत आहे')); // Marathi
// console.log(detectHindiMarathi('Hello World')); // Not Devanagari Script

/**
 * Collects browser and client information as a string
 * This information is sent to /chat/auth for authentication
 */
export function getBrowserInfo(): string {
  const info = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages.join(','),
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(info);
}
