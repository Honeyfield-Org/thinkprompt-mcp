/**
 * ThinkPrompt API Client
 * HTTP client for communicating with the ThinkPrompt API
 */

export interface Prompt {
  id: string;
  title: string;
  description: string | null;
  content: string;
  variables: PromptVariable[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVariable {
  name: string;
  type: string;
  label?: string;
  description?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ExecutionResult {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  executionTimeMs: number;
}

export class ThinkPromptApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async listPrompts(params?: {
    limit?: number;
    page?: number;
    search?: string;
    tags?: string[];
  }): Promise<PaginatedResponse<Prompt>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.tags) searchParams.set('tags', params.tags.join(','));

    const query = searchParams.toString();
    const endpoint = `/prompts${query ? `?${query}` : ''}`;

    return this.request<PaginatedResponse<Prompt>>(endpoint);
  }

  async getPrompt(id: string): Promise<Prompt> {
    return this.request<Prompt>(`/prompts/${id}`);
  }

  async executePrompt(
    id: string,
    variables: Record<string, string | number | boolean>,
    options?: {
      provider?: string;
      model?: string;
    },
  ): Promise<ExecutionResult> {
    return this.request<ExecutionResult>(`/prompts/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({
        variables,
        provider: options?.provider,
        model: options?.model,
      }),
    });
  }

  async getPromptVariables(id: string): Promise<PromptVariable[]> {
    return this.request<PromptVariable[]>(`/prompts/${id}/variables`);
  }
}
