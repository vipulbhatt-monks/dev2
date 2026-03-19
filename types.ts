export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
  parts?: any[];
  interaction?: any;
}

export interface ChatSession {
  id: string;
  title: string;
  date: string;
}

export type AppMode = 'standard' | 'requirements' | 'wireframe' | 'dev' | 'uat' | 'jira' | 'live';
