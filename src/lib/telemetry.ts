// --- V3 Telemetry Specification Alignment ---

// Declare V3 Telemetry methods required for this implementation
// Note: Implementations for all methods are assumed to exist in the global Telemetry object.
declare let Telemetry: any;
declare let AuthTokenGenerate: any;

// Store comprehensive telemetry data
const telemetryData: {
  // User fields
  mobile: string;
  username: string;
  email: string;
  role: string;
  farmer_id: string;
  unique_id: string;
  
  // All locations data
  registered_location: {
    district: string;
    village: string;
    taluka: string;
    lgd_code: string;
  };
  device_location: {
    district: string;
    village: string;
    taluka: string;
    lgd_code: string;
  };
  agristack_location: {
    district: string;
    village: string;
    taluka: string;
    lgd_code: string;
  };
} = {
  mobile: '',
  username: '',
  email: '',
  role: '',
  farmer_id: '',
  unique_id: '',
  registered_location: { district: '', village: '', taluka: '', lgd_code: '' },
  device_location: { district: '', village: '', taluka: '', lgd_code: '' },
  agristack_location: { district: '', village: '', taluka: '', lgd_code: '' }
};

// New comprehensive telemetry data setter
export const setTelemetryUserData = (userData: {
  mobile?: string;
  username?: string;
  email?: string;
  role?: string;
  farmer_id?: string;
  unique_id?: string | number;
  locations?: Array<{
    location_type: 'registered_location' | 'device_location' | 'agristack_location';
    district: string;
    village: string;
    taluka: string;
    lgd_code?: string | number;
  }>;
}) => {
  // Set user fields (use empty string if not provided)
  telemetryData.mobile = userData.mobile || '';
  telemetryData.username = userData.username || '';
  telemetryData.email = userData.email || '';
  telemetryData.role = userData.role || '';
  telemetryData.farmer_id = userData.farmer_id || '';
  telemetryData.unique_id = userData.unique_id !== undefined && userData.unique_id !== null ? String(userData.unique_id) : '';
  
  // Reset location data
  telemetryData.registered_location = { district: '', village: '', taluka: '', lgd_code: '' };
  telemetryData.device_location = { district: '', village: '', taluka: '', lgd_code: '' };
  telemetryData.agristack_location = { district: '', village: '', taluka: '', lgd_code: '' };
  
  // Process locations array
  if (Array.isArray(userData.locations)) {
    userData.locations.forEach(location => {
      const locData = {
        district: location.district || '',
        village: location.village || '',
        taluka: location.taluka || '',
        lgd_code: location.lgd_code !== undefined && location.lgd_code !== null ? String(location.lgd_code) : ''
      };
      
      if (location.location_type === 'registered_location') {
        telemetryData.registered_location = locData;
      } else if (location.location_type === 'device_location') {
        telemetryData.device_location = locData;
      } else if (location.location_type === 'agristack_location') {
        telemetryData.agristack_location = locData;
      }
    });
  }
};

export const getTelemetryLocation = () => ({ 
  registered_location: telemetryData.registered_location,
  device_location: telemetryData.device_location,
  agristack_location: telemetryData.agristack_location
});

export const getTelemetryData = () => ({ ...telemetryData });

// Function to get the current host URL
const getHostUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'unknown-host';
};

export const startTelemetry = (sessionId: string, userDetailsObj: { preferred_username: string; email: string }) => {
    const key = "gyte5565fdbgbngfnhgmnhmjgm,jm,";
    const secret = "gnjhgjugkk";
    const config = {
      pdata: {
        id: "MahaVistaar",
        ver: "v0.1",
        pid: "MahaVistaar"
      },
      channel: "MahaVistaar-" + getHostUrl(),
      sid: sessionId,
      uid: userDetailsObj['preferred_username'] || "DEFAULT-USER",
      did: userDetailsObj['email'] || "DEFAULT-USER",
      authtoken: "",
      host: "/observability-service",
    }

    const startEdata = {};
    const options = {};
    const token = AuthTokenGenerate.generate(key, secret);
    config.authtoken = token;
    Telemetry.start(config, "content_id", "contetn_ver", startEdata, options);
  };

export const logQuestionEvent = (questionId: string, sessionId: string, questionText: string) => {
  const target = {
    "id": "default",
    "ver": "v0.1",
    "type": "Question",
    "parent": {
      "id": "p1",
      "type": "default"
    },
    "questionsDetails": {
      "questionText": questionText,
      "sessionId": sessionId
    },
    // Add user fields to target
    "mobile": telemetryData.mobile,
    "username": telemetryData.username,
    "email": telemetryData.email,
    "role": telemetryData.role,
    "farmer_id": telemetryData.farmer_id,
    "unique_id": telemetryData.unique_id,
    // Add flat location fields to target
    "registered_location_district": telemetryData.registered_location?.district,
    "registered_location_village": telemetryData.registered_location?.village,
    "registered_location_taluka": telemetryData.registered_location?.taluka,
    "registered_location_lgd_code": telemetryData.registered_location?.lgd_code,
    "device_location_district": telemetryData.device_location?.district,
    "device_location_village": telemetryData.device_location?.village,
    "device_location_taluka": telemetryData.device_location?.taluka,
    "device_location_lgd_code": telemetryData.device_location?.lgd_code,
    "agristack_location_district": telemetryData.agristack_location?.district,
    "agristack_location_village": telemetryData.agristack_location?.village,
    "agristack_location_taluka": telemetryData.agristack_location?.taluka,
    "agristack_location_lgd_code": telemetryData.agristack_location?.lgd_code
  };
  
  const questionData = { 
    qid: questionId, 
    type: "CHOOSE",
    target: target,
    sid: sessionId,
    channel: "MahaVistaar-" + getHostUrl()
  };
  
  Telemetry.response(questionData);
};

