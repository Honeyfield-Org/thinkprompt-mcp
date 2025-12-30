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
      name: 'execute_prompt',
      description: 'Execute a prompt with the specified variables. The prompt will be sent to the configured AI provider.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the prompt to execute',
          },
          variables: {
            type: 'object',
            description: 'Key-value pairs of variables to substitute in the prompt',
            additionalProperties: true,
          },
          provider: {
            type: 'string',
            description: 'AI provider to use (e.g., "openai", "anthropic")',
          },
          model: {
            type: 'string',
            description: 'Model to use (e.g., "gpt-4o", "claude-3-sonnet")',
          },
        },
        required: ['id', 'variables'],
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
      name: 'create_feature',
      description: 'Create a new feature/epic in a project.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'The UUID of the project' },
          name: { type: 'string', description: 'Feature name' },
          description: { type: 'string', description: 'Feature description' },
          parentId: { type: 'string', description: 'Parent feature ID for hierarchy (Epic > Story)' },
        },
        required: ['projectId', 'name'],
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

      case 'execute_prompt': {
        const { id, variables, provider, model } = args as {
          id: string;
          variables: Record<string, string | number | boolean>;
          provider?: string;
          model?: string;
        };
        const result = await apiClient.executePrompt(id, variables, { provider, model });
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

      case 'create_feature': {
        const { projectId, name, description, parentId } = args as {
          projectId: string;
          name: string;
          description?: string;
          parentId?: string;
        };
        const result = await apiClient.createFeature(projectId, { name, description, parentId });
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

// Resource definitions (expose prompts as resources)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    const prompts = await apiClient.listPrompts({ limit: 100 });
    return {
      resources: prompts.data.map((prompt) => ({
        uri: `prompt://${prompt.id}`,
        name: prompt.title,
        description: prompt.description ?? undefined,
        mimeType: 'text/plain',
      })),
    };
  } catch {
    return { resources: [] };
  }
});

// Resource handlers
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (!uri.startsWith('prompt://')) {
    throw new Error(`Unknown resource URI: ${uri}`);
  }

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
