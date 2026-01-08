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
    {
      name: 'list_features',
      description: 'List all features/epics in a project (hierarchical).',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'The UUID of the project' },
          includeArchived: { type: 'boolean', description: 'Include archived features' },
        },
        required: ['projectId'],
      },
    },
    {
      name: 'list_feature_children',
      description: 'List children/subfeatures of a feature. Use recursive=true to get all descendants.',
      inputSchema: {
        type: 'object',
        properties: {
          parentId: { type: 'string', description: 'The UUID of the parent feature' },
          recursive: { type: 'boolean', description: 'Include all descendants recursively (default: false)' },
          includeArchived: { type: 'boolean', description: 'Include archived features (default: false)' },
        },
        required: ['parentId'],
      },
    },
    {
      name: 'search_features',
      description: 'Search features by name within a project.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'The UUID of the project' },
          q: { type: 'string', description: 'Search term to match against feature names' },
          includeArchived: { type: 'boolean', description: 'Include archived features (default: false)' },
        },
        required: ['projectId', 'q'],
      },
    },
    {
      name: 'create_feature',
      description: 'Create a new feature/epic in a project.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'The UUID of the project' },
          name: { type: 'string', description: 'Feature name' },
          description: { type: 'string', description: 'Feature description' },
          parentId: { type: 'string', description: 'Parent feature ID for hierarchy (Epic > Story)' },
          status: {
            type: 'string',
            enum: ['new', 'rfc', 'approved', 'blocked', 'ready_for_dev', 'ready_for_review', 'done'],
            description: 'Feature status (default: new)',
          },
        },
        required: ['projectId', 'name'],
      },
    },
    {
      name: 'update_feature_status',
      description:
        'Quick update of feature status. When setting to ready_for_review or done, validates that all tasks are completed. Use force=true to skip validation.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the feature' },
          status: {
            type: 'string',
            enum: ['new', 'rfc', 'approved', 'blocked', 'ready_for_dev', 'ready_for_review', 'done'],
            description: 'New status',
          },
          force: {
            type: 'boolean',
            description:
              'Force status update even if validation fails (e.g., open tasks exist for ready_for_review or done)',
          },
        },
        required: ['id', 'status'],
      },
    },
    {
      name: 'update_feature',
      description: 'Update a feature. Only include fields you want to change.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the feature to update' },
          name: { type: 'string', description: 'New feature name' },
          description: { type: 'string', description: 'New feature description' },
          parentId: { type: 'string', description: 'New parent feature ID for hierarchy' },
        },
        required: ['id'],
      },
    },
    {
      name: 'get_feature_history',
      description: 'Get the change history of a feature.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the feature' },
        },
        required: ['id'],
      },
    },
    {
      name: 'add_feature_comment',
      description: 'Add a comment to a feature.',
      inputSchema: {
        type: 'object',
        properties: {
          featureId: { type: 'string', description: 'The UUID of the feature' },
          content: { type: 'string', description: 'Comment content (markdown)' },
          mentionedUsers: {
            type: 'array',
            items: { type: 'string' },
            description: 'User IDs to mention',
          },
        },
        required: ['featureId', 'content'],
      },
    },
    {
      name: 'list_feature_comments',
      description: 'List all comments on a feature.',
      inputSchema: {
        type: 'object',
        properties: {
          featureId: { type: 'string', description: 'The UUID of the feature' },
        },
        required: ['featureId'],
      },
    },
    {
      name: 'generate_tasks_from_feature',
      description: 'Generate development tasks from a feature using AI. Feature must have status "ready_for_dev" and no existing tasks.',
      inputSchema: {
        type: 'object',
        properties: {
          featureId: { type: 'string', description: 'The UUID of the feature' },
          additionalContext: { type: 'string', description: 'Additional context for AI to consider' },
          model: { type: 'string', description: 'AI model to use (default: claude-3-5-sonnet-20241022)' },
        },
        required: ['featureId'],
      },
    },
    {
      name: 'generate_tasks_bulk',
      description: 'Generate tasks from all "ready_for_dev" features in a project that have no existing tasks.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'The UUID of the project' },
          additionalContext: { type: 'string', description: 'Additional context for AI to consider' },
          model: { type: 'string', description: 'AI model to use (default: claude-3-5-sonnet-20241022)' },
        },
        required: ['projectId'],
      },
    },
    {
      name: 'generate_features_from_document',
      description: 'Generate features from a document/transcription using AI. Provide document text and optional context.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'The UUID of the project' },
          document: { type: 'string', description: 'Document text content to analyze' },
          additionalContext: { type: 'string', description: 'Additional context for AI to consider' },
          model: { type: 'string', description: 'AI model to use (default: claude-3-5-sonnet-20241022)' },
        },
        required: ['projectId', 'document'],
      },
    },
    {
      name: 'list_tasks',
      description: 'List tasks with optional filters.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Filter by project' },
          featureId: { type: 'string', description: 'Filter by feature' },
          status: {
            type: 'string',
            enum: ['open', 'in_progress', 'blocked', 'review', 'done'],
            description: 'Filter by status',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Filter by priority',
          },
          search: { type: 'string', description: 'Search in title, description, kürzel' },
          page: { type: 'number', description: 'Page number' },
          limit: { type: 'number', description: 'Items per page' },
        },
      },
    },
    {
      name: 'get_task',
      description: 'Get detailed information about a task by ID or Kürzel.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the task' },
          kuerzel: { type: 'string', description: 'The task Kürzel (e.g., "TP-001")' },
        },
      },
    },
    {
      name: 'create_task',
      description: 'Create a new task in a project.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'The UUID of the project' },
          featureId: { type: 'string', description: 'Optional feature/epic to assign to' },
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Short description' },
          content: { type: 'string', description: 'Full markdown content (DB structure, SQL, etc.)' },
          status: {
            type: 'string',
            enum: ['open', 'in_progress', 'blocked', 'review', 'done'],
            description: 'Task status (default: open)',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Task priority (default: medium)',
          },
          complexity: {
            type: 'string',
            enum: ['trivial', 'low', 'medium', 'high', 'critical'],
            description: 'Task complexity (default: medium)',
          },
          estimationHours: { type: 'number', description: 'Estimated hours' },
        },
        required: ['projectId', 'title'],
      },
    },
    {
      name: 'update_task',
      description: 'Update an existing task.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the task' },
          title: { type: 'string' },
          description: { type: 'string' },
          content: { type: 'string' },
          status: { type: 'string', enum: ['open', 'in_progress', 'blocked', 'review', 'done'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          complexity: { type: 'string', enum: ['trivial', 'low', 'medium', 'high', 'critical'] },
          estimationHours: { type: 'number' },
          featureId: { type: 'string' },
        },
        required: ['id'],
      },
    },
    {
      name: 'update_task_status',
      description: 'Quick update of task status.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the task' },
          status: {
            type: 'string',
            enum: ['open', 'in_progress', 'blocked', 'review', 'done'],
            description: 'New status',
          },
        },
        required: ['id', 'status'],
      },
    },
    {
      name: 'ai_edit_task',
      description: 'Edit task content using AI. Provide a prompt describing the changes.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the task' },
          prompt: { type: 'string', description: 'Instructions for AI to modify the task content' },
          provider: { type: 'string', enum: ['openai', 'anthropic'], description: 'AI provider' },
          model: { type: 'string', description: 'Model to use' },
        },
        required: ['id', 'prompt'],
      },
    },
    {
      name: 'add_task_comment',
      description: 'Add a comment to a task.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The UUID of the task' },
          content: { type: 'string', description: 'Comment content (markdown)' },
          mentionedUsers: {
            type: 'array',
            items: { type: 'string' },
            description: 'User IDs to mention',
          },
        },
        required: ['taskId', 'content'],
      },
    },
    {
      name: 'list_task_comments',
      description: 'List all comments on a task.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The UUID of the task' },
        },
        required: ['taskId'],
      },
    },
    {
      name: 'get_task_history',
      description: 'Get the change history of a task.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the task' },
        },
        required: ['id'],
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

    // ============ Test Session Tools ============
    {
      name: 'start_test_session',
      description: 'Start a new test session for tracking QA metrics and issues during Playwright testing. Returns a session ID to use with record_metric and end_test_session.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Session name (e.g., "Homepage Testing - Jan 2026")',
          },
          projectId: {
            type: 'string',
            description: 'Optional project UUID to link this session to',
          },
          featureId: {
            type: 'string',
            description: 'Optional feature UUID to link this session to',
          },
          metadata: {
            type: 'object',
            description: 'Optional metadata (e.g., browser, OS, test plan)',
            additionalProperties: true,
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'record_metric',
      description: 'Record a test metric during an active session. Use for tracking network requests, console messages, interactions, page visits, etc.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'The UUID of the active test session',
          },
          metricType: {
            type: 'string',
            enum: ['network', 'console', 'interaction', 'page_visit', 'performance', 'custom'],
            description: 'Type of metric being recorded',
          },
          metricName: {
            type: 'string',
            description: 'Name of the metric (e.g., "API call to /login", "Click on Submit button")',
          },
          value: {
            description: 'Metric value - can be number, string, object, or boolean',
          },
          metadata: {
            type: 'object',
            description: 'Additional context (status code, duration, selector, etc.)',
            additionalProperties: true,
          },
        },
        required: ['sessionId', 'metricType', 'metricName', 'value'],
      },
    },
    {
      name: 'report_issue',
      description: 'Report a bug or issue found during testing. Can be linked to a session, project, feature, or task.',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Brief title of the issue',
          },
          description: {
            type: 'string',
            description: 'Detailed description of the issue',
          },
          issueType: {
            type: 'string',
            enum: ['bug', 'ux', 'performance', 'accessibility', 'security', 'other'],
            description: 'Type of issue',
          },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Issue severity',
          },
          sessionId: {
            type: 'string',
            description: 'Optional test session UUID to link this issue to',
          },
          projectId: {
            type: 'string',
            description: 'Optional project UUID',
          },
          featureId: {
            type: 'string',
            description: 'Optional feature UUID',
          },
          taskId: {
            type: 'string',
            description: 'Optional task UUID',
          },
          stepsToReproduce: {
            type: 'array',
            items: { type: 'string' },
            description: 'Steps to reproduce the issue',
          },
          expectedBehavior: {
            type: 'string',
            description: 'What should happen',
          },
          actualBehavior: {
            type: 'string',
            description: 'What actually happened',
          },
          environment: {
            type: 'object',
            description: 'Environment info (browser, OS, viewport, etc.)',
            additionalProperties: true,
          },
          screenshotUrl: {
            type: 'string',
            description: 'Screenshot URL',
          },
          pageUrl: {
            type: 'string',
            description: 'URL where the issue was found',
          },
          selector: {
            type: 'string',
            description: 'CSS selector of the problematic element',
          },
          consoleErrors: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
            description: 'Console errors captured',
          },
        },
        required: ['title', 'issueType', 'severity'],
      },
    },
    {
      name: 'end_test_session',
      description: 'Complete a test session and get a summary of metrics and issues found. Calculates duration, success rates, and aggregates metrics by type.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'The UUID of the session to complete',
          },
          status: {
            type: 'string',
            enum: ['completed', 'failed', 'cancelled'],
            description: 'Final session status (default: completed)',
          },
          notes: {
            type: 'string',
            description: 'Final notes or summary about the session',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'list_test_sessions',
      description: 'List test sessions with optional filters. Returns paginated results.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Filter by project UUID',
          },
          featureId: {
            type: 'string',
            description: 'Filter by feature UUID',
          },
          status: {
            type: 'string',
            enum: ['running', 'completed', 'failed', 'cancelled'],
            description: 'Filter by session status',
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
      name: 'get_test_session',
      description: 'Get details of a specific test session, optionally including all metrics.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'The UUID of the test session',
          },
          includeMetrics: {
            type: 'boolean',
            description: 'Include all metrics in the response (default: false)',
          },
        },
        required: ['sessionId'],
      },
    },

    // ============ Test Issue Tools ============
    {
      name: 'list_test_issues',
      description: 'List test issues with optional filters. Returns paginated results.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Filter by test session UUID',
          },
          projectId: {
            type: 'string',
            description: 'Filter by project UUID',
          },
          featureId: {
            type: 'string',
            description: 'Filter by feature UUID',
          },
          taskId: {
            type: 'string',
            description: 'Filter by task UUID',
          },
          issueType: {
            type: 'string',
            enum: ['bug', 'ux', 'performance', 'accessibility', 'security', 'other'],
            description: 'Filter by issue type',
          },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Filter by severity',
          },
          status: {
            type: 'string',
            enum: ['new', 'confirmed', 'false_positive', 'fixed'],
            description: 'Filter by issue status',
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
      name: 'get_test_issue',
      description: 'Get details of a specific test issue by ID.',
      inputSchema: {
        type: 'object',
        properties: {
          issueId: {
            type: 'string',
            description: 'The UUID of the test issue',
          },
        },
        required: ['issueId'],
      },
    },
    {
      name: 'update_test_issue',
      description: 'Update a test issue (e.g., change status, severity, or add more details).',
      inputSchema: {
        type: 'object',
        properties: {
          issueId: {
            type: 'string',
            description: 'The UUID of the test issue to update',
          },
          title: {
            type: 'string',
            description: 'Updated title',
          },
          description: {
            type: 'string',
            description: 'Updated description',
          },
          issueType: {
            type: 'string',
            enum: ['bug', 'ux', 'performance', 'accessibility', 'security', 'other'],
            description: 'Updated issue type',
          },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Updated severity',
          },
          status: {
            type: 'string',
            enum: ['new', 'confirmed', 'false_positive', 'fixed'],
            description: 'Updated status',
          },
          stepsToReproduce: {
            type: 'array',
            items: { type: 'string' },
            description: 'Updated steps to reproduce',
          },
          expectedBehavior: {
            type: 'string',
            description: 'Updated expected behavior',
          },
          actualBehavior: {
            type: 'string',
            description: 'Updated actual behavior',
          },
        },
        required: ['issueId'],
      },
    },

    // ============ Quality Analysis Tools ============
    {
      name: 'start_quality_analysis',
      description: 'Start a new quality analysis snapshot for a project. Use this at the beginning of a code quality analysis session. Returns a snapshot ID for recording metrics.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Project UUID to analyze',
          },
          name: {
            type: 'string',
            description: 'Analysis name (e.g., "Pre-release Quality Check")',
          },
          source: {
            type: 'string',
            enum: ['mcp', 'ci', 'manual'],
            description: 'Analysis source (default: mcp)',
          },
          gitBranch: {
            type: 'string',
            description: 'Current git branch',
          },
          gitCommitSha: {
            type: 'string',
            description: 'Current git commit hash',
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata',
            additionalProperties: true,
          },
        },
      },
    },
    {
      name: 'record_quality_metric',
      description: 'Record a quality metric during an active analysis snapshot. Use for eslint results, type coverage, test coverage, complexity, etc.',
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId: {
            type: 'string',
            description: 'The UUID of the active quality snapshot',
          },
          metricType: {
            type: 'string',
            enum: ['eslint', 'typescript', 'test_coverage', 'cyclomatic_complexity', 'code_duplication', 'bundle_size', 'dependency_health', 'dead_code', 'pattern_adherence', 'custom'],
            description: 'Type of metric being recorded',
          },
          metricName: {
            type: 'string',
            description: 'Name of the metric (e.g., "ESLint Errors", "Type Coverage")',
          },
          value: {
            description: 'Metric value - can be number, object, or complex structure',
          },
          score: {
            type: 'number',
            description: 'Optional score (0-100) for this metric',
          },
          metadata: {
            type: 'object',
            description: 'Additional context about the metric',
            additionalProperties: true,
          },
        },
        required: ['snapshotId', 'metricType', 'metricName', 'value'],
      },
    },
    {
      name: 'report_quality_issue',
      description: 'Report a code quality issue found during analysis. Can include location info, rule details, and fix suggestions.',
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId: {
            type: 'string',
            description: 'Quality snapshot UUID to link this issue to',
          },
          projectId: {
            type: 'string',
            description: 'Project UUID',
          },
          title: {
            type: 'string',
            description: 'Brief title of the issue',
          },
          description: {
            type: 'string',
            description: 'Detailed description',
          },
          category: {
            type: 'string',
            enum: ['lint', 'type', 'coverage', 'complexity', 'duplication', 'bundle', 'dependency', 'dead_code', 'pattern', 'security'],
            description: 'Issue category',
          },
          severity: {
            type: 'string',
            enum: ['error', 'warning', 'info', 'hint'],
            description: 'Issue severity',
          },
          filePath: {
            type: 'string',
            description: 'File path where the issue was found',
          },
          lineNumber: {
            type: 'number',
            description: 'Line number',
          },
          columnNumber: {
            type: 'number',
            description: 'Column number',
          },
          endLine: {
            type: 'number',
            description: 'End line number',
          },
          endColumn: {
            type: 'number',
            description: 'End column number',
          },
          codeSnippet: {
            type: 'string',
            description: 'Code snippet showing the issue',
          },
          ruleId: {
            type: 'string',
            description: 'Rule ID (e.g., "@typescript-eslint/no-unused-vars")',
          },
          ruleUrl: {
            type: 'string',
            description: 'URL to rule documentation',
          },
          tool: {
            type: 'string',
            description: 'Tool that found the issue (e.g., "eslint", "typescript")',
          },
          suggestedFix: {
            type: 'string',
            description: 'Suggested fix for the issue',
          },
          autoFixable: {
            type: 'boolean',
            description: 'Whether the issue can be auto-fixed',
          },
        },
        required: ['title', 'category'],
      },
    },
    {
      name: 'bulk_report_quality_issues',
      description: 'Report multiple quality issues at once. More efficient for large analysis results.',
      inputSchema: {
        type: 'object',
        properties: {
          issues: {
            type: 'array',
            description: 'Array of quality issues to report',
            items: {
              type: 'object',
              properties: {
                snapshotId: { type: 'string' },
                projectId: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string', enum: ['lint', 'type', 'coverage', 'complexity', 'duplication', 'bundle', 'dependency', 'dead_code', 'pattern', 'security'] },
                severity: { type: 'string', enum: ['error', 'warning', 'info', 'hint'] },
                filePath: { type: 'string' },
                lineNumber: { type: 'number' },
                columnNumber: { type: 'number' },
                codeSnippet: { type: 'string' },
                ruleId: { type: 'string' },
                tool: { type: 'string' },
                suggestedFix: { type: 'string' },
                autoFixable: { type: 'boolean' },
              },
              required: ['title', 'category'],
            },
          },
        },
        required: ['issues'],
      },
    },
    {
      name: 'complete_quality_analysis',
      description: 'Complete a quality analysis snapshot and calculate summary scores. Call this when analysis is done.',
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId: {
            type: 'string',
            description: 'The UUID of the quality snapshot to complete',
          },
          status: {
            type: 'string',
            enum: ['completed', 'failed'],
            description: 'Final status (default: completed)',
          },
          notes: {
            type: 'string',
            description: 'Optional notes about the analysis',
          },
        },
        required: ['snapshotId'],
      },
    },
    {
      name: 'delete_quality_snapshot',
      description: 'Delete a quality snapshot and all its related metrics and issues. Use this to clean up empty or invalid snapshots.',
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId: {
            type: 'string',
            description: 'The UUID of the quality snapshot to delete',
          },
        },
        required: ['snapshotId'],
      },
    },
    {
      name: 'get_quality_overview',
      description: 'Get quality analytics overview for a project including scores, trends, and issue breakdown.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Project UUID',
          },
          period: {
            type: 'string',
            enum: ['7d', '30d', '90d', '1y', 'all'],
            description: 'Time period for analysis (default: 30d)',
          },
        },
        required: ['projectId'],
      },
    },
    {
      name: 'get_quality_trends',
      description: 'Get quality metric trends over time for a project.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Project UUID',
          },
          metricType: {
            type: 'string',
            enum: ['overall', 'eslint', 'typescript', 'test_coverage', 'cyclomatic_complexity', 'code_duplication', 'bundle_size', 'dependency_health', 'dead_code', 'pattern_adherence'],
            description: 'Metric type to get trends for (default: overall)',
          },
          period: {
            type: 'string',
            enum: ['7d', '30d', '90d', '1y', 'all'],
            description: 'Time period (default: 30d)',
          },
          granularity: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly'],
            description: 'Data granularity (default: daily)',
          },
        },
        required: ['projectId'],
      },
    },
    {
      name: 'list_quality_snapshots',
      description: 'List quality snapshots for a project with optional filters.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Filter by project UUID',
          },
          status: {
            type: 'string',
            enum: ['running', 'completed', 'failed'],
            description: 'Filter by status',
          },
          source: {
            type: 'string',
            enum: ['mcp', 'ci', 'manual'],
            description: 'Filter by source',
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
      name: 'list_quality_issues',
      description: 'List quality issues with optional filters.',
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId: {
            type: 'string',
            description: 'Filter by snapshot UUID',
          },
          projectId: {
            type: 'string',
            description: 'Filter by project UUID',
          },
          category: {
            type: 'string',
            enum: ['lint', 'type', 'coverage', 'complexity', 'duplication', 'bundle', 'dependency', 'dead_code', 'pattern', 'security'],
            description: 'Filter by category',
          },
          severity: {
            type: 'string',
            enum: ['error', 'warning', 'info', 'hint'],
            description: 'Filter by severity',
          },
          status: {
            type: 'string',
            enum: ['new', 'acknowledged', 'fixed', 'wont_fix'],
            description: 'Filter by status',
          },
          tool: {
            type: 'string',
            description: 'Filter by tool',
          },
          filePath: {
            type: 'string',
            description: 'Filter by file path (partial match)',
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_prompt': {
        const { id } = args as { id: string };
        const result = await apiClient.getPrompt(id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_prompt_variables': {
        const { id } = args as { id: string };
        const result = await apiClient.getPromptVariables(id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Workspace tool handlers
      case 'list_workspaces': {
        const workspaces = await apiClient.listWorkspaces();
        const currentId = apiClient.getCurrentWorkspaceId();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  currentWorkspaceId: currentId,
                  workspaces,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'get_current_workspace': {
        const workspace = await apiClient.getCurrentWorkspace();
        if (!workspace) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ message: 'No workspace selected or available' }, null, 2),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(workspace, null, 2),
            },
          ],
        };
      }

      case 'switch_workspace': {
        const { workspaceId } = args as { workspaceId: string };
        const result = await apiClient.switchWorkspace(workspaceId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Project Management handlers
      case 'list_projects': {
        const { includeArchived } = args as { includeArchived?: boolean };
        const result = await apiClient.listProjects({ includeArchived });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_project': {
        const { id } = args as { id: string };
        const result = await apiClient.getProject(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_project_statistics': {
        const { projectId } = args as { projectId: string };
        const result = await apiClient.getProjectStatistics(projectId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'create_project': {
        const { name, slug, description, links } = args as {
          name: string;
          slug: string;
          description?: string;
          links?: Array<{ type: string; url: string; label?: string }>;
        };
        const result = await apiClient.createProject({ name, slug, description, links });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'list_features': {
        const { projectId, includeArchived } = args as { projectId: string; includeArchived?: boolean };
        const result = await apiClient.listFeatures(projectId, { includeArchived });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'list_feature_children': {
        const { parentId, recursive, includeArchived } = args as {
          parentId: string;
          recursive?: boolean;
          includeArchived?: boolean;
        };
        const result = await apiClient.getFeatureChildren(parentId, { recursive, includeArchived });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'search_features': {
        const { projectId, q, includeArchived } = args as {
          projectId: string;
          q: string;
          includeArchived?: boolean;
        };
        const result = await apiClient.searchFeatures(projectId, { q, includeArchived });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'create_feature': {
        const { projectId, name, description, parentId, status } = args as {
          projectId: string;
          name: string;
          description?: string;
          parentId?: string;
          status?: 'new' | 'rfc' | 'approved' | 'blocked' | 'ready_for_dev' | 'ready_for_review' | 'done';
        };
        const result = await apiClient.createFeature(projectId, { name, description, parentId, status });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'update_feature_status': {
        const { id, status, force } = args as {
          id: string;
          status: 'new' | 'rfc' | 'approved' | 'blocked' | 'ready_for_dev' | 'ready_for_review' | 'done';
          force?: boolean;
        };
        const result = await apiClient.updateFeatureStatus(id, status, force);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'update_feature': {
        const { id, name, description, parentId } = args as {
          id: string;
          name?: string;
          description?: string;
          parentId?: string;
        };
        const result = await apiClient.updateFeature(id, { name, description, parentId });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_feature_history': {
        const { id } = args as { id: string };
        const result = await apiClient.getFeatureHistory(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'add_feature_comment': {
        const { featureId, content, mentionedUsers } = args as {
          featureId: string;
          content: string;
          mentionedUsers?: string[];
        };
        const result = await apiClient.addFeatureComment(featureId, {
          content,
          mentionedUsers,
          createdBySource: 'mcp',
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'list_feature_comments': {
        const { featureId } = args as { featureId: string };
        const result = await apiClient.listFeatureComments(featureId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'generate_tasks_from_feature': {
        const { featureId, additionalContext, model } = args as {
          featureId: string;
          additionalContext?: string;
          model?: string;
        };
        const result = await apiClient.generateTasksFromFeature(featureId, { additionalContext, model });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'generate_tasks_bulk': {
        const { projectId, additionalContext, model } = args as {
          projectId: string;
          additionalContext?: string;
          model?: string;
        };
        const result = await apiClient.generateTasksBulk(projectId, { additionalContext, model });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'generate_features_from_document': {
        const { projectId, document, additionalContext, model } = args as {
          projectId: string;
          document: string;
          additionalContext?: string;
          model?: string;
        };
        const result = await apiClient.generateFeaturesFromDocument(projectId, { document, additionalContext, model });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'list_tasks': {
        const params = args as {
          projectId?: string;
          featureId?: string;
          status?: 'open' | 'in_progress' | 'blocked' | 'review' | 'done';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          search?: string;
          page?: number;
          limit?: number;
        };
        const result = await apiClient.listTasks(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_task': {
        const { id, kuerzel } = args as { id?: string; kuerzel?: string };
        let result;
        if (kuerzel) {
          result = await apiClient.getTaskByKuerzel(kuerzel);
        } else if (id) {
          result = await apiClient.getTask(id);
        } else {
          throw new Error('Either id or kuerzel must be provided');
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'create_task': {
        const taskInput = args as {
          projectId: string;
          featureId?: string;
          title: string;
          description?: string;
          content?: string;
          status?: 'open' | 'in_progress' | 'blocked' | 'review' | 'done';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          complexity?: 'trivial' | 'low' | 'medium' | 'high' | 'critical';
          estimationHours?: number;
        };
        const result = await apiClient.createTask(taskInput);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'update_task': {
        const { id, ...updateData } = args as {
          id: string;
          title?: string;
          description?: string;
          content?: string;
          status?: 'open' | 'in_progress' | 'blocked' | 'review' | 'done';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          complexity?: 'trivial' | 'low' | 'medium' | 'high' | 'critical';
          estimationHours?: number;
          featureId?: string;
        };
        const result = await apiClient.updateTask(id, updateData);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'update_task_status': {
        const { id, status } = args as {
          id: string;
          status: 'open' | 'in_progress' | 'blocked' | 'review' | 'done';
        };
        const result = await apiClient.updateTaskStatus(id, status);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'ai_edit_task': {
        const { id, prompt, provider, model } = args as {
          id: string;
          prompt: string;
          provider?: 'openai' | 'anthropic';
          model?: string;
        };
        const result = await apiClient.aiEditTask(id, { prompt, provider, model });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'add_task_comment': {
        const { taskId, content, mentionedUsers } = args as {
          taskId: string;
          content: string;
          mentionedUsers?: string[];
        };
        const result = await apiClient.addTaskComment(taskId, {
          content,
          mentionedUsers,
          createdBySource: 'mcp',
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'list_task_comments': {
        const { taskId } = args as { taskId: string };
        const result = await apiClient.listTaskComments(taskId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_task_history': {
        const { id } = args as { id: string };
        const result = await apiClient.getTaskHistory(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
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
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_template': {
        const { id } = args as { id: string };
        const result = await apiClient.getTemplate(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
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
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
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
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
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
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_workflow': {
        const { id } = args as { id: string };
        const result = await apiClient.getWorkflow(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
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
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
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
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'delete_workflow': {
        const { id } = args as { id: string };
        await apiClient.deleteWorkflow(id);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Workflow deleted' }, null, 2) }],
        };
      }

      case 'validate_workflow': {
        const { id } = args as { id: string };
        const result = await apiClient.validateWorkflow(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_workflow_executions': {
        const { workflowId, page, limit } = args as {
          workflowId: string;
          page?: number;
          limit?: number;
        };
        const result = await apiClient.getWorkflowExecutions(workflowId, { page, limit });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_workflow_execution': {
        const { executionId } = args as { executionId: string };
        const result = await apiClient.getWorkflowExecution(executionId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // ============ Test Session Handlers ============
      case 'start_test_session': {
        const { name: sessionName, projectId, featureId, metadata } = args as {
          name: string;
          projectId?: string;
          featureId?: string;
          metadata?: Record<string, unknown>;
        };
        const result = await apiClient.createTestSession({
          name: sessionName,
          projectId,
          featureId,
          metadata,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  sessionId: result.id,
                  status: result.status,
                  startedAt: result.startedAt,
                  message: `Test session "${sessionName}" started. Use record_metric to log metrics and end_test_session to complete.`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'record_metric': {
        const { sessionId, metricType, metricName, value, metadata } = args as {
          sessionId: string;
          metricType: 'network' | 'console' | 'interaction' | 'page_visit' | 'performance' | 'custom';
          metricName: string;
          value: unknown;
          metadata?: Record<string, unknown>;
        };
        const result = await apiClient.recordMetric(sessionId, {
          metricType,
          metricName,
          value,
          metadata,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'report_issue': {
        const input = args as {
          title: string;
          description?: string;
          issueType: 'bug' | 'ux' | 'performance' | 'accessibility' | 'security' | 'other';
          severity: 'low' | 'medium' | 'high' | 'critical';
          sessionId?: string;
          projectId?: string;
          featureId?: string;
          taskId?: string;
          stepsToReproduce?: string[];
          expectedBehavior?: string;
          actualBehavior?: string;
          environment?: Record<string, unknown>;
          screenshotUrl?: string;
          pageUrl?: string;
          selector?: string;
          consoleErrors?: Record<string, unknown>[];
        };
        const result = await apiClient.createTestIssue(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  issueId: result.id,
                  title: result.title,
                  severity: result.severity,
                  status: result.status,
                  message: `Issue "${result.title}" reported successfully.`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'end_test_session': {
        const { sessionId, status, notes } = args as {
          sessionId: string;
          status?: 'completed' | 'failed' | 'cancelled';
          notes?: string;
        };
        const result = await apiClient.completeSession(sessionId, { status, notes });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  sessionId: result.id,
                  status: result.status,
                  durationMs: result.durationMs,
                  summary: result.summary,
                  message: result.message,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'list_test_sessions': {
        const params = args as {
          projectId?: string;
          featureId?: string;
          status?: 'running' | 'completed' | 'failed' | 'cancelled';
          page?: number;
          limit?: number;
        };
        const result = await apiClient.listTestSessions(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_test_session': {
        const { sessionId, includeMetrics } = args as {
          sessionId: string;
          includeMetrics?: boolean;
        };
        const result = await apiClient.getTestSession(sessionId, includeMetrics ?? false);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // ============ Test Issue Handlers ============
      case 'list_test_issues': {
        const params = args as {
          sessionId?: string;
          projectId?: string;
          featureId?: string;
          taskId?: string;
          issueType?: 'bug' | 'ux' | 'performance' | 'accessibility' | 'security' | 'other';
          severity?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'new' | 'confirmed' | 'false_positive' | 'fixed';
          page?: number;
          limit?: number;
        };
        const result = await apiClient.listTestIssues(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_test_issue': {
        const { issueId } = args as { issueId: string };
        const result = await apiClient.getTestIssue(issueId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'update_test_issue': {
        const { issueId, ...updateData } = args as {
          issueId: string;
          title?: string;
          description?: string;
          issueType?: 'bug' | 'ux' | 'performance' | 'accessibility' | 'security' | 'other';
          severity?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'new' | 'confirmed' | 'false_positive' | 'fixed';
          stepsToReproduce?: string[];
          expectedBehavior?: string;
          actualBehavior?: string;
        };
        const result = await apiClient.updateTestIssue(issueId, updateData);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  issueId: result.id,
                  title: result.title,
                  status: result.status,
                  severity: result.severity,
                  message: `Issue "${result.title}" updated successfully.`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // ============ Quality Analysis Tool Handlers ============

      case 'start_quality_analysis': {
        const input = args as {
          projectId?: string;
          name?: string;
          source?: 'mcp' | 'ci' | 'manual';
          gitBranch?: string;
          gitCommitSha?: string;
          metadata?: Record<string, unknown>;
        };
        const result = await apiClient.createQualitySnapshot({
          ...input,
          source: input.source || 'mcp',
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  snapshotId: result.id,
                  name: result.name,
                  status: result.status,
                  startedAt: result.startedAt,
                  message: `Quality analysis started. Use snapshot ID "${result.id}" to record metrics.`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'record_quality_metric': {
        const { snapshotId, metricType, metricName, value, score, metadata } = args as {
          snapshotId: string;
          metricType: 'eslint' | 'typescript' | 'test_coverage' | 'cyclomatic_complexity' | 'code_duplication' | 'bundle_size' | 'dependency_health' | 'dead_code' | 'pattern_adherence' | 'custom';
          metricName: string;
          value: unknown;
          score?: number;
          metadata?: Record<string, unknown>;
        };
        const result = await apiClient.recordQualityMetric(snapshotId, {
          metricType,
          metricName,
          value,
          score,
          metadata,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  metricId: result.id,
                  metricType: result.metricType,
                  metricName: result.metricName,
                  score: result.score,
                  message: `Metric "${metricName}" recorded successfully.`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'report_quality_issue': {
        const input = args as {
          snapshotId?: string;
          projectId?: string;
          title: string;
          description?: string;
          category: 'lint' | 'type' | 'coverage' | 'complexity' | 'duplication' | 'bundle' | 'dependency' | 'dead_code' | 'pattern' | 'security';
          severity?: 'error' | 'warning' | 'info' | 'hint';
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
        };
        const result = await apiClient.createQualityIssue(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  issueId: result.id,
                  title: result.title,
                  category: result.category,
                  severity: result.severity,
                  message: `Quality issue "${result.title}" reported successfully.`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'bulk_report_quality_issues': {
        const { issues } = args as {
          issues: Array<{
            snapshotId?: string;
            projectId?: string;
            title: string;
            description?: string;
            category: 'lint' | 'type' | 'coverage' | 'complexity' | 'duplication' | 'bundle' | 'dependency' | 'dead_code' | 'pattern' | 'security';
            severity?: 'error' | 'warning' | 'info' | 'hint';
            filePath?: string;
            lineNumber?: number;
            columnNumber?: number;
            codeSnippet?: string;
            ruleId?: string;
            tool?: string;
            suggestedFix?: string;
            autoFixable?: boolean;
          }>;
        };
        const result = await apiClient.bulkCreateQualityIssues({ issues });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  created: result.created,
                  message: `${result.created} quality issues reported successfully.`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'complete_quality_analysis': {
        const { snapshotId, status, notes } = args as {
          snapshotId: string;
          status?: 'completed' | 'failed';
          notes?: string;
        };
        const result = await apiClient.completeQualitySnapshot(snapshotId, {
          status: status || 'completed',
          notes,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  snapshotId: result.id,
                  status: result.status,
                  durationMs: result.durationMs,
                  summary: result.summary,
                  message: result.message,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'delete_quality_snapshot': {
        const { snapshotId } = args as { snapshotId: string };
        await apiClient.deleteQualitySnapshot(snapshotId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Quality snapshot ${snapshotId} deleted successfully`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'get_quality_overview': {
        const { projectId, period } = args as {
          projectId: string;
          period?: '7d' | '30d' | '90d' | '1y' | 'all';
        };
        const result = await apiClient.getQualityOverview(projectId, { period });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_quality_trends': {
        const { projectId, metricType, period, granularity } = args as {
          projectId: string;
          metricType?: string;
          period?: '7d' | '30d' | '90d' | '1y' | 'all';
          granularity?: 'daily' | 'weekly' | 'monthly';
        };
        const result = await apiClient.getQualityTrends(projectId, {
          metricType,
          period,
          granularity,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'list_quality_snapshots': {
        const params = args as {
          projectId?: string;
          status?: 'running' | 'completed' | 'failed';
          source?: 'mcp' | 'ci' | 'manual';
          page?: number;
          limit?: number;
        };
        const result = await apiClient.listQualitySnapshots(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'list_quality_issues': {
        const params = args as {
          snapshotId?: string;
          projectId?: string;
          category?: 'lint' | 'type' | 'coverage' | 'complexity' | 'duplication' | 'bundle' | 'dependency' | 'dead_code' | 'pattern' | 'security';
          severity?: 'error' | 'warning' | 'info' | 'hint';
          status?: 'new' | 'acknowledged' | 'fixed' | 'wont_fix';
          tool?: string;
          filePath?: string;
          page?: number;
          limit?: number;
        };
        const result = await apiClient.listQualityIssues(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
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
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_marketplace_plugin': {
        const { nameOrId } = args as { nameOrId: string };
        const result = await apiClient.getMarketplacePlugin(nameOrId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_plugin_categories': {
        const result = await apiClient.getPluginCategories();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_featured_plugins': {
        const result = await apiClient.getFeaturedPlugins();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
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
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'track_plugin_install': {
        const { nameOrId, version, source } = args as {
          nameOrId: string;
          version?: string;
          source?: string;
        };
        const result = await apiClient.trackPluginInstall(nameOrId, { version, source });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
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
    const [promptsResult, templatesResult, workflowsResult, testSessionsResult, testIssuesResult] = await Promise.all([
      apiClient.listPrompts({ limit: 100 }),
      apiClient.listTemplates({ limit: 100 }),
      apiClient.listWorkflows({ limit: 100 }),
      apiClient.listTestSessions({ limit: 50 }),
      apiClient.listTestIssues({ limit: 50 }),
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

    const testSessionResources = testSessionsResult.data.map((session) => ({
      uri: `test://sessions/${session.id}`,
      name: `[TEST] ${session.name}`,
      description: `${session.status} session${session.projectId ? ' - project linked' : ''}`,
      mimeType: 'text/plain',
    }));

    const testIssueResources = testIssuesResult.data.map((issue) => ({
      uri: `test://issues/${issue.id}`,
      name: `[ISSUE] ${issue.title}`,
      description: `[${issue.severity}] ${issue.issueType} - ${issue.status}`,
      mimeType: 'text/plain',
    }));

    return {
      resources: [...promptResources, ...templateResources, ...workflowResources, ...testSessionResources, ...testIssueResources],
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

  // Handle test session resources
  if (uri.startsWith('test://sessions/')) {
    const sessionId = uri.replace('test://sessions/', '');
    const session = await apiClient.getTestSession(sessionId, true);

    const metricsSection = session.metrics && session.metrics.length > 0
      ? session.metrics
          .slice(0, 50) // Limit to 50 most recent metrics
          .map((m) => `- [${m.metricType}] **${m.metricName}**: ${typeof m.value === 'object' ? JSON.stringify(m.value) : m.value}`)
          .join('\n')
      : 'No metrics recorded';

    const issuesSection = session.issues && session.issues.length > 0
      ? session.issues
          .map((i) => `- [${i.severity.toUpperCase()}] **${i.title}** (${i.issueType}): ${i.description ?? 'No description'}`)
          .join('\n')
      : 'No issues reported';

    const summarySection = session.summary
      ? `\`\`\`json
${JSON.stringify(session.summary, null, 2)}
\`\`\``
      : 'No summary available (session still running)';

    const content = `# Test Session: ${session.name}

## Status
- **Status:** ${session.status}
- **Started:** ${session.startedAt}
${session.endedAt ? `- **Completed:** ${session.endedAt}` : '- **Completed:** In progress'}
${session.projectId ? `- **Project ID:** ${session.projectId}` : ''}
${session.featureId ? `- **Feature ID:** ${session.featureId}` : ''}

${session.metadata ? `## Metadata
\`\`\`json
${JSON.stringify(session.metadata, null, 2)}
\`\`\`
` : ''}
## Metrics (${session.metrics?.length ?? 0})
${metricsSection}

## Issues (${session.issues?.length ?? 0})
${issuesSection}

## Summary
${summarySection}
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

  // Handle test issue resources
  if (uri.startsWith('test://issues/')) {
    const issueId = uri.replace('test://issues/', '');
    const issue = await apiClient.getTestIssue(issueId);

    const stepsSection = issue.stepsToReproduce && issue.stepsToReproduce.length > 0
      ? issue.stepsToReproduce.map((step, i) => `${i + 1}. ${step}`).join('\n')
      : 'No steps provided';

    const environmentSection = issue.environment
      ? `\`\`\`json
${JSON.stringify(issue.environment, null, 2)}
\`\`\``
      : 'Not specified';

    const content = `# Issue: ${issue.title}

## Details
- **Type:** ${issue.issueType}
- **Severity:** ${issue.severity}
- **Status:** ${issue.status}
- **Created:** ${issue.createdAt}
${issue.sessionId ? `- **Session ID:** ${issue.sessionId}` : ''}
${issue.projectId ? `- **Project ID:** ${issue.projectId}` : ''}
${issue.featureId ? `- **Feature ID:** ${issue.featureId}` : ''}
${issue.taskId ? `- **Task ID:** ${issue.taskId}` : ''}

## Description
${issue.description ?? 'No description provided'}

## Steps to Reproduce
${stepsSection}

## Expected Behavior
${issue.expectedBehavior ?? 'Not specified'}

## Actual Behavior
${issue.actualBehavior ?? 'Not specified'}

## Environment
${environmentSection}

${issue.screenshotUrl ? `## Screenshot
${issue.screenshotUrl}` : ''}
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