export const logResponseEvent = (questionId: string, sessionId: string, questionText: string, responseText: string) => {
  const target = {
    "id": "default",
    "ver": "v0.1",
    "type": "QuestionResponse",
    "parent": {
      "id": "p1",
      "type": "default"
    },
    "questionsDetails": {
      "questionText": questionText, 
      "answerText": responseText,
      "sessionId": sessionId
    },
    // Add user fields to target
    "mobile": telemetryData.mobile,
    "username": telemetryData.username,
    "email": telemetryData.email,
    "role": telemetryData.role,
    "farmer_id": telemetryData.farmer_id,
    "unique_id": telemetryData.unique_id,
    // Add flat location fields to target
    "registered_location_district": telemetryData.registered_location?.district,
    "registered_location_village": telemetryData.registered_location?.village,
    "registered_location_taluka": telemetryData.registered_location?.taluka,
    "registered_location_lgd_code": telemetryData.registered_location?.lgd_code,
    "device_location_district": telemetryData.device_location?.district,
    "device_location_village": telemetryData.device_location?.village,
    "device_location_taluka": telemetryData.device_location?.taluka,
    "device_location_lgd_code": telemetryData.device_location?.lgd_code,
    "agristack_location_district": telemetryData.agristack_location?.district,
    "agristack_location_village": telemetryData.agristack_location?.village,
    "agristack_location_taluka": telemetryData.agristack_location?.taluka,
    "agristack_location_lgd_code": telemetryData.agristack_location?.lgd_code
  };
  
  const responseData = { 
    qid: questionId, 
    type: "CHOOSE", 
    target: target,
    sid: sessionId,
    channel: "MahaVistaar-" + getHostUrl()
  };
  
  Telemetry.response(responseData);
};

export const logErrorEvent = (questionId: string, sessionId: string, error: string) => {
  const target = {
    "id": "default",
    "ver": "v0.1",
    "type": "Error",
    "parent": {
      "id": "p1",
      "type": "default"
    },
    "errorDetails": {
      "errorText": error,
      "sessionId": sessionId
    },
    // Add user fields to target
    "mobile": telemetryData.mobile,
    "username": telemetryData.username,
    "email": telemetryData.email,
    "role": telemetryData.role,
    "farmer_id": telemetryData.farmer_id,
    "unique_id": telemetryData.unique_id,
    // Add flat location fields to target
    "registered_location_district": telemetryData.registered_location?.district,
    "registered_location_village": telemetryData.registered_location?.village,
    "registered_location_taluka": telemetryData.registered_location?.taluka,
    "registered_location_lgd_code": telemetryData.registered_location?.lgd_code,
    "device_location_district": telemetryData.device_location?.district,
    "device_location_village": telemetryData.device_location?.village,
    "device_location_taluka": telemetryData.device_location?.taluka,
    "device_location_lgd_code": telemetryData.device_location?.lgd_code,
    "agristack_location_district": telemetryData.agristack_location?.district,
    "agristack_location_village": telemetryData.agristack_location?.village,
    "agristack_location_taluka": telemetryData.agristack_location?.taluka,
    "agristack_location_lgd_code": telemetryData.agristack_location?.lgd_code
  };  

  const errorData = {
    qid: questionId,
    type: "CHOOSE",
    target: target,
    sid: sessionId,
    channel: "MahaVistaar-" + getHostUrl()
  };

  Telemetry.response(errorData);
};

export const logFeedbackEvent = (questionId: string, sessionId: string, feedbackText: string, feedbackType: string, questionText: string, responseText: string) => {
  const target = {
    "id": "default",
    "ver": "v0.1",
    "type": "Feedback",
    "parent": {
      "id": "p1",
      "type": "default"
    },
    "feedbackDetails": {
      "feedbackText": feedbackText,
      "sessionId": sessionId,
      "questionText": questionText, 
      "answerText": responseText,
      "feedbackType": feedbackType
    },
    // Add user fields to target
    "mobile": telemetryData.mobile,
    "username": telemetryData.username,
    "email": telemetryData.email,
    "role": telemetryData.role,
    "farmer_id": telemetryData.farmer_id,
    "unique_id": telemetryData.unique_id,
    // Add flat location fields to target
    "registered_location_district": telemetryData.registered_location?.district,
    "registered_location_village": telemetryData.registered_location?.village,
    "registered_location_taluka": telemetryData.registered_location?.taluka,
    "registered_location_lgd_code": telemetryData.registered_location?.lgd_code,
    "device_location_district": telemetryData.device_location?.district,
    "device_location_village": telemetryData.device_location?.village,
    "device_location_taluka": telemetryData.device_location?.taluka,
    "device_location_lgd_code": telemetryData.device_location?.lgd_code,
    "agristack_location_district": telemetryData.agristack_location?.district,
    "agristack_location_village": telemetryData.agristack_location?.village,
    "agristack_location_taluka": telemetryData.agristack_location?.taluka,
    "agristack_location_lgd_code": telemetryData.agristack_location?.lgd_code
  };

  const feedbackData = {
    qid: questionId,
    type: "CHOOSE",
    target: target,
    sid: sessionId,
    channel: "MahaVistaar-" + getHostUrl()
  };

  Telemetry.response(feedbackData);
};

export const endTelemetry = () => {
  Telemetry.end({});
};







