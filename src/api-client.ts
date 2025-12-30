/**
 * ThinkPrompt API Client
 * HTTP client for communicating with the ThinkPrompt API
 */

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: 'admin' | 'editor' | 'viewer' | 'api_user';
  isDefault: boolean;
  joinedAt: string;
}

export interface SwitchWorkspaceResponse {
  message: string;
  workspace: Workspace;
}

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
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'boolean';
  label?: string;
  description?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface CreatePromptInput {
  title: string;
  content: string;
  description?: string;
  variables?: PromptVariable[];
  isPublic?: boolean;
  tagIds?: string[];
}

export interface UpdatePromptInput {
  title?: string;
  content?: string;
  description?: string;
  variables?: PromptVariable[];
  isPublic?: boolean;
  tagIds?: string[];
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

// ============ Project Management Types ============

export interface ProjectLink {
  type: string;
  url: string;
  label?: string;
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  slug: string;
  links: ProjectLink[];
  isArchived: boolean;
  taskCounter: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  assignees?: { userId: string; email: string; fullName: string | null }[];
}

export interface CreateProjectInput {
  name: string;
  slug: string;
  description?: string;
  links?: ProjectLink[];
  assigneeIds?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  slug?: string;
  links?: ProjectLink[];
  assigneeIds?: string[];
}

export interface Feature {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  sortOrder: number;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  children?: Feature[];
}

export interface CreateFeatureInput {
  name: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface UpdateFeatureInput {
  name?: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskComplexity = 'trivial' | 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  projectId: string;
  featureId: string | null;
  taskNumber: number;
  kuerzel: string;
  title: string;
  description: string | null;
  content: string | null;
  status: TaskStatus;
  complexity: TaskComplexity;
  priority: TaskPriority;
  estimationHours: number | null;
  sortOrder: number;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  assignees?: { userId: string; email: string; fullName: string | null }[];
  project?: { id: string; name: string; slug: string };
  feature?: { id: string; name: string };
}

export interface CreateTaskInput {
  projectId: string;
  featureId?: string;
  title: string;
  description?: string;
  content?: string;
  status?: TaskStatus;
  complexity?: TaskComplexity;
  priority?: TaskPriority;
  estimationHours?: number;
  assigneeIds?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  content?: string;
  status?: TaskStatus;
  complexity?: TaskComplexity;
  priority?: TaskPriority;
  estimationHours?: number;
  featureId?: string;
  sortOrder?: number;
  assigneeIds?: string[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  content: string;
  mentionedUsers: string[];
  createdBy: string | null;
  createdBySource: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUser?: { email: string; fullName: string | null };
}

export interface CreateCommentInput {
  content: string;
  mentionedUsers?: string[];
  createdBySource?: 'user' | 'mcp' | 'ai';
}

export interface TaskHistory {
  id: string;
  taskId: string;
  changeType: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  changeSource: string;
  createdAt: string;
}

export interface AiEditTaskInput {
  prompt: string;
  provider?: 'openai' | 'anthropic';
  model?: string;
}

export interface AiEditTaskResult {
  task: Task;
  tokensInput: number;
  tokensOutput: number;
  executionTimeMs: number;
  provider: string;
  model: string;
}

export class ThinkPromptApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private currentWorkspaceId: string | null = null;
  private workspaces: Workspace[] = [];

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  /**
   * Set the current workspace ID for subsequent requests
   */
  setCurrentWorkspace(workspaceId: string | null): void {
    this.currentWorkspaceId = workspaceId;
  }

  /**
   * Get the current workspace ID
   */
  getCurrentWorkspaceId(): string | null {
    return this.currentWorkspaceId;
  }

  /**
   * Get cached workspaces list
   */
  getCachedWorkspaces(): Workspace[] {
    return this.workspaces;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };

