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

export interface TaskStatistics {
  total: number;
  byStatus: Record<string, number>;
  completedLast7Days: number;
  completedLast30Days: number;
  totalEstimatedHours: number;
  completedEstimatedHours: number;
}

export interface FeatureStatistics {
  total: number;
  byStatus: Record<string, number>;
}

export interface RecentActivityItem {
  type: 'task' | 'feature';
  id: string;
  title: string;
  action: string;
  updatedAt: string;
}

export interface ProjectStatistics {
  projectId: string;
  tasks: TaskStatistics;
  features: FeatureStatistics;
  progressPercentage: number;
  blockedCount: number;
  recentActivity: RecentActivityItem[];
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

export type FeatureStatus = 'new' | 'rfc' | 'approved' | 'blocked' | 'ready_for_dev' | 'ready_for_review' | 'done';

export interface Feature {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  sortOrder: number;
  isArchived: boolean;
  status: FeatureStatus;
  taskCount: number;
  commentCount: number;
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
  status?: FeatureStatus;
}

export interface UpdateFeatureInput {
  name?: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
  status?: FeatureStatus;
}

export interface FeatureComment {
  id: string;
  featureId: string;
  content: string;
  mentionedUsers: string[];
  createdBy: string | null;
  createdBySource: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUser?: { email: string; fullName: string | null };
}

export interface FeatureHistory {
  id: string;
  featureId: string;
  changeType: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  changeSource: string;
  createdAt: string;
}

export interface GenerateTasksInput {
  additionalContext?: string;
  model?: string;
}

export interface GenerateTasksResponse {
  featureId: string;
  tasksCreated: Task[];
  tokensInput: number;
  tokensOutput: number;
  executionTimeMs: number;
}

export interface BulkGenerateTasksResponse {
  featuresProcessed: number;
  results: GenerateTasksResponse[];
  totalTasksCreated: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalExecutionTimeMs: number;
}

export interface GenerateFeaturesInput {
  document?: string;
  additionalContext?: string;
  model?: string;
}

export interface GenerateFeaturesResponse {
  featuresCreated: Feature[];
  tokensInput: number;
  tokensOutput: number;
  executionTimeMs: number;
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

// ============ Test Session Types ============

export type TestSessionStatus = 'running' | 'completed' | 'failed' | 'cancelled';
export type TestSessionTriggeredBy = 'ai' | 'manual' | 'ci';
export type MetricType = 'network' | 'console' | 'interaction' | 'page_visit' | 'screenshot' | 'performance' | 'custom';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueType = 'bug' | 'ux' | 'performance' | 'accessibility' | 'security' | 'other';
export type IssueStatus = 'new' | 'confirmed' | 'false_positive' | 'fixed';

export interface TestSession {
  id: string;
  tenantId: string;
  projectId: string | null;
  featureId: string | null;
  name: string | null;
  triggeredBy: TestSessionTriggeredBy;
  status: TestSessionStatus;
  metadata: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  metrics?: TestMetric[];
  issues?: TestIssue[];
}

export interface TestMetric {
  id: string;
  sessionId: string;
  metricType: MetricType;
  metricName: string;
  value: unknown;
  metadata: Record<string, unknown> | null;
  recordedAt: string;
  createdAt: string;
}

export interface TestIssue {
  id: string;
  tenantId: string;
  sessionId: string | null;
  projectId: string | null;
  featureId: string | null;
  taskId: string | null;
  title: string;
  description: string | null;
  issueType: IssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  stepsToReproduce: string[] | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  environment: Record<string, unknown> | null;
  pageUrl: string | null;
  selector: string | null;
  screenshotUrl: string | null;
  consoleErrors: Record<string, unknown>[] | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestSessionInput {
  projectId?: string;
  featureId?: string;
  name?: string;
  triggeredBy?: TestSessionTriggeredBy;
  metadata?: Record<string, unknown>;
}

export interface UpdateTestSessionInput {
  name?: string;
  projectId?: string;
  featureId?: string;
  triggeredBy?: TestSessionTriggeredBy;
  metadata?: Record<string, unknown>;
}

export interface RecordMetricInput {
  metricType: MetricType;
  metricName: string;
  value: unknown;
  metadata?: Record<string, unknown>;
  recordedAt?: string;
}

export interface CompleteSessionInput {
  status?: 'completed' | 'failed' | 'cancelled';
  notes?: string;
}

export interface SessionCompletionResponse {
  id: string;
  status: 'completed' | 'failed' | 'cancelled';
  durationMs: number;
  summary: SessionSummary;
  message: string;
}

export interface SessionSummary {
  totalDurationMs: number;
  pagesVisited: number;
  uniqueRoutes: string[];
  networkRequests: {
    total: number;
    failed: number;
    avgDurationMs: number;
  };
  consoleMessages: {
    errors: number;
    warnings: number;
  };
  interactions: {
    total: number;
    successful: number;
    failed: number;
  };
  issuesFound: number;
  notes?: string;
}

export interface CreateTestIssueInput {
  sessionId?: string;
  projectId?: string;
  featureId?: string;
  taskId?: string;
  title: string;
  description?: string;
  issueType?: IssueType;
  severity?: IssueSeverity;
  stepsToReproduce?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  environment?: Record<string, unknown>;
  pageUrl?: string;
  selector?: string;
  screenshotUrl?: string;
  consoleErrors?: Record<string, unknown>[];
}

export interface UpdateTestIssueInput {
  title?: string;
  description?: string;
  issueType?: IssueType;
  severity?: IssueSeverity;
  status?: IssueStatus;
  stepsToReproduce?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  environment?: Record<string, unknown>;
  pageUrl?: string;
  selector?: string;
  screenshotUrl?: string;
  consoleErrors?: Record<string, unknown>[];
  projectId?: string;
  sessionId?: string;
  featureId?: string;
  taskId?: string;
}

export interface TestSessionQueryParams {
  projectId?: string;
  featureId?: string;
  status?: TestSessionStatus;
  triggeredBy?: TestSessionTriggeredBy;
  includeMetrics?: boolean;
  page?: number;
  limit?: number;
}

export interface TestIssueQueryParams {
  sessionId?: string;
  projectId?: string;
  featureId?: string;
  taskId?: string;
  issueType?: IssueType;
  severity?: IssueSeverity;
  status?: IssueStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// ============ Quality Metrics Types ============

export type QualitySnapshotStatus = 'running' | 'completed' | 'failed';
export type QualitySnapshotSource = 'mcp' | 'ci' | 'manual';
export type QualityMetricType =
  | 'eslint'
  | 'typescript'
  | 'test_coverage'
  | 'cyclomatic_complexity'
  | 'code_duplication'
  | 'bundle_size'
  | 'dependency_health'
  | 'dead_code'
  | 'pattern_adherence'
  | 'custom';
export type QualityIssueSeverity = 'error' | 'warning' | 'info' | 'hint';
export type QualityIssueStatus = 'new' | 'acknowledged' | 'fixed' | 'wont_fix';
export type QualityIssueCategory =
  | 'lint'
  | 'type'
  | 'coverage'
  | 'complexity'
  | 'duplication'
  | 'bundle'
  | 'dependency'
  | 'dead_code'
  | 'pattern'
  | 'security';

export interface QualitySnapshot {
  id: string;
  tenantId: string;
  projectId: string | null;
  name: string | null;
  source: QualitySnapshotSource;
  status: QualitySnapshotStatus;
  gitBranch: string | null;
  gitCommitSha: string | null;
  metadata: Record<string, unknown> | null;
  summary: QualitySnapshotSummary | null;
  startedAt: string;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  metrics?: QualityMetric[];
}

export interface QualitySnapshotSummary {
  overall_score?: number;
  eslint?: {
    score?: number;
    errors?: number;
    warnings?: number;
    fixableErrors?: number;
    fixableWarnings?: number;
  };
  typescript?: {
    score?: number;
    coverage?: number;
    errors?: number;
    strictErrors?: number;
  };
  tests?: {
    score?: number;
    coverage?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
    lineCoverage?: number;
    branchCoverage?: number;
    functionCoverage?: number;
  };
  complexity?: {
    score?: number;
    avgCyclomatic?: number;
    maxCyclomatic?: number;
    highComplexityFiles?: number;
  };
  duplication?: {
    score?: number;
    percentage?: number;
    duplicatedLines?: number;
    totalLines?: number;
  };
  bundle?: {
    score?: number;
    totalSizeKb?: number;
    mainChunkKb?: number;
    gzippedSizeKb?: number;
  };
  dependencies?: {
    score?: number;
    total?: number;
    outdated?: number;
    vulnerable?: number;
    vulnerabilityCritical?: number;
    vulnerabilityHigh?: number;
    vulnerabilityModerate?: number;
    vulnerabilityLow?: number;
  };
  deadCode?: {
    score?: number;
    unusedExports?: number;
    unusedFiles?: number;
    unreachableCode?: number;
  };
  patterns?: {
    score?: number;
    totalRules?: number;
    violations?: number;
    passed?: number;
    violationsByType?: Record<string, number>;
  };
}

export interface QualityMetric {
  id: string;
  snapshotId: string;
  metricType: QualityMetricType;
  metricName: string;
  value: unknown;
  score: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface QualityIssue {
  id: string;
  tenantId: string;
  snapshotId: string | null;
  projectId: string | null;
  title: string;
  description: string | null;
  category: QualityIssueCategory;
  severity: QualityIssueSeverity;
  status: QualityIssueStatus;
  filePath: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  endLine: number | null;
  endColumn: number | null;
  codeSnippet: string | null;
  ruleId: string | null;
  ruleUrl: string | null;
  tool: string | null;
  suggestedFix: string | null;
  autoFixable: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQualitySnapshotInput {
  projectId?: string;
  name?: string;
  source?: QualitySnapshotSource;
  gitBranch?: string;
  gitCommitSha?: string;
  metadata?: Record<string, unknown>;
}

export interface CompleteQualitySnapshotInput {
  status?: 'completed' | 'failed';
  notes?: string;
}

export interface RecordQualityMetricInput {
  metricType: QualityMetricType;
  metricName: string;
  value: unknown;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateQualityIssueInput {
  snapshotId?: string;
  projectId?: string;
  title: string;
  description?: string;
  category: QualityIssueCategory;
  severity?: QualityIssueSeverity;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  endLine?: number;
  endColumn?: number;
  codeSnippet?: string;
  ruleId?: string;
  ruleUrl?: string;
  tool?: string;
  suggestedFix?: string;
  autoFixable?: boolean;
}

export interface BulkCreateQualityIssueInput {
  issues: CreateQualityIssueInput[];
}

export interface UpdateQualityIssueInput {
  title?: string;
  description?: string;
  category?: QualityIssueCategory;
  severity?: QualityIssueSeverity;
  status?: QualityIssueStatus;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  endLine?: number;
  endColumn?: number;
  codeSnippet?: string;
  ruleId?: string;
  ruleUrl?: string;
  tool?: string;
  suggestedFix?: string;
  autoFixable?: boolean;
}

export interface QualitySnapshotQueryParams {
  projectId?: string;
  status?: QualitySnapshotStatus;
  source?: QualitySnapshotSource;
  page?: number;
  limit?: number;
}

export interface QualityIssueQueryParams {
  snapshotId?: string;
  projectId?: string;
  category?: QualityIssueCategory;
  severity?: QualityIssueSeverity;
  status?: QualityIssueStatus;
  tool?: string;
  ruleId?: string;
  filePath?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface QualitySnapshotCompletionResponse {
  id: string;
  status: 'completed' | 'failed';
  durationMs: number;
  summary: QualitySnapshotSummary;
  message: string;
}

export interface QualityOverview {
  projectId: string;
  projectName: string;
  overallScore: number;
  overallTrend: 'up' | 'down' | 'stable';
  metrics: Record<string, {
    score: number;
    value?: string | number;
    trend?: 'up' | 'down' | 'stable';
    changePercent?: number;
  }>;
  issues: {
    total: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  latestSnapshot: {
    id: string;
    completedAt: string;
    source: string;
  } | null;
  snapshotCount: number;
  periodStart: string;
  periodEnd: string;
}

export interface QualityTrends {
  projectId: string;
  metricType: string;
  granularity: string;
  dataPoints: Array<{
    date: string;
    score: number;
    snapshotId?: string;
    value?: string | number;
  }>;
  averageScore: number;
  minScore: number;
  maxScore: number;
  changePercent?: number;
  periodStart: string;
  periodEnd: string;
}

export interface QualityAnalyticsQueryParams {
  period?: '7d' | '30d' | '90d' | '1y' | 'all';
  granularity?: 'daily' | 'weekly' | 'monthly';
  metricType?: string;
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

  async getProjectStatistics(projectId: string): Promise<ProjectStatistics> {
    return this.request<ProjectStatistics>(`/projects/${projectId}/statistics`);
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

  async updateFeatureStatus(id: string, status: FeatureStatus, force?: boolean): Promise<Feature> {
    return this.request<Feature>(`/features/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(force !== undefined && { force }) }),
    });
  }

  async getFeatureHistory(id: string): Promise<FeatureHistory[]> {
    return this.request<FeatureHistory[]>(`/features/${id}/history`);
  }

  async listReadyForDevFeatures(projectId: string): Promise<Feature[]> {
    return this.request<Feature[]>(`/projects/${projectId}/features/ready-for-dev`);
  }

  async getFeatureChildren(
    parentId: string,
    params?: { recursive?: boolean; includeArchived?: boolean },
  ): Promise<Feature[]> {
    const searchParams = new URLSearchParams();
    if (params?.recursive) searchParams.set('recursive', 'true');
    if (params?.includeArchived) searchParams.set('includeArchived', 'true');
    const query = searchParams.toString();
    return this.request<Feature[]>(`/features/${parentId}/children${query ? `?${query}` : ''}`);
  }

  async searchFeatures(
    projectId: string,
    params: { q: string; includeArchived?: boolean },
  ): Promise<Feature[]> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', params.q);
    if (params.includeArchived) searchParams.set('includeArchived', 'true');
    const query = searchParams.toString();
    return this.request<Feature[]>(`/projects/${projectId}/features/search?${query}`);
  }

  // ============ Feature Comment Methods ============

  async listFeatureComments(featureId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<FeatureComment>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<FeatureComment>>(`/features/${featureId}/comments${query ? `?${query}` : ''}`);
  }

  async addFeatureComment(featureId: string, input: CreateCommentInput): Promise<FeatureComment> {
    return this.request<FeatureComment>(`/features/${featureId}/comments`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ============ AI Generation Methods ============

  async generateTasksFromFeature(featureId: string, input?: GenerateTasksInput): Promise<GenerateTasksResponse> {
    return this.request<GenerateTasksResponse>(`/features/${featureId}/generate-tasks`, {
      method: 'POST',
      body: JSON.stringify(input ?? {}),
    });
  }

  async generateTasksBulk(projectId: string, input?: GenerateTasksInput): Promise<BulkGenerateTasksResponse> {
    return this.request<BulkGenerateTasksResponse>(`/projects/${projectId}/generate-tasks-bulk`, {
      method: 'POST',
      body: JSON.stringify(input ?? {}),
    });
  }

  async generateFeaturesFromDocument(projectId: string, input: GenerateFeaturesInput): Promise<GenerateFeaturesResponse> {
    return this.request<GenerateFeaturesResponse>(`/projects/${projectId}/generate-features`, {
      method: 'POST',
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

  // ============ Test Session Methods ============

  async createTestSession(input: CreateTestSessionInput): Promise<TestSession> {
    return this.request<TestSession>('/test-sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async listTestSessions(params?: TestSessionQueryParams): Promise<PaginatedResponse<TestSession>> {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.featureId) searchParams.set('featureId', params.featureId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.triggeredBy) searchParams.set('triggeredBy', params.triggeredBy);
    if (params?.includeMetrics) searchParams.set('includeMetrics', 'true');
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<TestSession>>(`/test-sessions${query ? `?${query}` : ''}`);
  }

  async getTestSession(id: string, includeMetrics = false): Promise<TestSession> {
    const query = includeMetrics ? '?includeMetrics=true' : '';
    return this.request<TestSession>(`/test-sessions/${id}${query}`);
  }

  async recordMetric(sessionId: string, input: RecordMetricInput): Promise<TestMetric> {
    // Transform MCP input format to backend expected format
    // MCP sends: { metricType, metricName, value, metadata }
    // Backend expects: { metricType, metricData }
    const backendPayload = {
      metricType: input.metricType,
      metricData: {
        name: input.metricName,
        value: input.value,
        ...input.metadata,
      },
    };

    return this.request<TestMetric>(`/test-sessions/${sessionId}/metrics`, {
      method: 'POST',
      body: JSON.stringify(backendPayload),
    });
  }

  async getSessionMetrics(sessionId: string): Promise<TestMetric[]> {
    return this.request<TestMetric[]>(`/test-sessions/${sessionId}/metrics`);
  }

  async completeSession(sessionId: string, input?: CompleteSessionInput): Promise<SessionCompletionResponse> {
    return this.request<SessionCompletionResponse>(`/test-sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(input ?? {}),
    });
  }

  // ============ Test Issue Methods ============

  async createTestIssue(input: CreateTestIssueInput): Promise<TestIssue> {
    return this.request<TestIssue>('/test-issues', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async listTestIssues(params?: TestIssueQueryParams): Promise<PaginatedResponse<TestIssue>> {
    const searchParams = new URLSearchParams();
    if (params?.sessionId) searchParams.set('sessionId', params.sessionId);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.featureId) searchParams.set('featureId', params.featureId);
    if (params?.taskId) searchParams.set('taskId', params.taskId);
    if (params?.issueType) searchParams.set('issueType', params.issueType);
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<TestIssue>>(`/test-issues${query ? `?${query}` : ''}`);
  }

  async getTestIssue(id: string): Promise<TestIssue> {
    return this.request<TestIssue>(`/test-issues/${id}`);
  }

  async updateTestIssue(id: string, input: UpdateTestIssueInput): Promise<TestIssue> {
    return this.request<TestIssue>(`/test-issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  // ============ Quality Snapshot Methods ============

  async createQualitySnapshot(input: CreateQualitySnapshotInput): Promise<QualitySnapshot> {
    return this.request<QualitySnapshot>('/quality-snapshots', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async listQualitySnapshots(params?: QualitySnapshotQueryParams): Promise<PaginatedResponse<QualitySnapshot>> {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<QualitySnapshot>>(`/quality-snapshots${query ? `?${query}` : ''}`);
  }

  async getQualitySnapshot(id: string, includeMetrics = false): Promise<QualitySnapshot> {
    const query = includeMetrics ? '?includeMetrics=true' : '';
    return this.request<QualitySnapshot>(`/quality-snapshots/${id}${query}`);
  }

  async recordQualityMetric(snapshotId: string, input: RecordQualityMetricInput): Promise<QualityMetric> {
    return this.request<QualityMetric>(`/quality-snapshots/${snapshotId}/metrics`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getQualitySnapshotMetrics(snapshotId: string): Promise<QualityMetric[]> {
    return this.request<QualityMetric[]>(`/quality-snapshots/${snapshotId}/metrics`);
  }

  async completeQualitySnapshot(snapshotId: string, input: CompleteQualitySnapshotInput): Promise<QualitySnapshotCompletionResponse> {
    return this.request<QualitySnapshotCompletionResponse>(`/quality-snapshots/${snapshotId}/complete`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ============ Quality Issue Methods ============

  async createQualityIssue(input: CreateQualityIssueInput): Promise<QualityIssue> {
    return this.request<QualityIssue>('/quality-issues', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async bulkCreateQualityIssues(input: BulkCreateQualityIssueInput): Promise<{ created: number; issues: QualityIssue[] }> {
    return this.request<{ created: number; issues: QualityIssue[] }>('/quality-issues/bulk', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async listQualityIssues(params?: QualityIssueQueryParams): Promise<PaginatedResponse<QualityIssue>> {
    const searchParams = new URLSearchParams();
    if (params?.snapshotId) searchParams.set('snapshotId', params.snapshotId);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.tool) searchParams.set('tool', params.tool);
    if (params?.ruleId) searchParams.set('ruleId', params.ruleId);
    if (params?.filePath) searchParams.set('filePath', params.filePath);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<PaginatedResponse<QualityIssue>>(`/quality-issues${query ? `?${query}` : ''}`);
  }

  async getQualityIssue(id: string): Promise<QualityIssue> {
    return this.request<QualityIssue>(`/quality-issues/${id}`);
  }

  async updateQualityIssue(id: string, input: UpdateQualityIssueInput): Promise<QualityIssue> {
    return this.request<QualityIssue>(`/quality-issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async updateQualityIssueStatus(id: string, status: QualityIssueStatus): Promise<QualityIssue> {
    return this.request<QualityIssue>(`/quality-issues/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ============ Quality Analytics Methods ============

  async getQualityOverview(projectId: string, params?: QualityAnalyticsQueryParams): Promise<QualityOverview> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    if (params?.granularity) searchParams.set('granularity', params.granularity);
    const query = searchParams.toString();
    return this.request<QualityOverview>(`/projects/${projectId}/quality-analytics${query ? `?${query}` : ''}`);
  }

  async getQualityTrends(projectId: string, params?: QualityAnalyticsQueryParams): Promise<QualityTrends> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    if (params?.granularity) searchParams.set('granularity', params.granularity);
    if (params?.metricType) searchParams.set('metricType', params.metricType);
    const query = searchParams.toString();
    return this.request<QualityTrends>(`/projects/${projectId}/quality-analytics/trends${query ? `?${query}` : ''}`);
  }
}
