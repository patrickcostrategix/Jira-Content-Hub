export interface JiraConfig {
  baseUrl: string;
  email: string;
  token: string;
  projectKey: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: any;
    status: {
      name: string;
    };
    issuetype: {
      name: string;
    };
    priority?: {
      name: string;
    };
    assignee?: {
      displayName: string;
    };
    updated: string;
  };
}

export interface ProjectStatus {
  total: number;
  byStatus: Record<string, number>;
  recentIssues: JiraIssue[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