    // Add workspace header if set
    if (this.currentWorkspaceId) {
      headers['X-Workspace-ID'] = this.currentWorkspaceId;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
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

  async createPrompt(input: CreatePromptInput): Promise<Prompt> {
    return this.request<Prompt>('/prompts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updatePrompt(id: string, input: UpdatePromptInput): Promise<Prompt> {
    return this.request<Prompt>(`/prompts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  // ============ Workspace Methods ============

  /**
   * List all workspaces the user belongs to
   */
  async listWorkspaces(): Promise<Workspace[]> {
    const workspaces = await this.request<Workspace[]>('/workspaces/list');
    this.workspaces = workspaces;
    return workspaces;
  }

  /**
   * Switch the current workspace for the session
   */
  async switchWorkspace(workspaceId: string): Promise<SwitchWorkspaceResponse> {
    const result = await this.request<SwitchWorkspaceResponse>(
      `/workspaces/${workspaceId}/switch`,
      { method: 'POST' },
    );
    this.currentWorkspaceId = workspaceId;
    // Update cache
    const workspace = this.workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      this.workspaces = this.workspaces.map((w) => ({
        ...w,
        isDefault: w.id === workspaceId,
      }));
    }
    return result;
  }

  /**
   * Get the current active workspace
   */
  async getCurrentWorkspace(): Promise<Workspace | null> {
    if (!this.workspaces.length) {
      await this.listWorkspaces();
    }

    if (this.currentWorkspaceId) {
      return this.workspaces.find((w) => w.id === this.currentWorkspaceId) ?? null;
    }

    return this.workspaces.find((w) => w.isDefault) ?? this.workspaces[0] ?? null;
  }

  // ============ Project Methods ============

  async listProjects(params?: { includeArchived?: boolean }): Promise<Project[]> {
    const searchParams = new URLSearchParams();
    if (params?.includeArchived) searchParams.set('includeArchived', 'true');
    const query = searchParams.toString();
    return this.request<Project[]>(`/projects${query ? `?${query}` : ''}`);
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  // ============ Feature Methods ============

  async listFeatures(projectId: string, params?: { includeArchived?: boolean }): Promise<Feature[]> {
    const searchParams = new URLSearchParams();
    if (params?.includeArchived) searchParams.set('includeArchived', 'true');
    const query = searchParams.toString();
    return this.request<Feature[]>(`/projects/${projectId}/features${query ? `?${query}` : ''}`);
  }

  async getFeature(id: string): Promise<Feature> {
    return this.request<Feature>(`/features/${id}`);
  }

  async createFeature(projectId: string, input: CreateFeatureInput): Promise<Feature> {
    return this.request<Feature>(`/projects/${projectId}/features`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateFeature(id: string, input: UpdateFeatureInput): Promise<Feature> {
    return this.request<Feature>(`/features/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  // ============ Task Methods ============

  async listTasks(params?: {
    projectId?: string;
    featureId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    complexity?: TaskComplexity;
    assigneeId?: string;
    search?: string;
    page?: number;
    limit?: number;
    includeArchived?: boolean;
  }): Promise<PaginatedResponse<Task>> {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.featureId) searchParams.set('featureId', params.featureId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.complexity) searchParams.set('complexity', params.complexity);
    if (params?.assigneeId) searchParams.set('assigneeId', params.assigneeId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.includeArchived) searchParams.set('includeArchived', 'true');
    const query = searchParams.toString();
    return this.request<PaginatedResponse<Task>>(`/tasks${query ? `?${query}` : ''}`);
  }

  async getTask(id: string): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`);
  }

  async getTaskByKuerzel(kuerzel: string): Promise<Task> {
    return this.request<Task>(`/tasks/by-kuerzel/${kuerzel}`);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getTaskHistory(id: string): Promise<TaskHistory[]> {
    return this.request<TaskHistory[]>(`/tasks/${id}/history`);
  }

  async aiEditTask(id: string, input: AiEditTaskInput): Promise<AiEditTaskResult> {
    return this.request<AiEditTaskResult>(`/tasks/${id}/ai-edit`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ============ Comment Methods ============

  async listTaskComments(taskId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<TaskComment>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<TaskComment>>(`/tasks/${taskId}/comments${query ? `?${query}` : ''}`);
  }

  async addTaskComment(taskId: string, input: CreateCommentInput): Promise<TaskComment> {
    return this.request<TaskComment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}
