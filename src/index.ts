#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ThinkPromptApiClient } from './api-client.js';
import type {
  ListRequirementsQuery,
  CreateRequirementInput,
  UpdateRequirementInput,
  Requirement,
  AcceptanceCriterion,
  VerificationTest,
  Precondition,
  RequirementComment,
} from './api-client.js';

// Response helpers to reduce boilerplate
function jsonResponse(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function successResponse(message: string) {
  return jsonResponse({ success: true, message });
}

// Safely extract array from API response (handles both raw arrays and { data: [...] } wrappers)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractArray<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result?.data && Array.isArray(result.data)) return result.data;
  return [];
}

// Compact mode helpers for requirement sub-entities
function compactRequirement(r: Requirement) {
  return {
    id: r.id,
    displayId: r.displayId,
    title: r.title,
    status: r.status,
    isArchived: r.isArchived,
    qualityScore: r.qualityScore?.overall != null ? { overall: r.qualityScore.overall } : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    acceptanceCriteriaCount: r.acceptanceCriteriaCount,
    preconditionsCount: r.preconditionsCount,
    verificationTestsCount: r.verificationTestsCount,
    linksCount: r.linksCount,
    commentsCount: r.commentsCount,
    tags: r.tags,
  };
}

function compactAcceptanceCriterion(ac: AcceptanceCriterion) {
  return {
    id: ac.id,
    scenarioName: ac.scenarioName,
    type: ac.type,
    sortOrder: ac.sortOrder,
  };
}

function compactVerificationTest(vt: VerificationTest) {
  return {
    id: vt.id,
    testName: vt.testName,
    testType: vt.testType,
    sortOrder: vt.sortOrder,
  };
}

function compactPrecondition(p: Precondition) {
  return {
    id: p.id,
    category: p.category,
    title: p.title,
    isMet: p.isMet,
    sortOrder: p.sortOrder,
  };
}

function compactRequirementComment(c: RequirementComment) {
  return {
    id: c.id,
    commentLevel: c.commentLevel,
    status: c.status,
    createdBy: c.createdBy,
    createdAt: c.createdAt,
    replyCount: c.replies?.length ?? 0,
  };
}

// Configuration from environment variables
const API_URL = process.env.THINKPROMPT_API_URL ?? 'http://localhost:3000/api/v1';
const API_KEY = process.env.THINKPROMPT_API_KEY ?? '';

if (!API_KEY) {
  console.error('Error: THINKPROMPT_API_KEY environment variable is required');
  process.exit(1);
}

const apiClient = new ThinkPromptApiClient(API_URL, API_KEY);

