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

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt?: string;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

export interface StyleGuide {
  id: string;
  title: string;
  description: string | null;
  content: string;
  variables: StyleGuideVariable[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StyleGuideVariable {
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

export interface CreateStyleGuideInput {
  title: string;
  content: string;
  description?: string;
  variables?: StyleGuideVariable[];
  isPublic?: boolean;
  tagIds?: string[];
}

export interface UpdateStyleGuideInput {
  title?: string;
  content?: string;
  description?: string;
  variables?: StyleGuideVariable[];
  isPublic?: boolean;
  tagIds?: string[];
}

// ============ Template Types ============

export type TemplateType = 'example' | 'style';

export interface Template {
  id: string;
  title: string;
  description: string | null;
  content: string;
  type: TemplateType;
  category: string | null;
  language: string | null;
  useCaseHints: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  tags?: { id: string; name: string; color: string }[];
}

export interface CreateTemplateInput {
  title: string;
  content: string;
  type: TemplateType;
  description?: string;
  category?: string;
  language?: string;
  useCaseHints?: string[];
  isPublic?: boolean;
  tagIds?: string[];
}

export interface UpdateTemplateInput {
  title?: string;
  content?: string;
  type?: TemplateType;
  description?: string;
  category?: string;
  language?: string;
  useCaseHints?: string[];
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

export interface ProjectStatistics {
  projectId: string;
  tasks: { total: number; byStatus: Record<string, number>; completedLast7Days: number; completedLast30Days: number; totalEstimatedHours: number; completedEstimatedHours: number; };
  features: { total: number; byStatus: Record<string, number>; };
  progressPercentage: number;
  blockedCount: number;
  recentActivity: Array<{ type: string; id: string; title: string; action: string; updatedAt: string; }>;
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

// ============ Workflow Types ============

export type WorkflowResourceType = 'prompt' | 'template' | 'task' | 'feature' | 'project';
export type WorkflowActionType = 'execute_prompt' | 'load_template' | 'create_task' | 'update_task_status' | 'generate_tasks' | 'custom';
export type WorkflowExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface WorkflowResource {
  id: string;
  resourceType: WorkflowResourceType;
  resourceId: string;
  alias: string | null;
  config: Record<string, unknown>;
  sortOrder: number;
}

export interface WorkflowActionConfig {
  promptId?: string;
  promptAlias?: string;
  templateId?: string;
  templateAlias?: string;
  projectId?: string;
  taskId?: string;
  taskAlias?: string;
  featureId?: string;
  featureAlias?: string;
  status?: string;
  title?: string;
  description?: string;
  variables?: Record<string, unknown>;
  instructions?: string;
}

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string | null;
  actionType: WorkflowActionType;
  actionConfig: WorkflowActionConfig;
  condition: string | null;
  conditionType: 'none' | 'simple' | 'ai' | null;
  timeoutMs: number | null;
  onError: 'fail' | 'skip' | 'continue';
}

export interface Workflow {
  id: string;
  title: string;
  description: string | null;
  customInstructions: string | null;
  category: string | null;
  isPublic: boolean;
  isArchived: boolean;
  status: 'draft' | 'active' | 'deprecated';
  version: number;
  usageCount: number;
  lastUsedAt: string | null;
  resources: WorkflowResource[];
  steps: WorkflowStep[];
  tags?: { id: string; name: string; color: string }[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecutionStep {
  id: string;
  stepId: string;
  stepNumber: number;
  stepTitle: string;
  status: WorkflowStepStatus;
  inputSnapshot: Record<string, unknown>;
  outputResult: unknown | null;
  errorMessage: string | null;
  conditionResult: boolean | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowTitle: string;
  status: WorkflowExecutionStatus;
  inputVariables: Record<string, unknown>;
  contextSnapshot: Record<string, unknown>;
  result: unknown | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  executedBy: string | null;
  createdAt: string;
  steps: WorkflowExecutionStep[];
}

export interface WorkflowValidationResult {
  isValid: boolean;
  missingResources: Array<{
    resourceId: string;
    resourceType: WorkflowResourceType;
    exists: boolean;
  }>;
  errors: string[];
}

export interface CreateWorkflowResourceInput {
  resourceType: WorkflowResourceType;
  resourceId: string;
  alias?: string;
  config?: Record<string, unknown>;
  sortOrder?: number;
}

export interface CreateWorkflowStepInput {
  stepNumber: number;
  title: string;
  description?: string;
  actionType: WorkflowActionType;
  actionConfig: WorkflowActionConfig;
  condition?: string;
  conditionType?: 'none' | 'simple' | 'ai';
  timeoutMs?: number;
  onError?: 'fail' | 'skip' | 'continue';
}

export interface CreateWorkflowInput {
  title: string;
  description?: string;
  customInstructions?: string;
  category?: string;
  isPublic?: boolean;
  status?: 'draft' | 'active' | 'deprecated';
  tagIds?: string[];
  resources?: CreateWorkflowResourceInput[];
  steps?: CreateWorkflowStepInput[];
}

export interface UpdateWorkflowInput {
  title?: string;
  description?: string;
  customInstructions?: string;
  category?: string;
  isPublic?: boolean;
  status?: 'draft' | 'active' | 'deprecated';
  tagIds?: string[];
  resources?: CreateWorkflowResourceInput[];
  steps?: CreateWorkflowStepInput[];
}

export interface ExecuteWorkflowInput {
  variables?: Record<string, unknown>;
  dryRun?: boolean;
}

// ============ Plugin Marketplace Types ============

export type PluginStatus = 'draft' | 'published' | 'deprecated';
export type PluginInstallSource = 'npm' | 'github' | 'url';

export interface PluginCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
}

export interface Plugin {
  id: string;
  name: string;
  displayName: string;
  slug: string;
  description: string | null;
  longDescription: string | null;
  installSource: PluginInstallSource;
  npmPackage: string | null;
  githubRepo: string | null;
  installUrl: string | null;
  categoryId: string | null;
  category: PluginCategory | null;
  homepageUrl: string | null;
  repositoryUrl: string | null;
  documentationUrl: string | null;
  license: string | null;
  keywords: string[];
  status: PluginStatus;
  latestVersion: string | null;
  totalInstalls: number;
  weeklyInstalls: number;
  ratingAverage: number;
  ratingCount: number;
  authorId: string | null;
  authorName: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  installCommand: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PluginVersion {
  id: string;
  pluginId: string;
  version: string;
  changelog: string | null;
  minClaudeVersion: string | null;
  isLatest: boolean;
  isYanked: boolean;
  installCount: number;
  createdAt: string;
}

export interface PluginDetail extends Plugin {
  versions: PluginVersion[];
}

export interface PluginSearchParams {
  search?: string;
  category?: string;
  installSource?: PluginInstallSource;
  sortBy?: 'installs' | 'rating' | 'recent' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface RegisterPluginInput {
  name: string;
  displayName: string;
  description?: string;
  longDescription?: string;
  installSource: PluginInstallSource;
  npmPackage?: string;
  githubRepo?: string;
  installUrl?: string;
  categoryId?: string;
  homepageUrl?: string;
  repositoryUrl?: string;
  documentationUrl?: string;
  license?: string;
  keywords?: string[];
}

export interface TrackPluginInstallInput {
  version?: string;
  source?: string;
}

// ============ Document Types ============

export interface DocumentFolderInfo {
  id: string;
  name: string;
  slug: string;
}

export interface DocumentTag {
  id: string;
  name: string;
  color: string;
}

export interface Document {
  id: string;
  tenantId: string;
  projectId: string | null;
  folderId: string | null;
  title: string;
  slug: string;
  content: string;
  frontmatter: Record<string, unknown>;
  version: number;
  isArchived: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  folder?: DocumentFolderInfo | null;
  tags?: DocumentTag[];
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  title: string;
  content: string;
  frontmatter: Record<string, unknown>;
  changeSummary: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  projectId: string | null;
  folder?: DocumentFolderInfo | null;
  tags?: DocumentTag[];
  updatedAt: string;
}

export interface DocumentFolder {
  id: string;
  tenantId: string;
  projectId: string | null;
  parentId: string | null;
  name: string;
  slug: string;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  children?: DocumentFolder[];
  documentCount?: number;
}

export interface DocumentFolderTree {
  folders: DocumentFolder[];
  totalCount?: number;
}

export interface CreateDocumentInput {
  title: string;
  content?: string;
  frontmatter?: Record<string, unknown>;
  folderId?: string;
  projectId?: string;
  tagIds?: string[];
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  frontmatter?: Record<string, unknown>;
  folderId?: string;
  changeSummary?: string;
}

export interface DocumentQueryParams {
  projectId?: string;
  folderId?: string;
  search?: string;
  tagIds?: string[];
  includeArchived?: boolean;
  page?: number;
  limit?: number;
}

export interface DocumentSearchParams {
  query: string;
  projectId?: string;
  folderId?: string;
  limit?: number;
}

export interface CreateDocumentFolderInput {
  name: string;
  parentId?: string;
  projectId?: string;
}

export interface UpdateDocumentFolderInput {
  name?: string;
  parentId?: string;
}

export interface DocumentFolderQueryParams {
  projectId?: string;
  parentId?: string;
  includeArchived?: boolean;
}

export interface ReorderDocumentFoldersInput {
  items: Array<{ id: string; sortOrder: number }>;
}

// ============ Requirement Types ============

export type RequirementStatus = 'draft' | 'in_discovery' | 'structured' | 'quality_check' | 'in_review' | 'approved' | 'exported';
export type AcceptanceCriteriaType = 'positive' | 'negative' | 'edge_case';
export type PreconditionCategory = 'technical_deps' | 'data_requirements' | 'env_config' | 'architecture';
export type VerificationTestType = 'unit' | 'integration' | 'e2e' | 'manual' | 'performance';
export type RequirementLinkType = 'depends_on' | 'blocks' | 'related' | 'parent' | 'child';
export type CommentLevel = 'requirement' | 'section' | 'element' | 'inline';
export type CommentStatus = 'open' | 'resolved' | 'wont_fix';

export interface RequirementDescription {
  overview: string;
  background: string;
  userStory: string;
  businessValue: string;
  affectedRoles: string[];
  successCriteria: string[];
}

export interface RequirementScope {
  inScope: string[];
  outOfScope: string[];
  assumptions: string[];
  constraints: string[];
}

export interface RequirementQualityScore {
  completeness: number | null;
  clarity: number | null;
  testability: number | null;
  atomicity: number | null;
  traceability: number | null;
  collaboration: number | null;
  overall: number | null;
  issues: Array<{ rule: string; severity: string; message: string; suggestion: string }>;
  lastCalculatedAt: string | null;
}

export interface Requirement {
  id: string;
  projectId: string | null;
  featureId: string | null;
  displayId: string;
  title: string;
  description: RequirementDescription;
  scope: RequirementScope;
  qualityScore: RequirementQualityScore;
  status: RequirementStatus;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ id: string; name: string; color: string }>;
  creator: { userId: string; email: string; fullName: string | null } | null;
  assignees: Array<{ userId: string; email: string; fullName: string | null }>;
  acceptanceCriteriaCount: number;
  preconditionsCount: number;
  verificationTestsCount: number;
  linksCount: number;
  commentsCount: number;
  unresolvedCommentsCount: number;
}

export interface AcceptanceCriterion {
  id: string;
  requirementId: string;
  scenarioName: string;
  givenContext: string;
  whenAction: string;
  thenOutcome: string;
  type: AcceptanceCriteriaType;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Precondition {
  id: string;
  requirementId: string;
  category: PreconditionCategory;
  title: string;
  description: string;
  isMet: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestStep {
  step: number;
  action: string;
  expected: string;
}

export interface VerificationTest {
  id: string;
  requirementId: string;
  testName: string;
  testType: VerificationTestType;
  description: string;
  steps: TestStep[];
  expectedResult: string;
  automationHint: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementLink {
  id: string;
  sourceRequirementId: string;
  targetRequirementId: string;
  linkType: RequirementLinkType;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  linkedRequirement: {
    id: string;
    displayId: string;
    title: string;
    status: RequirementStatus;
    qualityScore: { overall: number | null };
  };
}

export interface RequirementComment {
  id: string;
  requirementId: string;
  parentCommentId: string | null;
  commentLevel: CommentLevel;
  sectionKey: string | null;
  elementId: string | null;
  inlinePosition: { startOffset: number; endOffset: number } | null;
  content: string;
  mentionedUsers: string[];
  status: CommentStatus;
  createdBy: string;
  createdBySource: 'user' | 'ai' | 'system';
  isEdited: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { userId: string; email: string; fullName: string | null };
  replies: RequirementComment[];
}

export interface CreateRequirementInput {
  title: string;
  description?: Partial<RequirementDescription>;
  scope?: Partial<RequirementScope>;
  featureId?: string;
  status?: RequirementStatus;
  tagIds?: string[];
  assigneeIds?: string[];
}

export interface UpdateRequirementInput {
  title?: string;
  description?: Partial<RequirementDescription>;
  scope?: Partial<RequirementScope>;
  featureId?: string | null;
  tagIds?: string[];
  assigneeIds?: string[];
}

export interface CreateAcceptanceCriterionInput {
  scenarioName: string;
  givenContext: string;
  whenAction: string;
  thenOutcome: string;
  type?: AcceptanceCriteriaType;
  sortOrder?: number;
}

export interface UpdateAcceptanceCriterionInput {
  scenarioName?: string;
  givenContext?: string;
  whenAction?: string;
  thenOutcome?: string;
  type?: AcceptanceCriteriaType;
  sortOrder?: number;
}

export interface CreatePreconditionInput {
  category: PreconditionCategory;
  title: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdatePreconditionInput {
  category?: PreconditionCategory;
  title?: string;
  description?: string;
  isMet?: boolean;
  sortOrder?: number;
}

export interface CreateVerificationTestInput {
  testName: string;
  testType: VerificationTestType;
  description?: string;
  steps?: TestStep[];
  expectedResult?: string;
  automationHint?: string;
  sortOrder?: number;
}

export interface UpdateVerificationTestInput {
  testName?: string;
  testType?: VerificationTestType;
  description?: string;
  steps?: TestStep[];
  expectedResult?: string;
  automationHint?: string;
  sortOrder?: number;
}

export interface CreateRequirementLinkInput {
  targetRequirementId: string;
  linkType: RequirementLinkType;
  description?: string;
}

export interface CreateRequirementCommentInput {
  content: string;
  parentCommentId?: string;
  commentLevel: CommentLevel;
  sectionKey?: string;
  elementId?: string;
  inlinePosition?: { startOffset: number; endOffset: number };
  mentionedUsers?: string[];
}

export interface UpdateRequirementCommentInput {
  content?: string;
  status?: CommentStatus;
}

export interface ListRequirementsQuery {
  status?: RequirementStatus;
  includeArchived?: boolean;
  featureId?: string;
  tagId?: string;
  assigneeId?: string;
  search?: string;
  sortBy?: 'created_at' | 'updated_at' | 'display_id' | 'quality_score';
  sortOrder?: 'asc' | 'desc';
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

    // Handle empty responses (204 No Content or empty body)
    const contentLength = response.headers.get('content-length');
    if (response.status === 204 || contentLength === '0') {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  async listStyleGuides(params?: {
    limit?: number;
    page?: number;
    search?: string;
    tags?: string[];
  }): Promise<PaginatedResponse<StyleGuide>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.tags) searchParams.set('tags', params.tags.join(','));

    const query = searchParams.toString();
    const endpoint = `/style-guides${query ? `?${query}` : ''}`;

    return this.request<PaginatedResponse<StyleGuide>>(endpoint);
  }

  async getStyleGuide(id: string): Promise<StyleGuide> {
    return this.request<StyleGuide>(`/style-guides/${id}`);
  }



  async createStyleGuide(input: CreateStyleGuideInput): Promise<StyleGuide> {
    return this.request<StyleGuide>('/style-guides', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateStyleGuide(id: string, input: UpdateStyleGuideInput): Promise<StyleGuide> {
    return this.request<StyleGuide>(`/style-guides/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  // ============ Template Methods ============

  async listTemplates(params?: {
    limit?: number;
    page?: number;
    search?: string;
    type?: TemplateType;
    category?: string;
    language?: string;
    tags?: string[];
  }): Promise<PaginatedResponse<Template>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.language) searchParams.set('language', params.language);
    if (params?.tags) searchParams.set('tagIds', params.tags.join(','));

    const query = searchParams.toString();
    const endpoint = `/templates${query ? `?${query}` : ''}`;

    return this.request<PaginatedResponse<Template>>(endpoint);
  }

  async getTemplate(id: string): Promise<Template> {
    return this.request<Template>(`/templates/${id}`);
  }

  async createTemplate(input: CreateTemplateInput): Promise<Template> {
    return this.request<Template>('/templates', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<Template> {
    return this.request<Template>(`/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.request<void>(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ Workspace Methods ============

  /**
   * List all workspaces the user belongs to
   */
  async listWorkspaces(): Promise<Workspace[]> {
    const response = await this.request<{ success: boolean; data: Workspace[] }>(
      '/workspaces/list',
    );
    // API returns { success, data } wrapper - handle various response formats
    let workspaces: Workspace[];
    if (Array.isArray(response)) {
      workspaces = response;
    } else if (response && typeof response === 'object') {
      const data = (response as { data?: unknown }).data;
      if (Array.isArray(data)) {
        workspaces = data;
      } else if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
        // Handle double-nested case: { success, data: { success, data: [...] } }
        workspaces = (data as { data: Workspace[] }).data;
      } else {
        workspaces = [];
      }
    } else {
      workspaces = [];
    }
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
    // Update cache - ensure workspaces are loaded first
    if (!Array.isArray(this.workspaces) || !this.workspaces.length) {
      await this.listWorkspaces();
    }
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
    if (!Array.isArray(this.workspaces) || !this.workspaces.length) {
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

  async getProjectStatistics(projectId: string): Promise<ProjectStatistics> {
    return this.request<ProjectStatistics>(`/projects/${projectId}/statistics`);
  }

  // ============ Workflow Methods ============

  async listWorkflows(params?: {
    limit?: number;
    page?: number;
    search?: string;
    category?: string;
    status?: 'draft' | 'active' | 'deprecated';
    includeArchived?: boolean;
  }): Promise<PaginatedResponse<Workflow>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.includeArchived) searchParams.set('includeArchived', 'true');

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Workflow>>(`/workflows${query ? `?${query}` : ''}`);
  }

  async getWorkflow(id: string): Promise<Workflow> {
    return this.request<Workflow>(`/workflows/${id}`);
  }

  async createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
    return this.request<Workflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateWorkflow(id: string, input: UpdateWorkflowInput): Promise<Workflow> {
    return this.request<Workflow>(`/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.request<void>(`/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  async validateWorkflow(id: string): Promise<WorkflowValidationResult> {
    return this.request<WorkflowValidationResult>(`/workflows/${id}/validate`);
  }

  async executeWorkflow(id: string, input?: ExecuteWorkflowInput): Promise<WorkflowExecution> {
    return this.request<WorkflowExecution>(`/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(input ?? {}),
    });
  }

  async getWorkflowExecutions(workflowId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<WorkflowExecution>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<WorkflowExecution>>(
      `/workflows/${workflowId}/executions${query ? `?${query}` : ''}`,
    );
  }

  async getAllWorkflowExecutions(params?: {
    workflowId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<WorkflowExecution>> {
    const searchParams = new URLSearchParams();
    if (params?.workflowId) searchParams.set('workflowId', params.workflowId);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<WorkflowExecution>>(
      `/workflows/all/executions${query ? `?${query}` : ''}`,
    );
  }

  async getWorkflowExecution(executionId: string): Promise<WorkflowExecution> {
    return this.request<WorkflowExecution>(`/workflows/executions/${executionId}`);
  }

  // ============ Plugin Marketplace Methods ============

  async searchMarketplacePlugins(params?: PluginSearchParams): Promise<PaginatedResponse<Plugin>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.installSource) searchParams.set('installSource', params.installSource);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<Plugin>>(`/plugins${query ? `?${query}` : ''}`);
  }

  async getMarketplacePlugin(nameOrId: string): Promise<PluginDetail> {
    return this.request<PluginDetail>(`/plugins/${encodeURIComponent(nameOrId)}`);
  }

  async getPluginCategories(): Promise<PluginCategory[]> {
    return this.request<PluginCategory[]>('/plugins/categories');
  }

  async getFeaturedPlugins(): Promise<Plugin[]> {
    return this.request<Plugin[]>('/plugins/featured');
  }

  async registerMarketplacePlugin(input: RegisterPluginInput): Promise<Plugin> {
    return this.request<Plugin>('/plugins', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async trackPluginInstall(nameOrId: string, input?: TrackPluginInstallInput): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/plugins/${encodeURIComponent(nameOrId)}/install`, {
      method: 'POST',
      body: JSON.stringify(input ?? {}),
    });
  }

  // ============ Document Methods ============

  async listDocuments(params?: DocumentQueryParams): Promise<PaginatedResponse<Document>> {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.folderId) searchParams.set('folderId', params.folderId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.tagIds?.length) searchParams.set('tagIds', params.tagIds.join(','));
    if (params?.includeArchived) searchParams.set('includeArchived', 'true');
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<Document>>(`/documents${query ? `?${query}` : ''}`);
  }

  async getDocument(id: string): Promise<Document> {
    return this.request<Document>(`/documents/${id}`);
  }

  async createDocument(input: CreateDocumentInput): Promise<Document> {
    return this.request<Document>('/documents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateDocument(id: string, input: UpdateDocumentInput): Promise<Document> {
    return this.request<Document>(`/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request<void>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async searchDocuments(params: DocumentSearchParams): Promise<DocumentSearchResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.set('query', params.query);
    if (params.projectId) searchParams.set('projectId', params.projectId);
    if (params.folderId) searchParams.set('folderId', params.folderId);
    if (params.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<DocumentSearchResult[]>(`/documents/search?${query}`);
  }

  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    return this.request<DocumentVersion[]>(`/documents/${documentId}/versions`);
  }

  async getDocumentVersion(documentId: string, version: number): Promise<DocumentVersion> {
    return this.request<DocumentVersion>(`/documents/${documentId}/versions/${version}`);
  }

  async restoreDocumentVersion(documentId: string, version: number): Promise<Document> {
    return this.request<Document>(`/documents/${documentId}/restore/${version}`, {
      method: 'POST',
    });
  }

  async addDocumentTags(documentId: string, tagIds: string[]): Promise<void> {
    await this.request<void>(`/documents/${documentId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagIds }),
    });
  }

  async removeDocumentTag(documentId: string, tagId: string): Promise<void> {
    await this.request<void>(`/documents/${documentId}/tags/${tagId}`, {
      method: 'DELETE',
    });
  }

  async getDocumentTags(documentId: string): Promise<Tag[]> {
    return this.request<Tag[]>(`/documents/${documentId}/tags`);
  }

  // ============ Tag CRUD Methods ============

  async listTags(): Promise<Tag[]> {
    return this.request<Tag[]>('/tags');
  }

  async getTag(id: string): Promise<Tag> {
    return this.request<Tag>(`/tags/${id}`);
  }

  async createTag(input: CreateTagInput): Promise<Tag> {
    return this.request<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateTag(id: string, input: UpdateTagInput): Promise<Tag> {
    return this.request<Tag>(`/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteTag(id: string): Promise<void> {
    await this.request<void>(`/tags/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ Document Folder Methods ============

  async listDocumentFolders(params?: DocumentFolderQueryParams): Promise<DocumentFolder[]> {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.parentId) searchParams.set('parentId', params.parentId);
    if (params?.includeArchived) searchParams.set('includeArchived', 'true');
    const query = searchParams.toString();
    return this.request<DocumentFolder[]>(`/document-folders${query ? `?${query}` : ''}`);
  }

  async getDocumentFolderTree(params?: DocumentFolderQueryParams): Promise<DocumentFolderTree> {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    const query = searchParams.toString();
    return this.request<DocumentFolderTree>(`/document-folders/tree${query ? `?${query}` : ''}`);
  }

  async getDocumentFolder(id: string): Promise<DocumentFolder> {
    return this.request<DocumentFolder>(`/document-folders/${id}`);
  }

  async createDocumentFolder(input: CreateDocumentFolderInput): Promise<DocumentFolder> {
    return this.request<DocumentFolder>('/document-folders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateDocumentFolder(id: string, input: UpdateDocumentFolderInput): Promise<DocumentFolder> {
    return this.request<DocumentFolder>(`/document-folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteDocumentFolder(id: string): Promise<void> {
    await this.request<void>(`/document-folders/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderDocumentFolders(input: ReorderDocumentFoldersInput): Promise<void> {
    await this.request<void>('/document-folders/reorder', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ============ Requirement Methods ============

  async listRequirements(params?: ListRequirementsQuery): Promise<Requirement[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.featureId) searchParams.set('featureId', params.featureId);
    if (params?.tagId) searchParams.set('tagId', params.tagId);
    if (params?.assigneeId) searchParams.set('assigneeId', params.assigneeId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.includeArchived) searchParams.set('includeArchived', 'true');
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    const query = searchParams.toString();
    return this.request<Requirement[]>(`/requirements${query ? `?${query}` : ''}`);
  }

  async getRequirement(id: string): Promise<Requirement> {
    return this.request<Requirement>(`/requirements/${id}`);
  }

  async createRequirement(input: CreateRequirementInput): Promise<Requirement> {
    return this.request<Requirement>('/requirements', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateRequirement(id: string, input: UpdateRequirementInput): Promise<Requirement> {
    return this.request<Requirement>(`/requirements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async updateRequirementStatus(id: string, status: RequirementStatus): Promise<Requirement> {
    return this.request<Requirement>(`/requirements/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteRequirement(id: string): Promise<void> {
    await this.request<void>(`/requirements/${id}`, {
      method: 'DELETE',
    });
  }

  async searchRequirements(params: { q: string; includeArchived?: boolean }): Promise<Requirement[]> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', params.q);
    if (params.includeArchived) searchParams.set('includeArchived', 'true');
    const query = searchParams.toString();
    return this.request<Requirement[]>(`/requirements/search?${query}`);
  }

  // ============ Acceptance Criteria Methods ============

  async listAcceptanceCriteria(requirementId: string): Promise<AcceptanceCriterion[]> {
    return this.request<AcceptanceCriterion[]>(`/requirements/${requirementId}/acceptance-criteria`);
  }

  async createAcceptanceCriterion(requirementId: string, input: CreateAcceptanceCriterionInput): Promise<AcceptanceCriterion> {
    return this.request<AcceptanceCriterion>(`/requirements/${requirementId}/acceptance-criteria`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateAcceptanceCriterion(id: string, input: UpdateAcceptanceCriterionInput): Promise<AcceptanceCriterion> {
    return this.request<AcceptanceCriterion>(`/acceptance-criteria/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteAcceptanceCriterion(id: string): Promise<void> {
    await this.request<void>(`/acceptance-criteria/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ Precondition Methods ============

  async listPreconditions(requirementId: string): Promise<Precondition[]> {
    return this.request<Precondition[]>(`/requirements/${requirementId}/preconditions`);
  }

  async createPrecondition(requirementId: string, input: CreatePreconditionInput): Promise<Precondition> {
    return this.request<Precondition>(`/requirements/${requirementId}/preconditions`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updatePrecondition(id: string, input: UpdatePreconditionInput): Promise<Precondition> {
    return this.request<Precondition>(`/preconditions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deletePrecondition(id: string): Promise<void> {
    await this.request<void>(`/preconditions/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ Verification Test Methods ============

  async listVerificationTests(requirementId: string): Promise<VerificationTest[]> {
    return this.request<VerificationTest[]>(`/requirements/${requirementId}/verification-tests`);
  }

  async createVerificationTest(requirementId: string, input: CreateVerificationTestInput): Promise<VerificationTest> {
    return this.request<VerificationTest>(`/requirements/${requirementId}/verification-tests`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateVerificationTest(id: string, input: UpdateVerificationTestInput): Promise<VerificationTest> {
    return this.request<VerificationTest>(`/verification-tests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteVerificationTest(id: string): Promise<void> {
    await this.request<void>(`/verification-tests/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ Requirement Link Methods ============

  async listRequirementLinks(requirementId: string): Promise<RequirementLink[]> {
    return this.request<RequirementLink[]>(`/requirements/${requirementId}/links`);
  }

  async createRequirementLink(requirementId: string, input: CreateRequirementLinkInput): Promise<RequirementLink> {
    return this.request<RequirementLink>(`/requirements/${requirementId}/links`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deleteRequirementLink(linkId: string): Promise<void> {
    await this.request<void>(`/requirement-links/${linkId}`, {
      method: 'DELETE',
    });
  }

  // ============ Requirement Comment Methods ============

  async listRequirementComments(requirementId: string): Promise<RequirementComment[]> {
    return this.request<RequirementComment[]>(`/requirements/${requirementId}/comments`);
  }

  async createRequirementComment(requirementId: string, input: CreateRequirementCommentInput): Promise<RequirementComment> {
    return this.request<RequirementComment>(`/requirements/${requirementId}/comments`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateRequirementComment(id: string, input: UpdateRequirementCommentInput): Promise<RequirementComment> {
    return this.request<RequirementComment>(`/requirement-comments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteRequirementComment(id: string): Promise<void> {
    await this.request<void>(`/requirement-comments/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ Requirement Tag Methods ============

  async addRequirementTags(requirementId: string, tagIds: string[]): Promise<void> {
    await this.request<void>(`/requirements/${requirementId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagIds }),
    });
  }

  async removeRequirementTag(requirementId: string, tagId: string): Promise<void> {
    await this.request<void>(`/requirements/${requirementId}/tags/${tagId}`, {
      method: 'DELETE',
    });
  }

  async getRequirementTags(requirementId: string): Promise<Tag[]> {
    return this.request<Tag[]>(`/requirements/${requirementId}/tags`);
  }

  // ============ Requirement Quality Methods ============

  async calculateRequirementQuality(requirementId: string): Promise<RequirementQualityScore> {
    return this.request<RequirementQualityScore>(`/requirements/${requirementId}/quality/calculate`, {
      method: 'POST',
    });
  }

  async getRequirementQuality(requirementId: string): Promise<RequirementQualityScore> {
    return this.request<RequirementQualityScore>(`/requirements/${requirementId}/quality`);
  }

  // ============ Requirement Activity Methods ============

  async getRequirementActivity(requirementId: string): Promise<unknown[]> {
    return this.request<unknown[]>(`/requirements/${requirementId}/activity`);
  }
}
