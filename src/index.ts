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
    name: 'thinkprompt-mcp',
    version: '1.0.0',
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