// Create MCP server
const server = new Server(
  {
    name: '@honeyfield/thinkprompt-mcp',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_prompts',
      description: 'List all available prompts from ThinkPrompt. Returns a paginated list of prompts with their titles, descriptions, and usage statistics.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of prompts to return (default: 20)',
          },
          page: {
            type: 'number',
            description: 'Page number for pagination (default: 1)',
          },
          search: {
            type: 'string',
            description: 'Search query to filter prompts by title or description',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter prompts by tags',
          },
        },
      },
    },
    {
      name: 'get_prompt',
      description: 'Get detailed information about a specific prompt, including its content and variables.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the prompt to retrieve',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'get_prompt_variables',
      description: 'Get the list of variables required by a prompt, with their types and descriptions.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the prompt',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'create_prompt',
      description: 'Create a new prompt with title, content, and optional variables.',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the prompt',
          },
          content: {
            type: 'string',
            description: 'The prompt content with {{variable}} placeholders',
          },
          description: {
            type: 'string',
            description: 'Optional description of the prompt',
          },
          variables: {
            type: 'array',
            description: 'List of variables used in the prompt',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Variable name (without braces)' },
                type: {
                  type: 'string',
                  enum: ['text', 'textarea', 'number', 'select', 'date', 'boolean'],
                  description: 'Variable type',
                },
                label: { type: 'string', description: 'Display label' },
                description: { type: 'string', description: 'Variable description' },
                required: { type: 'boolean', description: 'Whether the variable is required' },
                defaultValue: { description: 'Default value for the variable' },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Options for select type',
                },
              },
              required: ['name', 'type'],
            },
          },
          isPublic: {
            type: 'boolean',
            description: 'Whether the prompt is publicly visible',
          },
        },
        required: ['title', 'content'],
      },
    },
    {
      name: 'update_prompt',
      description: 'Update an existing prompt. Only include fields you want to change.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the prompt to update',
          },
          title: {
            type: 'string',
            description: 'New title for the prompt',
          },
          content: {
            type: 'string',
            description: 'New prompt content with {{variable}} placeholders',
          },
          description: {
            type: 'string',
            description: 'New description of the prompt',
          },
          variables: {
            type: 'array',
            description: 'Updated list of variables',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Variable name (without braces)' },
                type: {
                  type: 'string',
                  enum: ['text', 'textarea', 'number', 'select', 'date', 'boolean'],
                  description: 'Variable type',
                },
                label: { type: 'string', description: 'Display label' },
                description: { type: 'string', description: 'Variable description' },
                required: { type: 'boolean', description: 'Whether the variable is required' },
                defaultValue: { description: 'Default value for the variable' },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Options for select type',
                },
              },
              required: ['name', 'type'],
            },
          },
          isPublic: {
            type: 'boolean',
            description: 'Whether the prompt is publicly visible',
          },
        },
        required: ['id'],
      },
    },
    // Template tools
    {
      name: 'list_templates',
      description: 'List all available templates from ThinkPrompt. Templates can be example prompts or style guides showing HOW to write prompts. Filter by type, category, or language.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of templates to return (default: 20)',
          },
          page: {
            type: 'number',
            description: 'Page number for pagination (default: 1)',
          },
          search: {
            type: 'string',
            description: 'Search query to filter templates',
          },
          type: {
            type: 'string',
            enum: ['example', 'style'],
            description: 'Filter by template type: "example" for example prompts, "style" for writing style guides',
          },
          category: {
            type: 'string',
            description: 'Filter by category (e.g., "code-review", "documentation", "email")',
          },
          language: {
            type: 'string',
            description: 'Filter by language code (e.g., "en", "de")',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by tag IDs',
          },
        },
      },
    },
    {
      name: 'get_template',
      description: 'Get detailed information about a specific template, including its content and use case hints.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the template to retrieve',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'create_template',
      description: 'Create a new template. Templates can be example prompts or style guides for AI assistants.',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the template',
          },
          content: {
            type: 'string',
            description: 'The template content',
          },
          type: {
            type: 'string',
            enum: ['example', 'style'],
            description: 'Template type: "example" for example prompts, "style" for writing style guides',
          },
          description: {
            type: 'string',
            description: 'Optional description of the template',
          },
          category: {
            type: 'string',
            description: 'Category (e.g., "code-review", "documentation", "email")',
          },
          language: {
            type: 'string',
            description: 'Language code (e.g., "en", "de")',
          },
          useCaseHints: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of hints describing when to use this template',
          },
          isPublic: {
            type: 'boolean',
            description: 'Whether the template is publicly visible',
          },
          tagIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tag IDs to associate with the template',
          },
        },
        required: ['title', 'content', 'type'],
      },
    },
    {
      name: 'update_template',
      description: 'Update an existing template. Only include fields you want to change.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the template to update',
          },
          title: { type: 'string', description: 'New title' },
          content: { type: 'string', description: 'New content' },
          type: { type: 'string', enum: ['example', 'style'], description: 'New type' },
          description: { type: 'string', description: 'New description' },
          category: { type: 'string', description: 'New category' },
          language: { type: 'string', description: 'New language' },
          useCaseHints: { type: 'array', items: { type: 'string' }, description: 'New use case hints' },
          isPublic: { type: 'boolean', description: 'New visibility' },
          tagIds: { type: 'array', items: { type: 'string' }, description: 'New tag IDs' },
        },
        required: ['id'],
      },
    },
    // Workspace tools
    {
      name: 'list_workspaces',
      description: 'List all workspaces the user belongs to. Returns workspace names, roles, and which is the current default.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_current_workspace',
      description: 'Get the currently active workspace for this session.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'switch_workspace',
      description: 'Switch to a different workspace. All subsequent API calls will use this workspace context.',
      inputSchema: {
        type: 'object',
        properties: {
          workspaceId: {
            type: 'string',
            description: 'The UUID of the workspace to switch to',
          },
        },
        required: ['workspaceId'],
      },
    },
    // Tag tools
    {
      name: 'list_tags',
      description: 'List all tags in the current workspace. Tags can be used to categorize features, tasks, and documents.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_tag',
      description: 'Get detailed information about a specific tag.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the tag' },
        },
        required: ['id'],
      },
    },
    {
      name: 'create_tag',
      description: 'Create a new tag in the current workspace.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Tag name (max 100 characters)' },
          color: { type: 'string', description: 'Hex color code (e.g., "#6366f1")' },
        },
        required: ['name'],
      },
    },
    {
      name: 'update_tag',
      description: 'Update an existing tag.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the tag to update' },
          name: { type: 'string', description: 'New tag name' },
          color: { type: 'string', description: 'New hex color code' },
        },
        required: ['id'],
      },
    },
    {
      name: 'delete_tag',
      description: 'Delete a tag. This will remove the tag from all features, tasks, and documents.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the tag to delete' },
        },
        required: ['id'],
      },
    },
    // Project Management tools
    {
      name: 'list_projects',
      description: 'List all projects in the current workspace.',
      inputSchema: {
        type: 'object',
        properties: {
          includeArchived: {
            type: 'boolean',
            description: 'Include archived projects (default: false)',
          },
        },
      },
    },
    {
      name: 'get_project',
      description: 'Get detailed information about a project.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the project' },
        },
        required: ['id'],
      },
    },
    {
      name: 'get_project_statistics',
      description: 'Get dashboard statistics for a project including task/feature counts, progress, velocity, and recent activity.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'The UUID of the project' },
        },
        required: ['projectId'],
      },
    },
    {
      name: 'create_project',
      description: 'Create a new project.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
          slug: { type: 'string', description: 'Uppercase prefix for task numbering (e.g., "TP")' },
          description: { type: 'string', description: 'Project description' },
          links: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                url: { type: 'string' },
                label: { type: 'string' },
              },
            },
            description: 'Links to design, wiki, etc.',
          },
        },
        required: ['name', 'slug'],
      },
    },
    // Workflow tools
    {
      name: 'list_workflows',
      description: 'List all workflows. Workflows combine prompts, templates, and other resources into reusable automation sequences.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of workflows to return (default: 20)' },
          page: { type: 'number', description: 'Page number for pagination (default: 1)' },
          search: { type: 'string', description: 'Search query to filter workflows' },
          category: { type: 'string', description: 'Filter by category' },
          status: {
            type: 'string',
            enum: ['draft', 'active', 'deprecated'],
            description: 'Filter by workflow status',
          },
          includeArchived: { type: 'boolean', description: 'Include archived workflows' },
        },
      },
    },
    {
      name: 'get_workflow',
      description: 'Get detailed information about a workflow, including its resources and execution steps.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the workflow' },
        },
        required: ['id'],
      },
    },
    {
      name: 'create_workflow',
      description: 'Create a new workflow that combines prompts, templates, tasks, and features into an automated sequence.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Workflow title' },
          description: { type: 'string', description: 'Workflow description' },
          customInstructions: { type: 'string', description: 'Custom instructions for AI execution' },
          category: { type: 'string', description: 'Workflow category' },
          isPublic: { type: 'boolean', description: 'Whether workflow is publicly visible' },
          status: {
            type: 'string',
            enum: ['draft', 'active', 'deprecated'],
            description: 'Workflow status (default: draft)',
          },
          tagIds: { type: 'array', items: { type: 'string' }, description: 'Tag IDs to associate' },
          resources: {
            type: 'array',
            description: 'Resources to include in the workflow',
            items: {
              type: 'object',
              properties: {
                resourceType: {
                  type: 'string',
                  enum: ['prompt', 'template', 'task', 'feature', 'project'],
                  description: 'Type of resource',
                },
                resourceId: { type: 'string', description: 'UUID of the resource' },
                alias: { type: 'string', description: 'Alias for referencing in steps' },
                sortOrder: { type: 'number', description: 'Display order' },
              },
              required: ['resourceType', 'resourceId'],
            },
          },
          steps: {
            type: 'array',
            description: 'Execution steps for the workflow',
            items: {
              type: 'object',
              properties: {
                stepNumber: { type: 'number', description: 'Step execution order' },
                title: { type: 'string', description: 'Step title' },
                description: { type: 'string', description: 'Step description' },
                actionType: {
                  type: 'string',
                  enum: ['execute_prompt', 'load_template', 'create_task', 'update_task_status', 'generate_tasks', 'custom'],
                  description: 'Type of action to perform',
                },
                actionConfig: {
                  type: 'object',
                  description: 'Configuration for the action (promptId, templateId, etc.)',
                },
                condition: { type: 'string', description: 'Condition expression for step execution' },
                conditionType: {
                  type: 'string',
                  enum: ['none', 'simple', 'ai'],
                  description: 'Type of condition evaluation',
                },
                timeoutMs: { type: 'number', description: 'Step timeout in milliseconds' },
                onError: {
                  type: 'string',
                  enum: ['fail', 'skip', 'continue'],
                  description: 'Error handling strategy',
                },
              },
              required: ['stepNumber', 'title', 'actionType', 'actionConfig'],
            },
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'update_workflow',
      description: 'Update an existing workflow. Only include fields you want to change.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the workflow to update' },
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New description' },
          customInstructions: { type: 'string', description: 'New custom instructions' },
          category: { type: 'string', description: 'New category' },
          isPublic: { type: 'boolean', description: 'New visibility setting' },
          status: { type: 'string', enum: ['draft', 'active', 'deprecated'] },
          tagIds: { type: 'array', items: { type: 'string' } },
          resources: { type: 'array', description: 'New resources (replaces existing)' },
          steps: { type: 'array', description: 'New steps (replaces existing)' },
        },
        required: ['id'],
      },
    },
    {
      name: 'delete_workflow',
      description: 'Delete a workflow (soft delete - marks as archived).',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the workflow to delete' },
        },
        required: ['id'],
      },
    },
    {
      name: 'validate_workflow',
      description: 'Validate a workflow - checks that all referenced resources exist and steps are properly configured.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the workflow to validate' },
        },
        required: ['id'],
      },
    },
    {
      name: 'get_workflow_executions',
      description: 'Get execution history for a specific workflow.',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: { type: 'string', description: 'The UUID of the workflow' },
          page: { type: 'number', description: 'Page number' },
          limit: { type: 'number', description: 'Items per page' },
        },
        required: ['workflowId'],
      },
    },
    {
      name: 'get_workflow_execution',
      description: 'Get details of a specific workflow execution, including step-by-step results.',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: { type: 'string', description: 'The UUID of the execution' },
        },
        required: ['executionId'],
      },
    },

    // ============ Plugin Marketplace Tools ============
    {
      name: 'search_marketplace_plugins',
      description: 'Search for Claude Code plugins in the ThinkPrompt marketplace. Returns published plugins with install commands.',
      inputSchema: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search query to filter plugins by name, description, or keywords',
          },
          category: {
            type: 'string',
            description: 'Category slug to filter by (e.g., "development", "testing", "productivity")',
          },
          installSource: {
            type: 'string',
            enum: ['npm', 'github', 'url'],
            description: 'Filter by installation source',
          },
          sortBy: {
            type: 'string',
            enum: ['installs', 'rating', 'recent', 'name'],
            description: 'Sort order (default: installs)',
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: 'Sort direction (default: desc)',
          },
          page: {
            type: 'number',
            description: 'Page number (default: 1)',
          },
          limit: {
            type: 'number',
            description: 'Items per page (default: 20)',
          },
        },
      },
    },
    {
      name: 'get_marketplace_plugin',
      description: 'Get detailed information about a plugin including install command and version history.',
      inputSchema: {
        type: 'object',
        properties: {
          nameOrId: {
            type: 'string',
            description: 'Plugin name (e.g., "my-plugin") or UUID',
          },
        },
        required: ['nameOrId'],
      },
    },
    {
      name: 'get_plugin_categories',
      description: 'List all available plugin categories in the marketplace.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_featured_plugins',
      description: 'Get featured/highlighted plugins from the marketplace.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'register_marketplace_plugin',
      description: 'Register a new plugin in the ThinkPrompt marketplace. The plugin will be in draft status until published.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Unique plugin name (lowercase-with-hyphens, e.g., "my-awesome-plugin")',
          },
          displayName: {
            type: 'string',
            description: 'Human-readable display name',
          },
          description: {
            type: 'string',
            description: 'Short description of the plugin',
          },
          longDescription: {
            type: 'string',
            description: 'Detailed description/README in markdown',
          },
          installSource: {
            type: 'string',
            enum: ['npm', 'github', 'url'],
            description: 'Where the plugin can be installed from',
          },
          npmPackage: {
            type: 'string',
            description: 'npm package name (required if installSource is "npm")',
          },
          githubRepo: {
            type: 'string',
            description: 'GitHub repo in "owner/repo" format (required if installSource is "github")',
          },
          installUrl: {
            type: 'string',
            description: 'Direct URL for installation (required if installSource is "url")',
          },
          categoryId: {
            type: 'string',
            description: 'Category UUID',
          },
          homepageUrl: {
            type: 'string',
            description: 'Plugin homepage URL',
          },
          repositoryUrl: {
            type: 'string',
            description: 'Source code repository URL',
          },
          documentationUrl: {
            type: 'string',
            description: 'Documentation URL',
          },
          license: {
            type: 'string',
            description: 'License identifier (e.g., "MIT", "Apache-2.0")',
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Keywords for search',
          },
        },
        required: ['name', 'displayName', 'installSource'],
      },
    },
    {
      name: 'track_plugin_install',
      description: 'Track that a plugin was installed. Used for statistics and popularity tracking.',
      inputSchema: {
        type: 'object',
        properties: {
          nameOrId: {
            type: 'string',
            description: 'Plugin name or UUID',
          },
          version: {
            type: 'string',
            description: 'Version that was installed',
          },
          source: {
            type: 'string',
            description: 'Installation source (e.g., "cli", "manual")',
          },
        },
        required: ['nameOrId'],
      },
    },

    // ============ Document Storage Tools ============
    {
      name: 'list_documents',
      description: 'List documents with optional filters. Documents can be workspace-level or project-level, organized in hierarchical folders.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Filter by project UUID (null for workspace-level documents)',
          },
          folderId: {
            type: 'string',
            description: 'Filter by folder UUID',
          },
          search: {
            type: 'string',
            description: 'Full-text search query on title and content',
          },
          tagIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by tag UUIDs',
          },
          includeArchived: {
            type: 'boolean',
            description: 'Include archived documents (default: false)',
          },
          page: {
            type: 'number',
            description: 'Page number (default: 1)',
          },
          limit: {
            type: 'number',
            description: 'Items per page (default: 20, max: 100)',
          },
          compact: {
            type: 'boolean',
            description: 'Return compact response without content/frontmatter (default: true, reduces payload size significantly)',
          },
        },
      },
    },
    {
      name: 'get_document',
      description: 'Get a document by ID including its content, frontmatter, and metadata.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the document',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'create_document',
      description: 'Create a new markdown document with optional YAML frontmatter.',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Document title (max 500 characters)',
          },
          content: {
            type: 'string',
            description: 'Markdown content of the document',
          },
          frontmatter: {
            type: 'object',
            description: 'YAML frontmatter as a JSON object',
            additionalProperties: true,
          },
          folderId: {
            type: 'string',
            description: 'Folder UUID to place the document in',
          },
          projectId: {
            type: 'string',
            description: 'Project UUID for project-level document (null for workspace-level)',
          },
          tagIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tag UUIDs to assign (max 10)',
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'update_document',
      description: 'Update a document. Creates a new version in the document history.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the document to update',
          },
          title: {
            type: 'string',
            description: 'New document title',
          },
          content: {
            type: 'string',
            description: 'New markdown content',
          },
          frontmatter: {
            type: 'object',
            description: 'New frontmatter as JSON object',
            additionalProperties: true,
          },
          folderId: {
            type: 'string',
            description: 'Move document to a different folder',
          },
          changeSummary: {
            type: 'string',
            description: 'Summary of changes for version history (max 500 characters)',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'delete_document',
      description: 'Archive a document (soft delete). Document can be restored later.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the document to archive',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'search_documents',
      description: 'Full-text search across documents. Returns matching documents with content excerpts.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (minimum 2 characters)',
          },
          projectId: {
            type: 'string',
            description: 'Limit search to specific project',
          },
          folderId: {
            type: 'string',
            description: 'Limit search to specific folder',
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return (default: 20, max: 100)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_document_versions',
      description: 'Get the version history of a document.',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The UUID of the document',
          },
        },
        required: ['documentId'],
      },
    },
    {
      name: 'get_document_version',
      description: 'Get a specific version of a document.',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The UUID of the document',
          },
          version: {
            type: 'number',
            description: 'Version number to retrieve',
          },
        },
        required: ['documentId', 'version'],
      },
    },
    {
      name: 'restore_document_version',
      description: 'Restore a document to a previous version. Creates a new version with the restored content.',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The UUID of the document',
          },
          version: {
            type: 'number',
            description: 'Version number to restore to',
          },
        },
        required: ['documentId', 'version'],
      },
    },
    {
      name: 'add_document_tags',
      description: 'Add tags to a document. Maximum 10 tags per document.',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The UUID of the document',
          },
          tagIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tag UUIDs to add (max 10 total on document)',
          },
        },
        required: ['documentId', 'tagIds'],
      },
    },
    {
      name: 'remove_document_tag',
      description: 'Remove a tag from a document.',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The UUID of the document',
          },
          tagId: {
            type: 'string',
            description: 'The UUID of the tag to remove',
          },
        },
        required: ['documentId', 'tagId'],
      },
    },

    // ============ Document Folder Tools ============
    {
      name: 'list_document_folders',
      description: 'List document folders (flat list). Use get_document_folder_tree for hierarchical view.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Filter by project UUID (null for workspace-level folders)',
          },
          parentId: {
            type: 'string',
            description: 'Filter by parent folder UUID (null for root folders)',
          },
          includeArchived: {
            type: 'boolean',
            description: 'Include archived folders (default: false)',
          },
        },
      },
    },
    {
      name: 'get_document_folder_tree',
      description: 'Get hierarchical folder tree structure with document counts.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Filter by project UUID (null for workspace-level folders)',
          },
        },
      },
    },
    {
      name: 'get_document_folder',
      description: 'Get a document folder by ID with its document count.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the folder',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'create_document_folder',
      description: 'Create a new document folder. Folders can be nested within other folders.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Folder name (max 255 characters)',
          },
          parentId: {
            type: 'string',
            description: 'Parent folder UUID for nested folders',
          },
          projectId: {
            type: 'string',
            description: 'Project UUID for project-level folder (null for workspace-level)',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'update_document_folder',
      description: 'Update a document folder (rename or move to different parent).',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the folder to update',
          },
          name: {
            type: 'string',
            description: 'New folder name',
          },
          parentId: {
            type: 'string',
            description: 'New parent folder UUID (use null for root)',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'delete_document_folder',
      description: 'Delete a document folder. Child folders are moved to the parent, and documents have their folder reference cleared.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the folder to delete',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'reorder_document_folders',
      description: 'Reorder document folders by setting their sort order.',
      inputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Array of folder IDs with their new sort orders',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Folder UUID' },
                sortOrder: { type: 'number', description: 'New sort order (0-based)' },
              },
              required: ['id', 'sortOrder'],
            },
          },
        },
        required: ['items'],
      },
    },

    // ============ Requirement Tools ============
    {
      name: 'list_requirements',
      description: 'List requirements with optional filters. Returns requirements with their status, quality scores, and counts of sub-entities. Use compact=true (default) for reduced payload.',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['draft', 'in_discovery', 'structured', 'quality_check', 'in_review', 'approved', 'exported'],
            description: 'Filter by requirement status',
          },
          featureId: {
            type: 'string',
            description: 'Filter by feature UUID',
          },
          tagId: {
            type: 'string',
            description: 'Filter by tag UUID',
          },
          assigneeId: {
            type: 'string',
            description: 'Filter by assignee user UUID',
          },
          search: {
            type: 'string',
            description: 'Search by title or displayId',
          },
          includeArchived: {
            type: 'boolean',
            description: 'Include archived requirements (default: false)',
          },
          sortBy: {
            type: 'string',
            enum: ['created_at', 'updated_at', 'display_id', 'quality_score'],
            description: 'Sort field',
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: 'Sort direction',
          },
          compact: {
            type: 'boolean',
            description: 'Return compact response without description, scope, and quality issue details (default: true, reduces payload significantly)',
          },
        },
      },
    },
    {
      name: 'get_requirement',
      description: 'Get a single requirement by ID with full details including description, scope, quality score, tags, and assignees.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'create_requirement',
      description: 'Create a new requirement. Only title is required; description, scope, featureId, status, tags, and assignees are optional.',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Requirement title',
          },
          description: {
            type: 'object',
            description: 'Structured description with overview, background, userStory, businessValue, affectedRoles, successCriteria',
            properties: {
              overview: { type: 'string' },
              background: { type: 'string' },
              userStory: { type: 'string' },
              businessValue: { type: 'string' },
              affectedRoles: { type: 'array', items: { type: 'string' } },
              successCriteria: { type: 'array', items: { type: 'string' } },
            },
          },
          scope: {
            type: 'object',
            description: 'Scope definition with inScope, outOfScope, assumptions, constraints',
            properties: {
              inScope: { type: 'array', items: { type: 'string' } },
              outOfScope: { type: 'array', items: { type: 'string' } },
              assumptions: { type: 'array', items: { type: 'string' } },
              constraints: { type: 'array', items: { type: 'string' } },
            },
          },
          featureId: {
            type: 'string',
            description: 'Link to a feature UUID',
          },
          status: {
            type: 'string',
            enum: ['draft', 'in_discovery', 'structured', 'quality_check', 'in_review', 'approved', 'exported'],
            description: 'Initial status (default: draft)',
          },
          tagIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tag UUIDs to attach (max 10)',
          },
          assigneeIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'User UUIDs to assign',
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'update_requirement',
      description: 'Update an existing requirement. All fields are optional.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the requirement to update',
          },
          title: { type: 'string', description: 'New title' },
          description: {
            type: 'object',
            description: 'Partial description update',
            properties: {
              overview: { type: 'string' },
              background: { type: 'string' },
              userStory: { type: 'string' },
              businessValue: { type: 'string' },
              affectedRoles: { type: 'array', items: { type: 'string' } },
              successCriteria: { type: 'array', items: { type: 'string' } },
            },
          },
          scope: {
            type: 'object',
            description: 'Partial scope update',
            properties: {
              inScope: { type: 'array', items: { type: 'string' } },
              outOfScope: { type: 'array', items: { type: 'string' } },
              assumptions: { type: 'array', items: { type: 'string' } },
              constraints: { type: 'array', items: { type: 'string' } },
            },
          },
          featureId: { type: 'string', description: 'Feature UUID (null to unlink)' },
          tagIds: { type: 'array', items: { type: 'string' }, description: 'Replace all tags' },
          assigneeIds: { type: 'array', items: { type: 'string' }, description: 'Replace all assignees' },
        },
        required: ['id'],
      },
    },
    {
      name: 'update_requirement_status',
      description: 'Update only the status of a requirement. Follows the workflow: draft → in_discovery → structured → quality_check → in_review → approved → exported.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          status: {
            type: 'string',
            enum: ['draft', 'in_discovery', 'structured', 'quality_check', 'in_review', 'approved', 'exported'],
            description: 'New status',
          },
        },
        required: ['id', 'status'],
      },
    },
    {
      name: 'delete_requirement',
      description: 'Archive (soft-delete) a requirement.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the requirement to archive',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'search_requirements',
      description: 'Full-text search requirements by title or displayId.',
      inputSchema: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description: 'Search query string',
          },
          includeArchived: {
            type: 'boolean',
            description: 'Include archived requirements',
          },
        },
        required: ['q'],
      },
    },

    // ============ Acceptance Criteria Tools ============
    {
      name: 'list_acceptance_criteria',
      description: 'List acceptance criteria for a requirement. Returns BDD-style scenarios. Use compact=true (default) for reduced payload.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          compact: {
            type: 'boolean',
            description: 'Return compact response without givenContext/whenAction/thenOutcome (default: true)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of items to return (default: 50)',
          },
        },
        required: ['requirementId'],
      },
    },
    {
      name: 'create_acceptance_criterion',
      description: 'Create a BDD-style acceptance criterion (given/when/then) for a requirement.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          scenarioName: {
            type: 'string',
            description: 'Name of the scenario',
          },
          givenContext: {
            type: 'string',
            description: 'Given: the precondition or context',
          },
          whenAction: {
            type: 'string',
            description: 'When: the action or event',
          },
          thenOutcome: {
            type: 'string',
            description: 'Then: the expected outcome',
          },
          type: {
            type: 'string',
            enum: ['positive', 'negative', 'edge_case'],
            description: 'Type of test case (default: positive)',
          },
          sortOrder: {
            type: 'number',
            description: 'Sort order for display',
          },
        },
        required: ['requirementId', 'scenarioName', 'givenContext', 'whenAction', 'thenOutcome'],
      },
    },
    {
      name: 'update_acceptance_criterion',
      description: 'Update an existing acceptance criterion.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the acceptance criterion',
          },
          scenarioName: { type: 'string' },
          givenContext: { type: 'string' },
          whenAction: { type: 'string' },
          thenOutcome: { type: 'string' },
          type: { type: 'string', enum: ['positive', 'negative', 'edge_case'] },
          sortOrder: { type: 'number' },
        },
        required: ['id'],
      },
    },
    {
      name: 'delete_acceptance_criterion',
      description: 'Delete an acceptance criterion.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the acceptance criterion to delete',
          },
        },
        required: ['id'],
      },
    },

    // ============ Precondition Tools ============
    {
      name: 'list_preconditions',
      description: 'List preconditions for a requirement. Use compact=true (default) for reduced payload.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          compact: {
            type: 'boolean',
            description: 'Return compact response without description (default: true)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of items to return (default: 50)',
          },
        },
        required: ['requirementId'],
      },
    },
    {
      name: 'create_precondition',
      description: 'Create a precondition for a requirement.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          category: {
            type: 'string',
            enum: ['technical_deps', 'data_requirements', 'env_config', 'architecture'],
            description: 'Precondition category',
          },
          title: {
            type: 'string',
            description: 'Precondition title',
          },
          description: {
            type: 'string',
            description: 'Detailed description',
          },
          sortOrder: {
            type: 'number',
            description: 'Sort order for display',
          },
        },
        required: ['requirementId', 'category', 'title'],
      },
    },
    {
      name: 'update_precondition',
      description: 'Update an existing precondition.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the precondition',
          },
          category: { type: 'string', enum: ['technical_deps', 'data_requirements', 'env_config', 'architecture'] },
          title: { type: 'string' },
          description: { type: 'string' },
          isMet: { type: 'boolean', description: 'Whether the precondition is met' },
          sortOrder: { type: 'number' },
        },
        required: ['id'],
      },
    },
    {
      name: 'delete_precondition',
      description: 'Delete a precondition.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the precondition to delete',
          },
        },
        required: ['id'],
      },
    },

    // ============ Verification Test Tools ============
    {
      name: 'list_verification_tests',
      description: 'List verification tests for a requirement. Use compact=true (default) for reduced payload.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          compact: {
            type: 'boolean',
            description: 'Return compact response without description/steps/expectedResult/automationHint (default: true)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of items to return (default: 50)',
          },
        },
        required: ['requirementId'],
      },
    },
    {
      name: 'create_verification_test',
      description: 'Create a verification test for a requirement with test steps and expected results.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          testName: {
            type: 'string',
            description: 'Name of the test',
          },
          testType: {
            type: 'string',
            enum: ['unit', 'integration', 'e2e', 'manual', 'performance'],
            description: 'Type of verification test',
          },
          description: {
            type: 'string',
            description: 'Test description',
          },
          steps: {
            type: 'array',
            description: 'Test steps',
            items: {
              type: 'object',
              properties: {
                step: { type: 'number', description: 'Step number' },
                action: { type: 'string', description: 'Action to perform' },
                expected: { type: 'string', description: 'Expected result for this step' },
              },
              required: ['step', 'action', 'expected'],
            },
          },
          expectedResult: {
            type: 'string',
            description: 'Overall expected result',
          },
          automationHint: {
            type: 'string',
            description: 'Hint for test automation (e.g., Cypress selector, API endpoint)',
          },
          sortOrder: {
            type: 'number',
            description: 'Sort order for display',
          },
        },
        required: ['requirementId', 'testName', 'testType'],
      },
    },
    {
      name: 'update_verification_test',
      description: 'Update an existing verification test.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the verification test',
          },
          testName: { type: 'string' },
          testType: { type: 'string', enum: ['unit', 'integration', 'e2e', 'manual', 'performance'] },
          description: { type: 'string' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                step: { type: 'number' },
                action: { type: 'string' },
                expected: { type: 'string' },
              },
              required: ['step', 'action', 'expected'],
            },
          },
          expectedResult: { type: 'string' },
          automationHint: { type: 'string' },
          sortOrder: { type: 'number' },
        },
        required: ['id'],
      },
    },
    {
      name: 'delete_verification_test',
      description: 'Delete a verification test.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the verification test to delete',
          },
        },
        required: ['id'],
      },
    },

    // ============ Requirement Link Tools ============
    {
      name: 'list_requirement_links',
      description: 'List links (dependencies, relations) for a requirement.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of items to return (default: 50)',
          },
        },
        required: ['requirementId'],
      },
    },
    {
      name: 'create_requirement_link',
      description: 'Create a dependency or relation link between two requirements.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The source requirement UUID',
          },
          targetRequirementId: {
            type: 'string',
            description: 'The target requirement UUID',
          },
          linkType: {
            type: 'string',
            enum: ['depends_on', 'blocks', 'related', 'parent', 'child'],
            description: 'Type of link',
          },
          description: {
            type: 'string',
            description: 'Optional description of the relationship',
          },
        },
        required: ['requirementId', 'targetRequirementId', 'linkType'],
      },
    },
    {
      name: 'delete_requirement_link',
      description: 'Delete a requirement link.',
      inputSchema: {
        type: 'object',
        properties: {
          linkId: {
            type: 'string',
            description: 'The UUID of the link to delete',
          },
        },
        required: ['linkId'],
      },
    },

    // ============ Requirement Comment Tools ============
    {
      name: 'list_requirement_comments',
      description: 'List threaded comments on a requirement. Use compact=true (default) for reduced payload.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          compact: {
            type: 'boolean',
            description: 'Return compact response without content/replies/inlinePosition/mentionedUsers (default: true)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of items to return (default: 50)',
          },
        },
        required: ['requirementId'],
      },
    },
    {
      name: 'create_requirement_comment',
      description: 'Add a comment to a requirement. Supports threading via parentCommentId and targeting specific sections/elements.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          content: {
            type: 'string',
            description: 'Comment content (markdown supported)',
          },
          parentCommentId: {
            type: 'string',
            description: 'Parent comment UUID for threaded replies',
          },
          commentLevel: {
            type: 'string',
            enum: ['requirement', 'section', 'element', 'inline'],
            description: 'Level of the comment (default: requirement)',
          },
          sectionKey: {
            type: 'string',
            description: 'Section key for section-level comments',
          },
          elementId: {
            type: 'string',
            description: 'Element UUID for element-level comments',
          },
          mentionedUsers: {
            type: 'array',
            items: { type: 'string' },
            description: 'User UUIDs to mention',
          },
        },
        required: ['requirementId', 'content', 'commentLevel'],
      },
    },
    {
      name: 'update_requirement_comment',
      description: 'Update a requirement comment (content or status).',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the comment',
          },
          content: {
            type: 'string',
            description: 'New comment content',
          },
          status: {
            type: 'string',
            enum: ['open', 'resolved', 'wont_fix'],
            description: 'New comment status',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'delete_requirement_comment',
      description: 'Delete a requirement comment.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the comment to delete',
          },
        },
        required: ['id'],
      },
    },

    // ============ Requirement Tag Tools ============
    {
      name: 'add_requirement_tags',
      description: 'Add tags to a requirement (max 10 total).',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          tagIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tag UUIDs to add',
          },
        },
        required: ['requirementId', 'tagIds'],
      },
    },
    {
      name: 'remove_requirement_tag',
      description: 'Remove a tag from a requirement.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          tagId: {
            type: 'string',
            description: 'The UUID of the tag to remove',
          },
        },
        required: ['requirementId', 'tagId'],
      },
    },
    {
      name: 'get_requirement_tags',
      description: 'Get all tags for a requirement.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
        },
        required: ['requirementId'],
      },
    },

    // ============ Requirement Quality Tools ============
    {
      name: 'calculate_requirement_quality',
      description: 'Calculate the quality score for a requirement. Evaluates completeness, clarity, testability, atomicity, traceability, and collaboration.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
        },
        required: ['requirementId'],
      },
    },
    {
      name: 'get_requirement_quality',
      description: 'Get the cached quality score for a requirement without recalculating.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
        },
        required: ['requirementId'],
      },
    },

    // ============ Requirement Activity Tools ============
    {
      name: 'get_requirement_activity',
      description: 'Get the activity log (history) for a requirement.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: {
            type: 'string',
            description: 'The UUID of the requirement',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of activity items to return (default: 50)',
          },
        },
        required: ['requirementId'],
      },
    },
  ],
}));

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_prompts': {
        const params = args as {
          limit?: number;
          page?: number;
          search?: string;
          tags?: string[];
        };
        const result = await apiClient.listPrompts(params);
        return jsonResponse(result);
      }

      case 'get_prompt': {
        const { id } = args as { id: string };
        const result = await apiClient.getPrompt(id);
        return jsonResponse(result);
      }

      case 'get_prompt_variables': {
        const { id } = args as { id: string };
        const result = await apiClient.getPromptVariables(id);
        return jsonResponse(result);
      }

      case 'create_prompt': {
        const { title, content, description, variables, isPublic } = args as {
          title: string;
          content: string;
          description?: string;
          variables?: Array<{
            name: string;
            type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'boolean';
            label?: string;
            description?: string;
            required?: boolean;
            defaultValue?: string | number | boolean;
            options?: string[];
          }>;
          isPublic?: boolean;
        };
        const result = await apiClient.createPrompt({
          title,
          content,
          description,
          variables,
          isPublic,
        });
        return jsonResponse(result);
      }

      case 'update_prompt': {
        const { id, title, content, description, variables, isPublic } = args as {
          id: string;
          title?: string;
          content?: string;
          description?: string;
          variables?: Array<{
            name: string;
            type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'boolean';
            label?: string;
            description?: string;
            required?: boolean;
            defaultValue?: string | number | boolean;
            options?: string[];
          }>;
          isPublic?: boolean;
        };
        const result = await apiClient.updatePrompt(id, {
          title,
          content,
          description,
          variables,
          isPublic,
        });
        return jsonResponse(result);
      }

      // Workspace tool handlers
      case 'list_workspaces': {
        const workspaces = await apiClient.listWorkspaces();
        const currentId = apiClient.getCurrentWorkspaceId();
        return jsonResponse({ currentWorkspaceId: currentId, workspaces });
      }

      case 'get_current_workspace': {
        const workspace = await apiClient.getCurrentWorkspace();
        if (!workspace) {
          return jsonResponse({ message: 'No workspace selected or available' });
        }
        return jsonResponse(workspace);
      }

      case 'switch_workspace': {
        const { workspaceId } = args as { workspaceId: string };
        const result = await apiClient.switchWorkspace(workspaceId);
        return jsonResponse(result);
      }

      // Tag handlers
      case 'list_tags': {
        const result = await apiClient.listTags();
        return jsonResponse(result);
      }

      case 'get_tag': {
        const { id } = args as { id: string };
        const result = await apiClient.getTag(id);
        return jsonResponse(result);
      }

      case 'create_tag': {
        const { name, color } = args as { name: string; color?: string };
        const result = await apiClient.createTag({ name, color });
        return jsonResponse(result);
      }

      case 'update_tag': {
        const { id, name, color } = args as { id: string; name?: string; color?: string };
        const result = await apiClient.updateTag(id, { name, color });
        return jsonResponse(result);
      }

      case 'delete_tag': {
        const { id } = args as { id: string };
        await apiClient.deleteTag(id);
        return successResponse('Tag deleted successfully');
      }

      // Project Management handlers
      case 'list_projects': {
        const { includeArchived } = args as { includeArchived?: boolean };
        const result = await apiClient.listProjects({ includeArchived });
        return jsonResponse(result);
      }

      case 'get_project': {
        const { id } = args as { id: string };
        const result = await apiClient.getProject(id);
        return jsonResponse(result);
      }

      case 'get_project_statistics': {
        const { projectId } = args as { projectId: string };
        const result = await apiClient.getProjectStatistics(projectId);
        return jsonResponse(result);
      }

      case 'create_project': {
        const { name, slug, description, links } = args as {
          name: string;
          slug: string;
          description?: string;
          links?: Array<{ type: string; url: string; label?: string }>;
        };
        const result = await apiClient.createProject({ name, slug, description, links });
        return jsonResponse(result);
      }

      // Template handlers
      case 'list_templates': {
        const params = args as {
          limit?: number;
          page?: number;
          search?: string;
          type?: 'example' | 'style';
          category?: string;
          language?: string;
          tags?: string[];
        };
        const result = await apiClient.listTemplates(params);
        return jsonResponse(result);
      }

      case 'get_template': {
        const { id } = args as { id: string };
        const result = await apiClient.getTemplate(id);
        return jsonResponse(result);
      }

      case 'create_template': {
        const {
          title,
          content,
          type,
          description,
          category,
          language,
          useCaseHints,
          isPublic,
          tagIds,
        } = args as {
          title: string;
          content: string;
          type: 'example' | 'style';
          description?: string;
          category?: string;
          language?: string;
          useCaseHints?: string[];
          isPublic?: boolean;
          tagIds?: string[];
        };
        const result = await apiClient.createTemplate({
          title,
          content,
          type,
          description,
          category,
          language,
          useCaseHints,
          isPublic,
          tagIds,
        });
        return jsonResponse(result);
      }

      case 'update_template': {
        const { id, ...updateData } = args as {
          id: string;
          title?: string;
          content?: string;
          type?: 'example' | 'style';
          description?: string;
          category?: string;
          language?: string;
          useCaseHints?: string[];
          isPublic?: boolean;
          tagIds?: string[];
        };
        const result = await apiClient.updateTemplate(id, updateData);
        return jsonResponse(result);
      }

      // Workflow handlers
      case 'list_workflows': {
        const params = args as {
          limit?: number;
          page?: number;
          search?: string;
          category?: string;
          status?: 'draft' | 'active' | 'deprecated';
          includeArchived?: boolean;
        };
        const result = await apiClient.listWorkflows(params);
        return jsonResponse(result);
      }

      case 'get_workflow': {
        const { id } = args as { id: string };
        const result = await apiClient.getWorkflow(id);
        return jsonResponse(result);
      }

      case 'create_workflow': {
        const input = args as {
          title: string;
          description?: string;
          customInstructions?: string;
          category?: string;
          isPublic?: boolean;
          status?: 'draft' | 'active' | 'deprecated';
          tagIds?: string[];
          resources?: Array<{
            resourceType: 'prompt' | 'template' | 'task' | 'feature' | 'project';
            resourceId: string;
            alias?: string;
            sortOrder?: number;
          }>;
          steps?: Array<{
            stepNumber: number;
            title: string;
            description?: string;
            actionType: 'execute_prompt' | 'load_template' | 'create_task' | 'update_task_status' | 'generate_tasks' | 'custom';
            actionConfig: Record<string, unknown>;
            condition?: string;
            conditionType?: 'none' | 'simple' | 'ai';
            timeoutMs?: number;
            onError?: 'fail' | 'skip' | 'continue';
          }>;
        };
        const result = await apiClient.createWorkflow(input);
        return jsonResponse(result);
      }

      case 'update_workflow': {
        const { id, ...updateData } = args as {
          id: string;
          title?: string;
          description?: string;
          customInstructions?: string;
          category?: string;
          isPublic?: boolean;
          status?: 'draft' | 'active' | 'deprecated';
          tagIds?: string[];
          resources?: Array<{
            resourceType: 'prompt' | 'template' | 'task' | 'feature' | 'project';
            resourceId: string;
            alias?: string;
            sortOrder?: number;
          }>;
          steps?: Array<{
            stepNumber: number;
            title: string;
            description?: string;
            actionType: 'execute_prompt' | 'load_template' | 'create_task' | 'update_task_status' | 'generate_tasks' | 'custom';
            actionConfig: Record<string, unknown>;
            condition?: string;
            conditionType?: 'none' | 'simple' | 'ai';
            timeoutMs?: number;
            onError?: 'fail' | 'skip' | 'continue';
          }>;
        };
        const result = await apiClient.updateWorkflow(id, updateData);
        return jsonResponse(result);
      }

      case 'delete_workflow': {
        const { id } = args as { id: string };
        await apiClient.deleteWorkflow(id);
        return successResponse('Workflow deleted');
      }

      case 'validate_workflow': {
        const { id } = args as { id: string };
        const result = await apiClient.validateWorkflow(id);
        return jsonResponse(result);
      }

      case 'get_workflow_executions': {
        const { workflowId, page, limit } = args as {
          workflowId: string;
          page?: number;
          limit?: number;
        };
        const result = await apiClient.getWorkflowExecutions(workflowId, { page, limit });
        return jsonResponse(result);
      }

      case 'get_workflow_execution': {
        const { executionId } = args as { executionId: string };
        const result = await apiClient.getWorkflowExecution(executionId);
        return jsonResponse(result);
      }

      // ============ Plugin Marketplace Handlers ============

      case 'search_marketplace_plugins': {
        const params = args as {
          search?: string;
          category?: string;
          installSource?: 'npm' | 'github' | 'url';
          sortBy?: 'installs' | 'rating' | 'recent' | 'name';
          sortOrder?: 'asc' | 'desc';
          page?: number;
          limit?: number;
        };
        const result = await apiClient.searchMarketplacePlugins(params);
        return jsonResponse(result);
      }

      case 'get_marketplace_plugin': {
        const { nameOrId } = args as { nameOrId: string };
        const result = await apiClient.getMarketplacePlugin(nameOrId);
        return jsonResponse(result);
      }

      case 'get_plugin_categories': {
        const result = await apiClient.getPluginCategories();
        return jsonResponse(result);
      }

      case 'get_featured_plugins': {
        const result = await apiClient.getFeaturedPlugins();
        return jsonResponse(result);
      }

      case 'register_marketplace_plugin': {
        const input = args as {
          name: string;
          displayName: string;
          description?: string;
          longDescription?: string;
          installSource: 'npm' | 'github' | 'url';
          npmPackage?: string;
          githubRepo?: string;
          installUrl?: string;
          categoryId?: string;
          homepageUrl?: string;
          repositoryUrl?: string;
          documentationUrl?: string;
          license?: string;
          keywords?: string[];
        };
        const result = await apiClient.registerMarketplacePlugin(input);
        return jsonResponse(result);
      }

      case 'track_plugin_install': {
        const { nameOrId, version, source } = args as {
          nameOrId: string;
          version?: string;
          source?: string;
        };
        const result = await apiClient.trackPluginInstall(nameOrId, { version, source });
        return jsonResponse(result);
      }

      // ============ Document Tool Handlers ============
      case 'list_documents': {
        const { compact = true, ...params } = args as {
          projectId?: string;
          folderId?: string;
          search?: string;
          tagIds?: string[];
          includeArchived?: boolean;
          page?: number;
          limit?: number;
          compact?: boolean;
        };
        const result = await apiClient.listDocuments(params);

        // Handle nested response: { data: [...], meta: {...} } or { success, data: { data: [...], meta: {...} } }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseData = (result as any)?.data;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const documents = Array.isArray(responseData) ? responseData : (responseData as any)?.data ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meta = Array.isArray(responseData) ? (result as any)?.meta : (responseData as any)?.meta;

        // In compact mode, strip content and frontmatter to reduce payload size
        if (compact && documents.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const compactData = documents.map((doc: any) => {
            const { content, frontmatter, ...rest } = doc;
            return rest;
          });
          return jsonResponse({ data: compactData, meta });
        }

        return jsonResponse({ data: documents, meta });
      }

      case 'get_document': {
        const { id } = args as { id: string };
        const result = await apiClient.getDocument(id);
        return jsonResponse(result);
      }

      case 'create_document': {
        const { title, content, frontmatter, folderId, projectId, tagIds } = args as {
          title: string;
          content?: string;
          frontmatter?: Record<string, unknown>;
          folderId?: string;
          projectId?: string;
          tagIds?: string[];
        };
        const result = await apiClient.createDocument({
          title,
          content,
          frontmatter,
          folderId,
          projectId,
          tagIds,
        });
        return jsonResponse(result);
      }

      case 'update_document': {
        const { id, title, content, frontmatter, folderId, changeSummary } = args as {
          id: string;
          title?: string;
          content?: string;
          frontmatter?: Record<string, unknown>;
          folderId?: string;
          changeSummary?: string;
        };
        const result = await apiClient.updateDocument(id, {
          title,
          content,
          frontmatter,
          folderId,
          changeSummary,
        });
        return jsonResponse(result);
      }

      case 'delete_document': {
        const { id } = args as { id: string };
        await apiClient.deleteDocument(id);
        return successResponse('Document deleted (archived) successfully');
      }

      case 'search_documents': {
        const { query, projectId, folderId, limit } = args as {
          query: string;
          projectId?: string;
          folderId?: string;
          limit?: number;
        };
        const result = await apiClient.searchDocuments({ query, projectId, folderId, limit });
        return jsonResponse(result);
      }

      case 'get_document_versions': {
        const { documentId } = args as { documentId: string };
        const result = await apiClient.getDocumentVersions(documentId);
        return jsonResponse(result);
      }

      case 'get_document_version': {
        const { documentId, version } = args as { documentId: string; version: number };
        const result = await apiClient.getDocumentVersion(documentId, version);
        return jsonResponse(result);
      }

      case 'restore_document_version': {
        const { documentId, version } = args as { documentId: string; version: number };
        const result = await apiClient.restoreDocumentVersion(documentId, version);
        return jsonResponse(result);
      }

      case 'add_document_tags': {
        const { documentId, tagIds } = args as { documentId: string; tagIds: string[] };
        await apiClient.addDocumentTags(documentId, tagIds);
        return successResponse('Tags added successfully');
      }

      case 'remove_document_tag': {
        const { documentId, tagId } = args as { documentId: string; tagId: string };
        await apiClient.removeDocumentTag(documentId, tagId);
        return successResponse('Tag removed successfully');
      }

      // ============ Document Folder Tool Handlers ============
      case 'list_document_folders': {
        const params = args as {
          projectId?: string;
          parentId?: string;
          includeArchived?: boolean;
        };
        const result = await apiClient.listDocumentFolders(params);
        return jsonResponse(result);
      }

      case 'get_document_folder_tree': {
        const params = args as {
          projectId?: string;
          includeArchived?: boolean;
        };
        const result = await apiClient.getDocumentFolderTree(params);
        return jsonResponse(result);
      }

      case 'get_document_folder': {
        const { id } = args as { id: string };
        const result = await apiClient.getDocumentFolder(id);
        return jsonResponse(result);
      }

      case 'create_document_folder': {
        const { name, parentId, projectId } = args as {
          name: string;
          parentId?: string;
          projectId?: string;
        };
        const result = await apiClient.createDocumentFolder({ name, parentId, projectId });
        return jsonResponse(result);
      }

      case 'update_document_folder': {
        const { id, name, parentId } = args as {
          id: string;
          name?: string;
          parentId?: string;
        };
        const result = await apiClient.updateDocumentFolder(id, { name, parentId });
        return jsonResponse(result);
      }

      case 'delete_document_folder': {
        const { id } = args as { id: string };
        await apiClient.deleteDocumentFolder(id);
        return successResponse('Folder deleted successfully');
      }

      case 'reorder_document_folders': {
        const { items } = args as {
          items: Array<{ id: string; sortOrder: number }>;
        };
        await apiClient.reorderDocumentFolders({ items });
        return successResponse('Folders reordered successfully');
      }

      // ============ Requirement Tool Handlers ============

      case 'list_requirements': {
        const { compact = true, ...params } = args as {
          status?: string;
          featureId?: string;
          tagId?: string;
          assigneeId?: string;
          search?: string;
          includeArchived?: boolean;
          sortBy?: 'created_at' | 'updated_at' | 'display_id' | 'quality_score';
          sortOrder?: 'asc' | 'desc';
          compact?: boolean;
        };
        const rawResult = await apiClient.listRequirements(params as ListRequirementsQuery);
        if (compact) {
          const items = extractArray<Requirement>(rawResult);
          return jsonResponse(items.map(compactRequirement));
        }
        return jsonResponse(rawResult);
      }

      case 'get_requirement': {
        const { id } = args as { id: string };
        const result = await apiClient.getRequirement(id);
        return jsonResponse(result);
      }

      case 'create_requirement': {
        const input = args as {
          title: string;
          description?: Record<string, unknown>;
          scope?: Record<string, unknown>;
          featureId?: string;
          status?: string;
          tagIds?: string[];
          assigneeIds?: string[];
        };
        const result = await apiClient.createRequirement(input as CreateRequirementInput);
        return jsonResponse(result);
      }

      case 'update_requirement': {
        const { id, ...updateData } = args as {
          id: string;
          title?: string;
          description?: Record<string, unknown>;
          scope?: Record<string, unknown>;
          featureId?: string;
          tagIds?: string[];
          assigneeIds?: string[];
        };
        const result = await apiClient.updateRequirement(id, updateData as UpdateRequirementInput);
        return jsonResponse(result);
      }

      case 'update_requirement_status': {
        const { id, status } = args as {
          id: string;
          status: 'draft' | 'in_discovery' | 'structured' | 'quality_check' | 'in_review' | 'approved' | 'exported';
        };
        const result = await apiClient.updateRequirementStatus(id, status);
        return jsonResponse(result);
      }

      case 'delete_requirement': {
        const { id } = args as { id: string };
        await apiClient.deleteRequirement(id);
        return successResponse('Requirement archived successfully');
      }

      case 'search_requirements': {
        const { q, includeArchived } = args as { q: string; includeArchived?: boolean };
        const rawResult = await apiClient.searchRequirements({ q, includeArchived });
        const items = extractArray<Requirement>(rawResult);
        return jsonResponse(items.map(compactRequirement));
      }

      // ============ Acceptance Criteria Handlers ============

      case 'list_acceptance_criteria': {
        const { requirementId, compact = true, limit = 50 } = args as {
          requirementId: string;
          compact?: boolean;
          limit?: number;
        };
        const rawResult = await apiClient.listAcceptanceCriteria(requirementId);
        let items = extractArray<AcceptanceCriterion>(rawResult);
        if (items.length > limit) items = items.slice(0, limit);
        if (compact) {
          return jsonResponse(items.map(compactAcceptanceCriterion));
        }
        return jsonResponse(items);
      }

      case 'create_acceptance_criterion': {
        const { requirementId, scenarioName, givenContext, whenAction, thenOutcome, type, sortOrder } = args as {
          requirementId: string;
          scenarioName: string;
          givenContext: string;
          whenAction: string;
          thenOutcome: string;
          type?: 'positive' | 'negative' | 'edge_case';
          sortOrder?: number;
        };
        const result = await apiClient.createAcceptanceCriterion(requirementId, {
          scenarioName,
          givenContext,
          whenAction,
          thenOutcome,
          type,
          sortOrder,
        });
        return jsonResponse(result);
      }

      case 'update_acceptance_criterion': {
        const { id, ...updateData } = args as {
          id: string;
          scenarioName?: string;
          givenContext?: string;
          whenAction?: string;
          thenOutcome?: string;
          type?: 'positive' | 'negative' | 'edge_case';
          sortOrder?: number;
        };
        const result = await apiClient.updateAcceptanceCriterion(id, updateData);
        return jsonResponse(result);
      }

      case 'delete_acceptance_criterion': {
        const { id } = args as { id: string };
        await apiClient.deleteAcceptanceCriterion(id);
        return successResponse('Acceptance criterion deleted successfully');
      }

      // ============ Precondition Handlers ============

      case 'list_preconditions': {
        const { requirementId, compact = true, limit = 50 } = args as {
          requirementId: string;
          compact?: boolean;
          limit?: number;
        };
        const raw = await apiClient.listPreconditions(requirementId);
        let items = extractArray<Precondition>(raw);
        if (items.length > limit) items = items.slice(0, limit);
        if (compact) {
          return jsonResponse(items.map(compactPrecondition));
        }
        return jsonResponse(items);
      }

      case 'create_precondition': {
        const { requirementId, category, title, description, sortOrder } = args as {
          requirementId: string;
          category: 'technical_deps' | 'data_requirements' | 'env_config' | 'architecture';
          title: string;
          description?: string;
          sortOrder?: number;
        };
        const result = await apiClient.createPrecondition(requirementId, {
          category,
          title,
          description,
          sortOrder,
        });
        return jsonResponse(result);
      }

      case 'update_precondition': {
        const { id, ...updateData } = args as {
          id: string;
          category?: 'technical_deps' | 'data_requirements' | 'env_config' | 'architecture';
          title?: string;
          description?: string;
          isMet?: boolean;
          sortOrder?: number;
        };
        const result = await apiClient.updatePrecondition(id, updateData);
        return jsonResponse(result);
      }

      case 'delete_precondition': {
        const { id } = args as { id: string };
        await apiClient.deletePrecondition(id);
        return successResponse('Precondition deleted successfully');
      }

      // ============ Verification Test Handlers ============

      case 'list_verification_tests': {
        const { requirementId, compact = true, limit = 50 } = args as {
          requirementId: string;
          compact?: boolean;
          limit?: number;
        };
        const raw = await apiClient.listVerificationTests(requirementId);
        let items = extractArray<VerificationTest>(raw);
        if (items.length > limit) items = items.slice(0, limit);
        if (compact) {
          return jsonResponse(items.map(compactVerificationTest));
        }
        return jsonResponse(items);
      }

      case 'create_verification_test': {
        const { requirementId, testName, testType, description, steps, expectedResult, automationHint, sortOrder } = args as {
          requirementId: string;
          testName: string;
          testType: 'unit' | 'integration' | 'e2e' | 'manual' | 'performance';
          description?: string;
          steps?: Array<{ step: number; action: string; expected: string }>;
          expectedResult?: string;
          automationHint?: string;
          sortOrder?: number;
        };
        const result = await apiClient.createVerificationTest(requirementId, {
          testName,
          testType,
          description,
          steps,
          expectedResult,
          automationHint,
          sortOrder,
        });
        return jsonResponse(result);
      }

      case 'update_verification_test': {
        const { id, ...updateData } = args as {
          id: string;
          testName?: string;
          testType?: 'unit' | 'integration' | 'e2e' | 'manual' | 'performance';
          description?: string;
          steps?: Array<{ step: number; action: string; expected: string }>;
          expectedResult?: string;
          automationHint?: string;
          sortOrder?: number;
        };
        const result = await apiClient.updateVerificationTest(id, updateData);
        return jsonResponse(result);
      }

      case 'delete_verification_test': {
        const { id } = args as { id: string };
        await apiClient.deleteVerificationTest(id);
        return successResponse('Verification test deleted successfully');
      }

      // ============ Requirement Link Handlers ============

      case 'list_requirement_links': {
        const { requirementId, limit = 50 } = args as { requirementId: string; limit?: number };
        const raw = await apiClient.listRequirementLinks(requirementId);
        let items = extractArray(raw);
        if (items.length > limit) items = items.slice(0, limit);
        return jsonResponse(items);
      }

      case 'create_requirement_link': {
        const { requirementId, targetRequirementId, linkType, description } = args as {
          requirementId: string;
          targetRequirementId: string;
          linkType: 'depends_on' | 'blocks' | 'related' | 'parent' | 'child';
          description?: string;
        };
        const result = await apiClient.createRequirementLink(requirementId, {
          targetRequirementId,
          linkType,
          description,
        });
        return jsonResponse(result);
      }

      case 'delete_requirement_link': {
        const { linkId } = args as { linkId: string };
        await apiClient.deleteRequirementLink(linkId);
        return successResponse('Requirement link deleted successfully');
      }

      // ============ Requirement Comment Handlers ============

      case 'list_requirement_comments': {
        const { requirementId, compact = true, limit = 50 } = args as {
          requirementId: string;
          compact?: boolean;
          limit?: number;
        };
        const raw = await apiClient.listRequirementComments(requirementId);
        let items = extractArray<RequirementComment>(raw);
        if (items.length > limit) items = items.slice(0, limit);
        if (compact) {
          return jsonResponse(items.map(compactRequirementComment));
        }
        return jsonResponse(items);
      }

      case 'create_requirement_comment': {
        const { requirementId, content, parentCommentId, commentLevel, sectionKey, elementId, mentionedUsers } = args as {
          requirementId: string;
          content: string;
          parentCommentId?: string;
          commentLevel: 'requirement' | 'section' | 'element' | 'inline';
          sectionKey?: string;
          elementId?: string;
          mentionedUsers?: string[];
        };
        const result = await apiClient.createRequirementComment(requirementId, {
          content,
          parentCommentId,
          commentLevel,
          sectionKey,
          elementId,
          mentionedUsers,
        });
        return jsonResponse(result);
      }

      case 'update_requirement_comment': {
        const { id, ...updateData } = args as {
          id: string;
          content?: string;
          status?: 'open' | 'resolved' | 'wont_fix';
        };
        const result = await apiClient.updateRequirementComment(id, updateData);
        return jsonResponse(result);
      }

      case 'delete_requirement_comment': {
        const { id } = args as { id: string };
        await apiClient.deleteRequirementComment(id);
        return successResponse('Comment deleted successfully');
      }

      // ============ Requirement Tag Handlers ============

      case 'add_requirement_tags': {
        const { requirementId, tagIds } = args as { requirementId: string; tagIds: string[] };
        await apiClient.addRequirementTags(requirementId, tagIds);
        return successResponse('Tags added to requirement successfully');
      }

      case 'remove_requirement_tag': {
        const { requirementId, tagId } = args as { requirementId: string; tagId: string };
        await apiClient.removeRequirementTag(requirementId, tagId);
        return successResponse('Tag removed from requirement successfully');
      }

      case 'get_requirement_tags': {
        const { requirementId } = args as { requirementId: string };
        const result = await apiClient.getRequirementTags(requirementId);
        return jsonResponse(result);
      }

      // ============ Requirement Quality Handlers ============

      case 'calculate_requirement_quality': {
        const { requirementId } = args as { requirementId: string };
        const result = await apiClient.calculateRequirementQuality(requirementId);
        return jsonResponse(result);
      }

      case 'get_requirement_quality': {
        const { requirementId } = args as { requirementId: string };
        const result = await apiClient.getRequirementQuality(requirementId);
        return jsonResponse(result);
      }

      // ============ Requirement Activity Handlers ============

      case 'get_requirement_activity': {
        const { requirementId, limit = 50 } = args as { requirementId: string; limit?: number };
        const raw = await apiClient.getRequirementActivity(requirementId);
        let items = extractArray(raw);
        if (items.length > limit) items = items.slice(0, limit);
        return jsonResponse(items);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Resource definitions (expose prompts, templates, workflows, test sessions, and test issues as resources)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    const [promptsResult, templatesResult, workflowsResult] = await Promise.all([
      apiClient.listPrompts({ limit: 100 }),
      apiClient.listTemplates({ limit: 100 }),
      apiClient.listWorkflows({ limit: 100 }),
                ]);

    const promptResources = promptsResult.data.map((prompt) => ({
      uri: `prompt://${prompt.id}`,
      name: prompt.title,
      description: prompt.description ?? undefined,
      mimeType: 'text/plain',
    }));

    const templateResources = templatesResult.data.map((template) => ({
      uri: `template://${template.id}`,
      name: `[${template.type}] ${template.title}`,
      description: template.description ?? `${template.type} template${template.category ? ` for ${template.category}` : ''}`,
      mimeType: 'text/plain',
    }));

    const workflowResources = workflowsResult.data.map((workflow) => ({
      uri: `workflow://${workflow.id}`,
      name: `[WORKFLOW] ${workflow.title}`,
      description: workflow.description ?? `Workflow with ${workflow.resources.length} resources and ${workflow.steps.length} steps`,
      mimeType: 'text/plain',
    }));

    return {
      resources: [...promptResources, ...templateResources, ...workflowResources],
    };
  } catch {
    return { resources: [] };
  }
});

