import { GoogleGenAI } from "@google/genai";
import { JiraIssue } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function analyzeProjectContext(issues: JiraIssue[], userMessage: string, chatHistory: any[]) {
  const model = "gemini-3-flash-preview";

  // Prepare issues context
  const issuesContext = issues.map(issue => {
    return `- [${issue.key}] ${issue.fields.summary} (Status: ${issue.fields.status.name}, Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'})`;
  }).join('\n');

  const systemInstruction = `
    You are an expert Project Management Assistant. 
    You have access to the current state of a Jira project.
    
    Current Project Issues:
    ${issuesContext}
    
    Your goal is to help the Project Manager understand the context of work items, identify bottlenecks, and answer specific questions about the project status.
    Be concise, professional, and data-driven.
    If you don't know something based on the provided issues, say so.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      ...chatHistory.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: userMessage }] }
    ],
    config: {
      systemInstruction,
    },
  });

  return response.text;
}
