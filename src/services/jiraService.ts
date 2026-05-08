import { JiraConfig, JiraIssue, ProjectStatus } from "../types";

export async function fetchProjectIssues(config: JiraConfig): Promise<JiraIssue[]> {
  let baseUrl = config.baseUrl.trim();
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = `https://${baseUrl}`;
  }
  // Remove trailing slash if exists
  baseUrl = baseUrl.replace(/\/$/, "");

  const jql = `project = "${config.projectKey}" ORDER BY updated DESC`;
  
  // The user was told to migrate to /search/jql, so we use it as primary
  // but if it fails or returns nothing, /search is a robust fallback
  const endpoints = [`${baseUrl}/rest/api/3/search/jql`, `${baseUrl}/rest/api/3/search`];
  let lastError = null;

  for (const url of endpoints) {
    try {
      const body = {
        jql,
        maxResults: 100,
        fields: ["summary", "status", "issuetype", "priority", "assignee", "updated", "description"]
      };

      const response = await fetch("/api/jira/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          email: config.email,
          token: config.token,
          method: "POST",
          body
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const issuesList = data.issues || data.results || data.values || data.issueBeans || [];
        if (issuesList.length > 0) {
          return issuesList;
        }
        // If it's OK but empty, we continue to next endpoint if exists
      } else {
        const err = await response.json();
        lastError = `Endpoint ${url} failed: ${JSON.stringify(err)}`;
      }
    } catch (e: any) {
      lastError = e.message;
    }
  }

  // If we reach here, we either found nothing or all endpoints failed
  if (lastError) {
    throw new Error(`Jira Search Failed: ${lastError}`);
  }
  
  return [];
}

export function calculateProjectStatus(issues: JiraIssue[]): ProjectStatus {
  const byStatus: Record<string, number> = {};
  
  issues.forEach(issue => {
    const status = issue.fields.status.name;
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  return {
    total: issues.length,
    byStatus,
    recentIssues: issues.slice(0, 5),
  };
}
