export type SafetyLevel = "normal" | "caution" | "urgent";

export interface SafetyClassification {
  level: SafetyLevel;
  response: string | null;
}

export function classifySafety(message: string): SafetyClassification {
  const lowerMessage = message.toLowerCase();

  const urgentKeywords = [
    "chest pain",
    "difficulty breathing",
    "fainting",
    "faint",
    "serious fall",
    "severe injury",
    "immediate danger",
    "suicid",
    "kill myself",
    "harm myself",
  ];

  const cautionKeywords = ["dizziness", "dizzy", "pain"];

  for (const keyword of urgentKeywords) {
    if (lowerMessage.includes(keyword)) {
      return {
        level: "urgent",
        response:
          "Please stop the activity immediately. If possible, move to a safe place. Contact your local emergency services or a trusted person right away. This chatbot cannot contact emergency services or provide medical help.",
      };
    }
  }

  for (const keyword of cautionKeywords) {
    if (lowerMessage.includes(keyword)) {
      return {
        level: "caution",
        response:
          "Please stop the exercise immediately. I recommend contacting a qualified healthcare professional to discuss your symptoms. I am an AI coach and cannot diagnose your condition.",
      };
    }
  }

  return {
    level: "normal",
    response: null,
  };
}
