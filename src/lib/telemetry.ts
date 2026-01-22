// --- V3 Telemetry Specification Alignment ---

// Declare V3 Telemetry methods required for this implementation
// Note: Implementations for all methods are assumed to exist in the global Telemetry object.
declare let Telemetry: any;
declare let AuthTokenGenerate: any;

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
        id: "BharatVistaar",
        ver: "v0.1",
        pid: "BharatVistaar"
      },
      channel: "BharatVistaar-" + getHostUrl(),
      sid: sessionId,
      uid: userDetailsObj['preferred_username'] || "DEFAULT-USER",
      did: userDetailsObj['email'] || "DEFAULT-USER",
      authtoken: "",
      host: "/observability-service"
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
    }
  };
  
  const questionData = { 
    qid: questionId, 
    type: "CHOOSE",
    target: target,
    sid: sessionId,
    channel: "BharatVistaar-" + getHostUrl()
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
    }
  };
  
  const responseData = { 
    qid: questionId, 
    type: "CHOOSE", 
    target: target,
    sid: sessionId,
    channel: "BharatVistaar-" + getHostUrl()
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
    }
  };  

  const errorData = {
    qid: questionId,
    type: "CHOOSE",
    target: target,
    sid: sessionId,
    channel: "BharatVistaar-" + getHostUrl()
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
    }
  };

  const feedbackData = {
    qid: questionId,
    type: "CHOOSE",
    target: target,
    sid: sessionId,
    channel: "BharatVistaar-" + getHostUrl()
  };

  Telemetry.response(feedbackData);
};

export const endTelemetry = () => {
  Telemetry.end({});
};