// Resource handlers
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Handle prompt resources
  if (uri.startsWith('prompt://')) {
    const promptId = uri.replace('prompt://', '');
    const prompt = await apiClient.getPrompt(promptId);

    const content = `# ${prompt.title}

${prompt.description ?? ''}

## Content
${prompt.content}

## Variables
${prompt.variables.length > 0
      ? prompt.variables.map((v) => `- **${v.name}** (${v.type}): ${v.description ?? 'No description'}`).join('\n')
      : 'No variables required'}

## Statistics
- Usage count: ${prompt.usageCount}
- Created: ${prompt.createdAt}
- Updated: ${prompt.updatedAt}
`;

    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: content,
        },
      ],
    };
  }

  // Handle template resources
  if (uri.startsWith('template://')) {
    const templateId = uri.replace('template://', '');
    const template = await apiClient.getTemplate(templateId);

    const content = `# ${template.title}
**Type:** ${template.type === 'example' ? 'Example Prompt' : 'Style Guide'}
${template.category ? `**Category:** ${template.category}` : ''}
${template.language ? `**Language:** ${template.language}` : ''}

${template.description ?? ''}

## Content
${template.content}

${template.useCaseHints && template.useCaseHints.length > 0 ? `## When to Use This Template
${template.useCaseHints.map((hint) => `- ${hint}`).join('\n')}` : ''}

${template.tags && template.tags.length > 0 ? `## Tags
${template.tags.map((tag) => `- ${tag.name}`).join('\n')}` : ''}

## Statistics
- Usage count: ${template.usageCount}
- Created: ${template.createdAt}
- Updated: ${template.updatedAt}
`;

    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: content,
        },
      ],
    };
  }

  // Handle workflow resources
  if (uri.startsWith('workflow://')) {
    const workflowId = uri.replace('workflow://', '');
    const workflow = await apiClient.getWorkflow(workflowId);

    const resourceList = workflow.resources.length > 0
      ? workflow.resources.map((r) => `- [${r.resourceType.toUpperCase()}] ${r.alias ?? r.resourceId}`).join('\n')
      : 'No resources attached';

    const stepList = workflow.steps.length > 0
      ? workflow.steps.map((s) => {
          const conditionInfo = s.condition ? ` (condition: ${s.conditionType})` : '';
          return `${s.stepNumber}. **${s.title}**: ${s.actionType}${conditionInfo}`;
        }).join('\n')
      : 'No steps defined';

    const content = `# ${workflow.title}

## Description
${workflow.description ?? 'No description'}

${workflow.customInstructions ? `## Custom Instructions
${workflow.customInstructions}
` : ''}
## Status
- **Status:** ${workflow.status}
- **Version:** ${workflow.version}
- **Public:** ${workflow.isPublic ? 'Yes' : 'No'}
${workflow.category ? `- **Category:** ${workflow.category}` : ''}

## Resources (${workflow.resources.length})
${resourceList}

## Steps (${workflow.steps.length})
${stepList}

${workflow.tags && workflow.tags.length > 0 ? `## Tags
${workflow.tags.map((tag) => `- ${tag.name}`).join('\n')}` : ''}

## Statistics
- Usage count: ${workflow.usageCount}
${workflow.lastUsedAt ? `- Last used: ${workflow.lastUsedAt}` : ''}
- Created: ${workflow.createdAt}
- Updated: ${workflow.updatedAt}
`;

    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: content,
        },
      ],
    };
  }

  throw new Error(`Unknown resource URI: ${uri}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ThinkPrompt MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
