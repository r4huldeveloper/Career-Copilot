/**
 * aiProvider.js — Provider adapter (interface) for decoupling external AI provider.
 * Complies with AI_RULES: 1-file swap for provider updates.
 */

import { CONFIG } from "../config.js";
import { callGroq } from "../api/groq.js";
import {
  resumeSystemPrompt,
  roleFitSystemPrompt,
  jdMatchSystemPrompt,
  interviewQuestionSystemPrompt,
  evaluateAnswerSystemPrompt,
  answerTipsSystemPrompt,
} from "../prompts/groqPrompts.js";

export class GroqAdapter {
  /**
   * @param {string} apiKey
   */
  constructor(apiKey) {
    if (!apiKey) throw new Error("GroqAdapter requires apiKey");
    this.apiKey = apiKey;
  }

  async analyzeResume({ resumeText, targetRole }) {
    return callGroq(
      `Target Role: ${targetRole}\n\nResume:\n${resumeText.slice(0, CONFIG.MAX_RESUME_LENGTH)}`,
      resumeSystemPrompt(targetRole),
      this.apiKey
    );
  }

  async analyzeRoleFit({ resumeText }) {
    return callGroq(
      `Resume:\n${resumeText.slice(0, CONFIG.MAX_RESUME_LENGTH)}`,
      roleFitSystemPrompt(),
      this.apiKey
    );
  }

  async matchJD({ jdText, resumeText }) {
    return callGroq(
      `JD:\n${jdText.slice(0, CONFIG.MAX_JD_LENGTH)}\n\nResume:\n${resumeText.slice(0, CONFIG.MAX_RESUME_LENGTH)}`,
      jdMatchSystemPrompt(),
      this.apiKey
    );
  }

  async generateInterviewQuestion({ role, type, forceNew, count }) {
    return callGroq(
      `Role: ${role}\nType: ${type}\nForceNew: ${forceNew}\nCount: ${count}`,
      interviewQuestionSystemPrompt(),
      this.apiKey
    );
  }

  async evaluateAnswer({ question, answer, role, type }) {
    return callGroq(
      `Question: ${question}\nAnswer: ${answer}\nRole: ${role}\nType: ${type}`,
      evaluateAnswerSystemPrompt(),
      this.apiKey
    );
  }

  async getAnswerTips({ question, role, type }) {
    return callGroq(
      `Question: ${question}\nRole: ${role}\nType: ${type}`,
      answerTipsSystemPrompt(),
      this.apiKey
    );
  }
}
