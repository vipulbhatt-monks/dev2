
import { WireframeData, UIBlueprintResponse, UIBlueprintError } from '../components/ui-wireframe/types';

const API_BASE = "http://localhost:8000";

export type JiraIssueCreateError = {
  index: number;
  summary?: string | null;
  error: string;
  status_code?: number | null;
  jira_response?: any;
};

export type JiraDraftStory = {
  id: string;
  summary: string;
  description: string;
  issue_type?: string | null;
  labels?: string[] | null;
};

export type JiraDraftStoriesResponse = {
  stories: JiraDraftStory[];
};

export type JiraPublishStoriesRequest = {
  stories: { summary: string; description: string; issue_type?: string | null; labels?: string[] | null }[];
};

export type JiraPublishOkResponse = {
  ok: boolean;
};

export type JiraPublishErrorsResponse = {
  errors: JiraIssueCreateError[];
};

export const generateJiraDraftFromSrs = async (srsText: string): Promise<JiraDraftStoriesResponse> => {
  const response = await fetch(`${API_BASE}/api/jira/issues/draft-from-srs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: srsText,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data && (data.error || data.detail)) ? JSON.stringify(data) : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data as JiraDraftStoriesResponse;
};

export const publishJiraStories = async (
  stories: { summary: string; description: string; issue_type?: string | null; labels?: string[] | null }[]
): Promise<JiraPublishOkResponse> => {
  const response = await fetch(`${API_BASE}/api/jira/issues/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stories } satisfies JiraPublishStoriesRequest),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data && (data.error || data.detail || data.errors)) ? JSON.stringify(data) : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return (data || { ok: true }) as JiraPublishOkResponse;
};

// --- Standard Chat ---
export const streamChatResponse = async (
  message: string,
  history: { role: string; parts: any[] }[],
  onChunk: (text: string) => void,
  sessionId?: string
) => {
  try {
    // Map history to match backend ChatRequest expectation
    const mappedHistory = history.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: msg.parts.map(p => {
        const part: any = {};
        if (p.text) part.text = p.text;
        // Handle generic object structure for function calls/responses if present
        if (p.functionCall || p.function_call) part.function_call = p.functionCall || p.function_call;
        if (p.functionResponse || p.function_response) part.function_response = p.functionResponse || p.function_response;
        return part;
      })
    }));

    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: mappedHistory,
        session_id: sessionId
      }),
    });

    if (!response.body) throw new Error("No response body");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  } catch (error: any) {
    console.error("Chat Error:", error);
    onChunk(`\n\n**Error**: ${error.message || "Failed to connect to backend."}`);
  }
};

// --- Spec Generation ---
export const generateUAT = async (
  requirements: Record<string, string>,
  query: string | undefined,
  onChunk: (text: string) => void
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/api/uat/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirements, query }),
    });

    if (!response.body) throw new Error("No response body");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  } catch (error) {
    console.error("Error generating UAT:", error);
    throw error;
  }
};

export const generateProjectSpec = async (prompt: string, fileContent: string | null = null) => {
  try {
    const response = await fetch(`${API_BASE}/api/spec/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, file_content: fileContent }),
    });
    return await response.json();
  } catch (error: any) {
    return { error: error.message };
  }
};

export const saveProjectSpec = async (projectName: string, spec: any) => {
  try {
    const response = await fetch(`${API_BASE}/api/spec/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName, spec }),
    });
    return await response.json();
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// --- Screen Proposal + Wireframe Generation (Two-Step) ---

export const proposeScreens = async (
  prompt: string,
  fileContent?: string | null,
  fileType?: 'text' | 'image' | null
) => {
  try {
    const response = await fetch(`${API_BASE}/ui/screens/propose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        file_content: fileContent,
        file_type: fileType
      }),
    });
    if (!response.ok) throw new Error("Failed to propose screens");
    return await response.json();
  } catch (error: any) {
    console.error("Screen Proposal API Error:", error);
    return { error: error.message };
  }
};

export const generateScreens = async (
  appName: string,
  screens: Array<{ id: string; title: string; description: string }>,
  prompt: string,
  fileContent?: string | null,
  fileType?: string | null
) => {
  try {
    const response = await fetch(`${API_BASE}/ui/screens/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appName,
        screens,
        prompt,
        file_content: fileContent,
        file_type: fileType
      }),
    });
    if (!response.ok) throw new Error("Failed to generate wireframe");
    return await response.json();
  } catch (error: any) {
    console.error("Wireframe Generation API Error:", error);
    return { error: error.message };
  }
};
// --- UI Blueprint Generation ---
export const generateUIStructured = async (
  projectName: string,
  userRoles: string[],
  features: string[],
  constraints: string[]
): Promise<UIBlueprintResponse | UIBlueprintError> => {
  try {
    const response = await fetch(`${API_BASE}/api/ui/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName, userRoles, features, constraints }),
    });
    return await response.json();
  } catch (error: any) {
    return { error: 'Failed to generate UI', details: error.message };
  }
};

export const generateUIFromDoc = async (
  projectName: string,
  requirementsDoc: string
): Promise<UIBlueprintResponse | UIBlueprintError> => {
  try {
    const response = await fetch(`${API_BASE}/api/ui/generate-from-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName, requirementsDoc }),
    });
    return await response.json();
  } catch (error: any) {
    return { error: 'Failed to generate UI', details: error.message };
  }
};

export const saveUIBlueprint = async (
  projectName: string,
  blueprint: UIBlueprintResponse
): Promise<{ success: boolean; path?: string; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/api/ui/save-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName, blueprint }),
    });
    return await response.json();
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
export const streamAgentResponse = async (
  payload: {
    message?: string | null,
    history: any[],
    tool_responses?: any[] | null,
    session_id?: string
  },
  onData: (data: any) => void
) => {
  try {
    const mappedHistory = payload.history.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: msg.parts.map((p: any) => {
        const part: any = {};
        if (p.text) part.text = p.text;
        if (p.functionCall || p.function_call) part.function_call = p.functionCall || p.function_call;
        if (p.functionResponse || p.function_response) part.function_response = p.functionResponse || p.function_response;
        return part;
      })
    }));

    const body: any = {
      history: mappedHistory,
      session_id: payload.session_id
    };

    if (payload.message) {
      body.message = payload.message;
    }

    if (payload.tool_responses) {
      body.tool_responses = payload.tool_responses.map(tr => ({
        function_response: tr.functionResponse || tr.function_response
      }));
    }

    const response = await fetch(`${API_BASE}/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.body) throw new Error("No response body");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Handle NDJSON (Newlines Delimited JSON)
      const lines = buffer.split("\n");
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          onData(data);
        } catch (e) {
          console.error("JSON Parse Error", e);
        }
      }
    }
  } catch (error: any) {
    console.error("Agent API Error", error);
    onData({ error: error.message });
  }
};

export const pushToFigma = async (payload: { appName: string; screens: any[]; figmaToken: string; fileId: string }) => {
  try {
    const response = await fetch(`${API_BASE}/figma/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const generateFigmaSchema = async (payload: { html: string; title: string }) => {
  try {
    const response = await fetch(`${API_BASE}/figma/generate-schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
