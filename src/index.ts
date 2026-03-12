#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

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
const MCP_API_KEY = process.env.MCP_API_KEY ?? '';
const PORT = parseInt(process.env.PORT ?? '8080', 10);

const apiClient = new ThinkPromptApiClient(API_URL, API_KEY);

// ============================================================
// Tool definitions array — shared across all server instances
// ============================================================
const TOOL_DEFINITIONS = [
    {
      name: 'list_style_guides',
      description: 'List all available style guides from ThinkPrompt. Returns a paginated list of style guides with their titles, descriptions, and usage statistics.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of style guides to return (default: 20)' },
          page: { type: 'number', description: 'Page number for pagination (default: 1)' },
          search: { type: 'string', description: 'Search query to filter style guides by title or description' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter style guides by tags' },
        },
      },
    },
    {
      name: 'get_style_guide',
      description: 'Get detailed information about a specific style guide, including its content.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the style guide to retrieve' },
        },
        required: ['id'],
      },
    },
    {
      name: 'create_style_guide',
      description: 'Create a new style guide with title, content, and optional variables.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The title of the style guide' },
          content: { type: 'string', description: 'The style guide content with {{variable}} placeholders' },
          description: { type: 'string', description: 'Optional description of the style guide' },
          variables: {
            type: 'array',
            description: 'List of variables used in the style guide',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Variable name (without braces)' },
                type: { type: 'string', enum: ['text', 'textarea', 'number', 'select', 'date', 'boolean'], description: 'Variable type' },
                label: { type: 'string', description: 'Display label' },
                description: { type: 'string', description: 'Variable description' },
                required: { type: 'boolean', description: 'Whether the variable is required' },
                defaultValue: { description: 'Default value for the variable' },
                options: { type: 'array', items: { type: 'string' }, description: 'Options for select type' },
              },
              required: ['name', 'type'],
            },
          },
          isPublic: { type: 'boolean', description: 'Whether the style guide is publicly visible' },
        },
        required: ['title', 'content'],
      },
    },
    {
      name: 'update_style_guide',
      description: 'Update an existing style guide. Only include fields you want to change.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the style guide to update' },
          title: { type: 'string', description: 'New title for the style guide' },
          content: { type: 'string', description: 'New style guide content with {{variable}} placeholders' },
          description: { type: 'string', description: 'New description of the style guide' },
          variables: {
            type: 'array',
            description: 'Updated list of variables',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Variable name (without braces)' },
                type: { type: 'string', enum: ['text', 'textarea', 'number', 'select', 'date', 'boolean'], description: 'Variable type' },
                label: { type: 'string', description: 'Display label' },
                description: { type: 'string', description: 'Variable description' },
                required: { type: 'boolean', description: 'Whether the variable is required' },
                defaultValue: { description: 'Default value for the variable' },
                options: { type: 'array', items: { type: 'string' }, description: 'Options for select type' },
              },
              required: ['name', 'type'],
            },
          },
          isPublic: { type: 'boolean', description: 'Whether the style guide is publicly visible' },
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
          limit: { type: 'number', description: 'Maximum number of templates to return (default: 20)' },
          page: { type: 'number', description: 'Page number for pagination (default: 1)' },
          search: { type: 'string', description: 'Search query to filter templates' },
          type: { type: 'string', enum: ['example', 'style'], description: 'Filter by template type' },
          category: { type: 'string', description: 'Filter by category' },
          language: { type: 'string', description: 'Filter by language code' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tag IDs' },
        },
      },
    },
    {
      name: 'get_template',
      description: 'Get detailed information about a specific template, including its content and use case hints.',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'The UUID of the template to retrieve' } }, required: ['id'] },
    },
    {
      name: 'create_template',
      description: 'Create a new template. Templates can be example prompts or style guides for AI assistants.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The title of the template' },
          content: { type: 'string', description: 'The template content' },
          type: { type: 'string', enum: ['example', 'style'], description: 'Template type' },
          description: { type: 'string', description: 'Optional description of the template' },
          category: { type: 'string', description: 'Category' },
          language: { type: 'string', description: 'Language code' },
          useCaseHints: { type: 'array', items: { type: 'string' }, description: 'List of hints describing when to use this template' },
          isPublic: { type: 'boolean', description: 'Whether the template is publicly visible' },
          tagIds: { type: 'array', items: { type: 'string' }, description: 'Tag IDs to associate' },
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
          id: { type: 'string', description: 'The UUID of the template to update' },
          title: { type: 'string' }, content: { type: 'string' },
          type: { type: 'string', enum: ['example', 'style'] },
          description: { type: 'string' }, category: { type: 'string' },
          language: { type: 'string' },
          useCaseHints: { type: 'array', items: { type: 'string' } },
          isPublic: { type: 'boolean' },
          tagIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['id'],
      },
    },
    // Workspace tools
    { name: 'list_workspaces', description: 'List all workspaces the user belongs to.', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_current_workspace', description: 'Get the currently active workspace for this session.', inputSchema: { type: 'object', properties: {} } },
    {
      name: 'switch_workspace',
      description: 'Switch to a different workspace.',
      inputSchema: { type: 'object', properties: { workspaceId: { type: 'string', description: 'The UUID of the workspace to switch to' } }, required: ['workspaceId'] },
    },
    // Tag tools
    { name: 'list_tags', description: 'List all tags in the current workspace.', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_tag', description: 'Get detailed information about a specific tag.', inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'The UUID of the tag' } }, required: ['id'] } },
    { name: 'create_tag', description: 'Create a new tag in the current workspace.', inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Tag name (max 100 characters)' }, color: { type: 'string', description: 'Hex color code' } }, required: ['name'] } },
    { name: 'update_tag', description: 'Update an existing tag.', inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'The UUID of the tag to update' }, name: { type: 'string' }, color: { type: 'string' } }, required: ['id'] } },
    { name: 'delete_tag', description: 'Delete a tag.', inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'The UUID of the tag to delete' } }, required: ['id'] } },
    // Project Management tools
    {
      name: 'list_projects',
      description: 'List all projects in the current workspace.',
      inputSchema: { type: 'object', properties: { includeArchived: { type: 'boolean', description: 'Include archived projects (default: false)' } } },
    },
    { name: 'get_project', description: 'Get detailed information about a project.', inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'The UUID of the project' } }, required: ['id'] } },
    { name: 'get_project_statistics', description: 'Get dashboard statistics for a project.', inputSchema: { type: 'object', properties: { projectId: { type: 'string', description: 'The UUID of the project' } }, required: ['projectId'] } },
    {
      name: 'create_project',
      description: 'Create a new project.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
          slug: { type: 'string', description: 'Uppercase prefix for task numbering' },
          description: { type: 'string', description: 'Project description' },
          links: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, url: { type: 'string' }, label: { type: 'string' } } }, description: 'Links to design, wiki, etc.' },
        },
        required: ['name', 'slug'],
      },
    },
    // Workflow tools
    {
      name: 'list_workflows',
      description: 'List all workflows.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number' }, page: { type: 'number' }, search: { type: 'string' },
          category: { type: 'string' }, status: { type: 'string', enum: ['draft', 'active', 'deprecated'] },
          includeArchived: { type: 'boolean' },
        },
      },
    },
    { name: 'get_workflow', description: 'Get detailed information about a workflow.', inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'The UUID of the workflow' } }, required: ['id'] } },
    {
      name: 'create_workflow',
      description: 'Create a new workflow that combines prompts, templates, tasks, and features into an automated sequence.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' }, description: { type: 'string' }, customInstructions: { type: 'string' },
          category: { type: 'string' }, isPublic: { type: 'boolean' },
          status: { type: 'string', enum: ['draft', 'active', 'deprecated'] },
          tagIds: { type: 'array', items: { type: 'string' } },
          resources: { type: 'array', items: { type: 'object', properties: { resourceType: { type: 'string', enum: ['prompt', 'template', 'task', 'feature', 'project'] }, resourceId: { type: 'string' }, alias: { type: 'string' }, sortOrder: { type: 'number' } }, required: ['resourceType', 'resourceId'] } },
          steps: { type: 'array', items: { type: 'object', properties: { stepNumber: { type: 'number' }, title: { type: 'string' }, description: { type: 'string' }, actionType: { type: 'string', enum: ['execute_prompt', 'load_template', 'create_task', 'update_task_status', 'generate_tasks', 'custom'] }, actionConfig: { type: 'object' }, condition: { type: 'string' }, conditionType: { type: 'string', enum: ['none', 'simple', 'ai'] }, timeoutMs: { type: 'number' }, onError: { type: 'string', enum: ['fail', 'skip', 'continue'] } }, required: ['stepNumber', 'title', 'actionType', 'actionConfig'] } },
        },
        required: ['title'],
      },
    },
    {
      name: 'update_workflow',
      description: 'Update an existing workflow.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
          customInstructions: { type: 'string' }, category: { type: 'string' },
          isPublic: { type: 'boolean' }, status: { type: 'string', enum: ['draft', 'active', 'deprecated'] },
          tagIds: { type: 'array', items: { type: 'string' } },
          resources: { type: 'array' }, steps: { type: 'array' },
        },
        required: ['id'],
      },
    },
    { name: 'delete_workflow', description: 'Delete a workflow.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    { name: 'validate_workflow', description: 'Validate a workflow.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    { name: 'get_workflow_executions', description: 'Get execution history for a workflow.', inputSchema: { type: 'object', properties: { workflowId: { type: 'string' }, page: { type: 'number' }, limit: { type: 'number' } }, required: ['workflowId'] } },
    { name: 'get_workflow_execution', description: 'Get details of a specific workflow execution.', inputSchema: { type: 'object', properties: { executionId: { type: 'string' } }, required: ['executionId'] } },
    // Plugin Marketplace Tools
    {
      name: 'search_marketplace_plugins',
      description: 'Search for Claude Code plugins in the ThinkPrompt marketplace.',
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string' }, category: { type: 'string' },
          installSource: { type: 'string', enum: ['npm', 'github', 'url'] },
          sortBy: { type: 'string', enum: ['installs', 'rating', 'recent', 'name'] },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          page: { type: 'number' }, limit: { type: 'number' },
        },
      },
    },
    { name: 'get_marketplace_plugin', description: 'Get detailed information about a plugin.', inputSchema: { type: 'object', properties: { nameOrId: { type: 'string' } }, required: ['nameOrId'] } },
    { name: 'get_plugin_categories', description: 'List all available plugin categories.', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_featured_plugins', description: 'Get featured plugins from the marketplace.', inputSchema: { type: 'object', properties: {} } },
    {
      name: 'register_marketplace_plugin',
      description: 'Register a new plugin in the ThinkPrompt marketplace.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' }, displayName: { type: 'string' }, description: { type: 'string' },
          longDescription: { type: 'string' }, installSource: { type: 'string', enum: ['npm', 'github', 'url'] },
          npmPackage: { type: 'string' }, githubRepo: { type: 'string' }, installUrl: { type: 'string' },
          categoryId: { type: 'string' }, homepageUrl: { type: 'string' }, repositoryUrl: { type: 'string' },
          documentationUrl: { type: 'string' }, license: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'displayName', 'installSource'],
      },
    },
    { name: 'track_plugin_install', description: 'Track that a plugin was installed.', inputSchema: { type: 'object', properties: { nameOrId: { type: 'string' }, version: { type: 'string' }, source: { type: 'string' } }, required: ['nameOrId'] } },
    // Document Storage Tools
    {
      name: 'list_documents',
      description: 'List documents with optional filters.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string' }, folderId: { type: 'string' }, search: { type: 'string' },
          tagIds: { type: 'array', items: { type: 'string' } }, includeArchived: { type: 'boolean' },
          page: { type: 'number' }, limit: { type: 'number' }, compact: { type: 'boolean', description: 'Return compact response without content/frontmatter (default: true)' },
        },
      },
    },
    { name: 'get_document', description: 'Get a document by ID.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    {
      name: 'create_document',
      description: 'Create a new markdown document.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' }, content: { type: 'string' },
          frontmatter: { type: 'object', additionalProperties: true },
          folderId: { type: 'string' }, projectId: { type: 'string' },
          tagIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['title'],
      },
    },
    {
      name: 'update_document',
      description: 'Update a document.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' },
          frontmatter: { type: 'object', additionalProperties: true },
          folderId: { type: 'string' }, changeSummary: { type: 'string' },
        },
        required: ['id'],
      },
    },
    { name: 'delete_document', description: 'Archive a document.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    { name: 'search_documents', description: 'Full-text search across documents.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, projectId: { type: 'string' }, folderId: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } },
    { name: 'get_document_versions', description: 'Get the version history of a document.', inputSchema: { type: 'object', properties: { documentId: { type: 'string' } }, required: ['documentId'] } },
    { name: 'get_document_version', description: 'Get a specific version of a document.', inputSchema: { type: 'object', properties: { documentId: { type: 'string' }, version: { type: 'number' } }, required: ['documentId', 'version'] } },
    { name: 'restore_document_version', description: 'Restore a document to a previous version.', inputSchema: { type: 'object', properties: { documentId: { type: 'string' }, version: { type: 'number' } }, required: ['documentId', 'version'] } },
    { name: 'add_document_tags', description: 'Add tags to a document.', inputSchema: { type: 'object', properties: { documentId: { type: 'string' }, tagIds: { type: 'array', items: { type: 'string' } } }, required: ['documentId', 'tagIds'] } },
    { name: 'remove_document_tag', description: 'Remove a tag from a document.', inputSchema: { type: 'object', properties: { documentId: { type: 'string' }, tagId: { type: 'string' } }, required: ['documentId', 'tagId'] } },
    // Document Folder Tools
    { name: 'list_document_folders', description: 'List document folders.', inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, parentId: { type: 'string' }, includeArchived: { type: 'boolean' } } } },
    { name: 'get_document_folder_tree', description: 'Get hierarchical folder tree structure.', inputSchema: { type: 'object', properties: { projectId: { type: 'string' } } } },
    { name: 'get_document_folder', description: 'Get a document folder by ID.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    { name: 'create_document_folder', description: 'Create a new document folder.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, parentId: { type: 'string' }, projectId: { type: 'string' } }, required: ['name'] } },
    { name: 'update_document_folder', description: 'Update a document folder.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, parentId: { type: 'string' } }, required: ['id'] } },
    { name: 'delete_document_folder', description: 'Delete a document folder.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    { name: 'reorder_document_folders', description: 'Reorder document folders.', inputSchema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, sortOrder: { type: 'number' } }, required: ['id', 'sortOrder'] } } }, required: ['items'] } },
    // Requirement Tools
    {
      name: 'list_requirements',
      description: 'List requirements with optional filters.',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['draft', 'in_discovery', 'structured', 'quality_check', 'in_review', 'approved', 'exported'] },
          featureId: { type: 'string' }, tagId: { type: 'string' }, assigneeId: { type: 'string' },
          search: { type: 'string' }, includeArchived: { type: 'boolean' },
          sortBy: { type: 'string', enum: ['created_at', 'updated_at', 'display_id', 'quality_score'] },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          compact: { type: 'boolean', description: 'Return compact response (default: true)' },
        },
      },
    },
    { name: 'get_requirement', description: 'Get a single requirement by ID with full details.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    {
      name: 'create_requirement',
      description: 'Create a new requirement.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'object', properties: { overview: { type: 'string' }, background: { type: 'string' }, userStory: { type: 'string' }, businessValue: { type: 'string' }, affectedRoles: { type: 'array', items: { type: 'string' } }, successCriteria: { type: 'array', items: { type: 'string' } } } },
          scope: { type: 'object', properties: { inScope: { type: 'array', items: { type: 'string' } }, outOfScope: { type: 'array', items: { type: 'string' } }, assumptions: { type: 'array', items: { type: 'string' } }, constraints: { type: 'array', items: { type: 'string' } } } },
          featureId: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'in_discovery', 'structured', 'quality_check', 'in_review', 'approved', 'exported'] },
          tagIds: { type: 'array', items: { type: 'string' } },
          assigneeIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['title'],
      },
    },
    {
      name: 'update_requirement',
      description: 'Update an existing requirement.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' }, title: { type: 'string' },
          description: { type: 'object' }, scope: { type: 'object' },
          featureId: { type: 'string' },
          tagIds: { type: 'array', items: { type: 'string' } },
          assigneeIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['id'],
      },
    },
    {
      name: 'update_requirement_status',
      description: 'Update only the status of a requirement.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'in_discovery', 'structured', 'quality_check', 'in_review', 'approved', 'exported'] },
        },
        required: ['id', 'status'],
      },
    },
    { name: 'delete_requirement', description: 'Archive a requirement.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    { name: 'search_requirements', description: 'Full-text search requirements.', inputSchema: { type: 'object', properties: { q: { type: 'string' }, includeArchived: { type: 'boolean' } }, required: ['q'] } },
    // Acceptance Criteria Tools
    { name: 'list_acceptance_criteria', description: 'List acceptance criteria for a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' }, compact: { type: 'boolean' }, limit: { type: 'number' } }, required: ['requirementId'] } },
    {
      name: 'create_acceptance_criterion',
      description: 'Create a BDD-style acceptance criterion.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: { type: 'string' }, scenarioName: { type: 'string' },
          givenContext: { type: 'string' }, whenAction: { type: 'string' }, thenOutcome: { type: 'string' },
          type: { type: 'string', enum: ['positive', 'negative', 'edge_case'] },
          sortOrder: { type: 'number' },
        },
        required: ['requirementId', 'scenarioName', 'givenContext', 'whenAction', 'thenOutcome'],
      },
    },
    { name: 'update_acceptance_criterion', description: 'Update an existing acceptance criterion.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, scenarioName: { type: 'string' }, givenContext: { type: 'string' }, whenAction: { type: 'string' }, thenOutcome: { type: 'string' }, type: { type: 'string', enum: ['positive', 'negative', 'edge_case'] }, sortOrder: { type: 'number' } }, required: ['id'] } },
    { name: 'delete_acceptance_criterion', description: 'Delete an acceptance criterion.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    // Precondition Tools
    { name: 'list_preconditions', description: 'List preconditions for a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' }, compact: { type: 'boolean' }, limit: { type: 'number' } }, required: ['requirementId'] } },
    { name: 'create_precondition', description: 'Create a precondition for a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' }, category: { type: 'string', enum: ['technical_deps', 'data_requirements', 'env_config', 'architecture'] }, title: { type: 'string' }, description: { type: 'string' }, sortOrder: { type: 'number' } }, required: ['requirementId', 'category', 'title'] } },
    { name: 'update_precondition', description: 'Update an existing precondition.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, category: { type: 'string', enum: ['technical_deps', 'data_requirements', 'env_config', 'architecture'] }, title: { type: 'string' }, description: { type: 'string' }, isMet: { type: 'boolean' }, sortOrder: { type: 'number' } }, required: ['id'] } },
    { name: 'delete_precondition', description: 'Delete a precondition.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    // Verification Test Tools
    { name: 'list_verification_tests', description: 'List verification tests for a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' }, compact: { type: 'boolean' }, limit: { type: 'number' } }, required: ['requirementId'] } },
    {
      name: 'create_verification_test',
      description: 'Create a verification test for a requirement.',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: { type: 'string' }, testName: { type: 'string' },
          testType: { type: 'string', enum: ['unit', 'integration', 'e2e', 'manual', 'performance'] },
          description: { type: 'string' },
          steps: { type: 'array', items: { type: 'object', properties: { step: { type: 'number' }, action: { type: 'string' }, expected: { type: 'string' } }, required: ['step', 'action', 'expected'] } },
          expectedResult: { type: 'string' }, automationHint: { type: 'string' }, sortOrder: { type: 'number' },
        },
        required: ['requirementId', 'testName', 'testType'],
      },
    },
    { name: 'update_verification_test', description: 'Update an existing verification test.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, testName: { type: 'string' }, testType: { type: 'string', enum: ['unit', 'integration', 'e2e', 'manual', 'performance'] }, description: { type: 'string' }, steps: { type: 'array' }, expectedResult: { type: 'string' }, automationHint: { type: 'string' }, sortOrder: { type: 'number' } }, required: ['id'] } },
    { name: 'delete_verification_test', description: 'Delete a verification test.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    // Requirement Link Tools
    { name: 'list_requirement_links', description: 'List links for a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' }, limit: { type: 'number' } }, required: ['requirementId'] } },
    { name: 'create_requirement_link', description: 'Create a link between two requirements.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' }, targetRequirementId: { type: 'string' }, linkType: { type: 'string', enum: ['depends_on', 'blocks', 'related', 'parent', 'child'] }, description: { type: 'string' } }, required: ['requirementId', 'targetRequirementId', 'linkType'] } },
    { name: 'delete_requirement_link', description: 'Delete a requirement link.', inputSchema: { type: 'object', properties: { linkId: { type: 'string' } }, required: ['linkId'] } },
    // Requirement Comment Tools
    { name: 'list_requirement_comments', description: 'List threaded comments on a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' }, compact: { type: 'boolean' }, limit: { type: 'number' } }, required: ['requirementId'] } },
    { name: 'create_requirement_comment', description: 'Add a comment to a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' }, content: { type: 'string' }, parentCommentId: { type: 'string' }, commentLevel: { type: 'string', enum: ['requirement', 'section', 'element', 'inline'] }, sectionKey: { type: 'string' }, elementId: { type: 'string' }, mentionedUsers: { type: 'array', items: { type: 'string' } } }, required: ['requirementId', 'content', 'commentLevel'] } },
    { name: 'update_requirement_comment', description: 'Update a requirement comment.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, content: { type: 'string' }, status: { type: 'string', enum: ['open', 'resolved', 'wont_fix'] } }, required: ['id'] } },
    { name: 'delete_requirement_comment', description: 'Delete a requirement comment.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    // Requirement Tag Tools
    { name: 'add_requirement_tags', description: 'Add tags to a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' }, tagIds: { type: 'array', items: { type: 'string' } } }, required: ['requirementId', 'tagIds'] } },
    { name: 'remove_requirement_tag', description: 'Remove a tag from a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' }, tagId: { type: 'string' } }, required: ['requirementId', 'tagId'] } },
    { name: 'get_requirement_tags', description: 'Get all tags for a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' } }, required: ['requirementId'] } },
    // Requirement Quality Tools
    { name: 'calculate_requirement_quality', description: 'Calculate the quality score for a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' } }, required: ['requirementId'] } },
    { name: 'get_requirement_quality', description: 'Get the cached quality score for a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' } }, required: ['requirementId'] } },
    // Requirement Activity Tools
    { name: 'get_requirement_activity', description: 'Get the activity log for a requirement.', inputSchema: { type: 'object', properties: { requirementId: { type: 'string' }, limit: { type: 'number' } }, required: ['requirementId'] } },
] as const;

// ============================================================
// Tool call handler — shared logic for all server instances
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleToolCall(name: string, args: any) {
  switch (name) {
    case 'list_style_guides': {
      const result = await apiClient.listStyleGuides(args);
      return jsonResponse(result);
    }
    case 'get_style_guide': {
      const result = await apiClient.getStyleGuide(args.id);
      return jsonResponse(result);
    }
    case 'create_style_guide': {
      const { title, content, description, variables, isPublic } = args;
      const result = await apiClient.createStyleGuide({ title, content, description, variables, isPublic });
      return jsonResponse(result);
    }
    case 'update_style_guide': {
      const { id, title, content, description, variables, isPublic } = args;
      const result = await apiClient.updateStyleGuide(id, { title, content, description, variables, isPublic });
      return jsonResponse(result);
    }
    case 'list_workspaces': {
      const workspaces = await apiClient.listWorkspaces();
      const currentId = apiClient.getCurrentWorkspaceId();
      return jsonResponse({ currentWorkspaceId: currentId, workspaces });
    }
    case 'get_current_workspace': {
      const workspace = await apiClient.getCurrentWorkspace();
      if (!workspace) return jsonResponse({ message: 'No workspace selected or available' });
      return jsonResponse(workspace);
    }
    case 'switch_workspace': {
      const result = await apiClient.switchWorkspace(args.workspaceId);
      return jsonResponse(result);
    }
    case 'list_tags': return jsonResponse(await apiClient.listTags());
    case 'get_tag': return jsonResponse(await apiClient.getTag(args.id));
    case 'create_tag': return jsonResponse(await apiClient.createTag({ name: args.name, color: args.color }));
    case 'update_tag': return jsonResponse(await apiClient.updateTag(args.id, { name: args.name, color: args.color }));
    case 'delete_tag': { await apiClient.deleteTag(args.id); return successResponse('Tag deleted successfully'); }
    case 'list_projects': return jsonResponse(await apiClient.listProjects({ includeArchived: args.includeArchived }));
    case 'get_project': return jsonResponse(await apiClient.getProject(args.id));
    case 'get_project_statistics': return jsonResponse(await apiClient.getProjectStatistics(args.projectId));
    case 'create_project': return jsonResponse(await apiClient.createProject({ name: args.name, slug: args.slug, description: args.description, links: args.links }));
    case 'list_templates': return jsonResponse(await apiClient.listTemplates(args));
    case 'get_template': return jsonResponse(await apiClient.getTemplate(args.id));
    case 'create_template': {
      const { title, content, type, description, category, language, useCaseHints, isPublic, tagIds } = args;
      return jsonResponse(await apiClient.createTemplate({ title, content, type, description, category, language, useCaseHints, isPublic, tagIds }));
    }
    case 'update_template': {
      const { id, ...updateData } = args;
      return jsonResponse(await apiClient.updateTemplate(id, updateData));
    }
    case 'list_workflows': return jsonResponse(await apiClient.listWorkflows(args));
    case 'get_workflow': return jsonResponse(await apiClient.getWorkflow(args.id));
    case 'create_workflow': return jsonResponse(await apiClient.createWorkflow(args));
    case 'update_workflow': { const { id, ...data } = args; return jsonResponse(await apiClient.updateWorkflow(id, data)); }
    case 'delete_workflow': { await apiClient.deleteWorkflow(args.id); return successResponse('Workflow deleted'); }
    case 'validate_workflow': return jsonResponse(await apiClient.validateWorkflow(args.id));
    case 'get_workflow_executions': return jsonResponse(await apiClient.getWorkflowExecutions(args.workflowId, { page: args.page, limit: args.limit }));
    case 'get_workflow_execution': return jsonResponse(await apiClient.getWorkflowExecution(args.executionId));
    case 'search_marketplace_plugins': return jsonResponse(await apiClient.searchMarketplacePlugins(args));
    case 'get_marketplace_plugin': return jsonResponse(await apiClient.getMarketplacePlugin(args.nameOrId));
    case 'get_plugin_categories': return jsonResponse(await apiClient.getPluginCategories());
    case 'get_featured_plugins': return jsonResponse(await apiClient.getFeaturedPlugins());
    case 'register_marketplace_plugin': return jsonResponse(await apiClient.registerMarketplacePlugin(args));
    case 'track_plugin_install': return jsonResponse(await apiClient.trackPluginInstall(args.nameOrId, { version: args.version, source: args.source }));
    case 'list_documents': {
      const { compact = true, ...params } = args;
      const result = await apiClient.listDocuments(params);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseData = (result as any)?.data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const documents = Array.isArray(responseData) ? responseData : (responseData as any)?.data ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = Array.isArray(responseData) ? (result as any)?.meta : (responseData as any)?.meta;
      if (compact && documents.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const compactData = documents.map((doc: any) => { const { content, frontmatter, ...rest } = doc; return rest; });
        return jsonResponse({ data: compactData, meta });
      }
      return jsonResponse({ data: documents, meta });
    }
    case 'get_document': return jsonResponse(await apiClient.getDocument(args.id));
    case 'create_document': return jsonResponse(await apiClient.createDocument({ title: args.title, content: args.content, frontmatter: args.frontmatter, folderId: args.folderId, projectId: args.projectId, tagIds: args.tagIds }));
    case 'update_document': return jsonResponse(await apiClient.updateDocument(args.id, { title: args.title, content: args.content, frontmatter: args.frontmatter, folderId: args.folderId, changeSummary: args.changeSummary }));
    case 'delete_document': { await apiClient.deleteDocument(args.id); return successResponse('Document deleted (archived) successfully'); }
    case 'search_documents': return jsonResponse(await apiClient.searchDocuments({ query: args.query, projectId: args.projectId, folderId: args.folderId, limit: args.limit }));
    case 'get_document_versions': return jsonResponse(await apiClient.getDocumentVersions(args.documentId));
    case 'get_document_version': return jsonResponse(await apiClient.getDocumentVersion(args.documentId, args.version));
    case 'restore_document_version': return jsonResponse(await apiClient.restoreDocumentVersion(args.documentId, args.version));
    case 'add_document_tags': { await apiClient.addDocumentTags(args.documentId, args.tagIds); return successResponse('Tags added successfully'); }
    case 'remove_document_tag': { await apiClient.removeDocumentTag(args.documentId, args.tagId); return successResponse('Tag removed successfully'); }
    case 'list_document_folders': return jsonResponse(await apiClient.listDocumentFolders(args));
    case 'get_document_folder_tree': return jsonResponse(await apiClient.getDocumentFolderTree(args));
    case 'get_document_folder': return jsonResponse(await apiClient.getDocumentFolder(args.id));
    case 'create_document_folder': return jsonResponse(await apiClient.createDocumentFolder({ name: args.name, parentId: args.parentId, projectId: args.projectId }));
    case 'update_document_folder': return jsonResponse(await apiClient.updateDocumentFolder(args.id, { name: args.name, parentId: args.parentId }));
    case 'delete_document_folder': { await apiClient.deleteDocumentFolder(args.id); return successResponse('Folder deleted successfully'); }
    case 'reorder_document_folders': { await apiClient.reorderDocumentFolders({ items: args.items }); return successResponse('Folders reordered successfully'); }
    case 'list_requirements': {
      const { compact = true, ...params } = args;
      const rawResult = await apiClient.listRequirements(params as ListRequirementsQuery);
      if (compact) {
        const items = extractArray<Requirement>(rawResult);
        return jsonResponse(items.map(compactRequirement));
      }
      return jsonResponse(rawResult);
    }
    case 'get_requirement': return jsonResponse(await apiClient.getRequirement(args.id));
    case 'create_requirement': return jsonResponse(await apiClient.createRequirement(args as CreateRequirementInput));
    case 'update_requirement': { const { id, ...updateData } = args; return jsonResponse(await apiClient.updateRequirement(id, updateData as UpdateRequirementInput)); }
    case 'update_requirement_status': return jsonResponse(await apiClient.updateRequirementStatus(args.id, args.status));
    case 'delete_requirement': { await apiClient.deleteRequirement(args.id); return successResponse('Requirement archived successfully'); }
    case 'search_requirements': {
      const rawResult = await apiClient.searchRequirements({ q: args.q, includeArchived: args.includeArchived });
      const items = extractArray<Requirement>(rawResult);
      return jsonResponse(items.map(compactRequirement));
    }
    case 'list_acceptance_criteria': {
      const { requirementId, compact = true, limit = 50 } = args;
      const rawResult = await apiClient.listAcceptanceCriteria(requirementId);
      let items = extractArray<AcceptanceCriterion>(rawResult);
      if (items.length > limit) items = items.slice(0, limit);
      if (compact) return jsonResponse(items.map(compactAcceptanceCriterion));
      return jsonResponse(items);
    }
    case 'create_acceptance_criterion': {
      const { requirementId, scenarioName, givenContext, whenAction, thenOutcome, type, sortOrder } = args;
      return jsonResponse(await apiClient.createAcceptanceCriterion(requirementId, { scenarioName, givenContext, whenAction, thenOutcome, type, sortOrder }));
    }
    case 'update_acceptance_criterion': { const { id, ...data } = args; return jsonResponse(await apiClient.updateAcceptanceCriterion(id, data)); }
    case 'delete_acceptance_criterion': { await apiClient.deleteAcceptanceCriterion(args.id); return successResponse('Acceptance criterion deleted successfully'); }
    case 'list_preconditions': {
      const { requirementId, compact = true, limit = 50 } = args;
      const raw = await apiClient.listPreconditions(requirementId);
      let items = extractArray<Precondition>(raw);
      if (items.length > limit) items = items.slice(0, limit);
      if (compact) return jsonResponse(items.map(compactPrecondition));
      return jsonResponse(items);
    }
    case 'create_precondition': {
      const { requirementId, category, title, description, sortOrder } = args;
      return jsonResponse(await apiClient.createPrecondition(requirementId, { category, title, description, sortOrder }));
    }
    case 'update_precondition': { const { id, ...data } = args; return jsonResponse(await apiClient.updatePrecondition(id, data)); }
    case 'delete_precondition': { await apiClient.deletePrecondition(args.id); return successResponse('Precondition deleted successfully'); }
    case 'list_verification_tests': {
      const { requirementId, compact = true, limit = 50 } = args;
      const raw = await apiClient.listVerificationTests(requirementId);
      let items = extractArray<VerificationTest>(raw);
      if (items.length > limit) items = items.slice(0, limit);
      if (compact) return jsonResponse(items.map(compactVerificationTest));
      return jsonResponse(items);
    }
    case 'create_verification_test': {
      const { requirementId, testName, testType, description, steps, expectedResult, automationHint, sortOrder } = args;
      return jsonResponse(await apiClient.createVerificationTest(requirementId, { testName, testType, description, steps, expectedResult, automationHint, sortOrder }));
    }
    case 'update_verification_test': { const { id, ...data } = args; return jsonResponse(await apiClient.updateVerificationTest(id, data)); }
    case 'delete_verification_test': { await apiClient.deleteVerificationTest(args.id); return successResponse('Verification test deleted successfully'); }
    case 'list_requirement_links': {
      const { requirementId, limit = 50 } = args;
      const raw = await apiClient.listRequirementLinks(requirementId);
      let items = extractArray(raw);
      if (items.length > limit) items = items.slice(0, limit);
      return jsonResponse(items);
    }
    case 'create_requirement_link': return jsonResponse(await apiClient.createRequirementLink(args.requirementId, { targetRequirementId: args.targetRequirementId, linkType: args.linkType, description: args.description }));
    case 'delete_requirement_link': { await apiClient.deleteRequirementLink(args.linkId); return successResponse('Requirement link deleted successfully'); }
    case 'list_requirement_comments': {
      const { requirementId, compact = true, limit = 50 } = args;
      const raw = await apiClient.listRequirementComments(requirementId);
      let items = extractArray<RequirementComment>(raw);
      if (items.length > limit) items = items.slice(0, limit);
      if (compact) return jsonResponse(items.map(compactRequirementComment));
      return jsonResponse(items);
    }
    case 'create_requirement_comment': {
      const { requirementId, content, parentCommentId, commentLevel, sectionKey, elementId, mentionedUsers } = args;
      return jsonResponse(await apiClient.createRequirementComment(requirementId, { content, parentCommentId, commentLevel, sectionKey, elementId, mentionedUsers }));
    }
    case 'update_requirement_comment': { const { id, ...data } = args; return jsonResponse(await apiClient.updateRequirementComment(id, data)); }
    case 'delete_requirement_comment': { await apiClient.deleteRequirementComment(args.id); return successResponse('Comment deleted successfully'); }
    case 'add_requirement_tags': { await apiClient.addRequirementTags(args.requirementId, args.tagIds); return successResponse('Tags added to requirement successfully'); }
    case 'remove_requirement_tag': { await apiClient.removeRequirementTag(args.requirementId, args.tagId); return successResponse('Tag removed from requirement successfully'); }
    case 'get_requirement_tags': return jsonResponse(await apiClient.getRequirementTags(args.requirementId));
    case 'calculate_requirement_quality': return jsonResponse(await apiClient.calculateRequirementQuality(args.requirementId));
    case 'get_requirement_quality': return jsonResponse(await apiClient.getRequirementQuality(args.requirementId));
    case 'get_requirement_activity': {
      const { requirementId, limit = 50 } = args;
      const raw = await apiClient.getRequirementActivity(requirementId);
      let items = extractArray(raw);
      if (items.length > limit) items = items.slice(0, limit);
      return jsonResponse(items);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ============================================================
// Resource read handler — shared logic
// ============================================================
async function handleResourceRead(uri: string) {
  if (uri.startsWith('style-guide://')) {
    const styleGuideId = uri.replace('style-guide://', '');
    const styleGuide = await apiClient.getStyleGuide(styleGuideId);
    const content = `# ${styleGuide.title}\n\n${styleGuide.description ?? ''}\n\n## Content\n${styleGuide.content}\n\n## Variables\n${styleGuide.variables.length > 0 ? styleGuide.variables.map((v) => `- **${v.name}** (${v.type}): ${v.description ?? 'No description'}`).join('\n') : 'No variables required'}\n\n## Statistics\n- Usage count: ${styleGuide.usageCount}\n- Created: ${styleGuide.createdAt}\n- Updated: ${styleGuide.updatedAt}\n`;
    return { contents: [{ uri, mimeType: 'text/plain', text: content }] };
  }
  if (uri.startsWith('template://')) {
    const templateId = uri.replace('template://', '');
    const template = await apiClient.getTemplate(templateId);
    const content = `# ${template.title}\n**Type:** ${template.type === 'example' ? 'Example Prompt' : 'Style Guide'}\n${template.category ? `**Category:** ${template.category}` : ''}\n${template.language ? `**Language:** ${template.language}` : ''}\n\n${template.description ?? ''}\n\n## Content\n${template.content}\n\n${template.useCaseHints && template.useCaseHints.length > 0 ? `## When to Use This Template\n${template.useCaseHints.map((hint) => `- ${hint}`).join('\n')}` : ''}\n\n${template.tags && template.tags.length > 0 ? `## Tags\n${template.tags.map((tag) => `- ${tag.name}`).join('\n')}` : ''}\n\n## Statistics\n- Usage count: ${template.usageCount}\n- Created: ${template.createdAt}\n- Updated: ${template.updatedAt}\n`;
    return { contents: [{ uri, mimeType: 'text/plain', text: content }] };
  }
  if (uri.startsWith('workflow://')) {
    const workflowId = uri.replace('workflow://', '');
    const workflow = await apiClient.getWorkflow(workflowId);
    const resourceList = workflow.resources.length > 0
      ? workflow.resources.map((r) => `- [${r.resourceType.toUpperCase()}] ${r.alias ?? r.resourceId}`).join('\n')
      : 'No resources attached';
    const stepList = workflow.steps.length > 0
      ? workflow.steps.map((s) => { const ci = s.condition ? ` (condition: ${s.conditionType})` : ''; return `${s.stepNumber}. **${s.title}**: ${s.actionType}${ci}`; }).join('\n')
      : 'No steps defined';
    const content = `# ${workflow.title}\n\n## Description\n${workflow.description ?? 'No description'}\n\n${workflow.customInstructions ? `## Custom Instructions\n${workflow.customInstructions}\n` : ''}## Status\n- **Status:** ${workflow.status}\n- **Version:** ${workflow.version}\n- **Public:** ${workflow.isPublic ? 'Yes' : 'No'}\n${workflow.category ? `- **Category:** ${workflow.category}` : ''}\n\n## Resources (${workflow.resources.length})\n${resourceList}\n\n## Steps (${workflow.steps.length})\n${stepList}\n\n${workflow.tags && workflow.tags.length > 0 ? `## Tags\n${workflow.tags.map((tag) => `- ${tag.name}`).join('\n')}` : ''}\n\n## Statistics\n- Usage count: ${workflow.usageCount}\n${workflow.lastUsedAt ? `- Last used: ${workflow.lastUsedAt}` : ''}\n- Created: ${workflow.createdAt}\n- Updated: ${workflow.updatedAt}\n`;
    return { contents: [{ uri, mimeType: 'text/plain', text: content }] };
  }
  throw new Error(`Unknown resource URI: ${uri}`);
}

// ============================================================
// Server factory — creates a new Server with all handlers
// ============================================================
function createServer(): Server {
  const server = new Server(
    { name: '@honeyfield/thinkprompt-mcp', version: '1.7.0' },
    { capabilities: { tools: {}, resources: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOL_DEFINITIONS] }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      return await handleToolCall(name, args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      const [styleGuidesResult, templatesResult, workflowsResult] = await Promise.all([
        apiClient.listStyleGuides({ limit: 100 }),
        apiClient.listTemplates({ limit: 100 }),
        apiClient.listWorkflows({ limit: 100 }),
      ]);
      const styleGuideResources = styleGuidesResult.data.map((sg) => ({ uri: `style-guide://${sg.id}`, name: sg.title, description: sg.description ?? undefined, mimeType: 'text/plain' }));
      const templateResources = templatesResult.data.map((t) => ({ uri: `template://${t.id}`, name: `[${t.type}] ${t.title}`, description: t.description ?? `${t.type} template${t.category ? ` for ${t.category}` : ''}`, mimeType: 'text/plain' }));
      const workflowResources = workflowsResult.data.map((w) => ({ uri: `workflow://${w.id}`, name: `[WORKFLOW] ${w.title}`, description: w.description ?? `Workflow with ${w.resources.length} resources and ${w.steps.length} steps`, mimeType: 'text/plain' }));
      return { resources: [...styleGuideResources, ...templateResources, ...workflowResources] };
    } catch { return { resources: [] }; }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    return handleResourceRead(request.params.uri);
  });

  return server;
}

// ============================================================
// API Key auth middleware for HTTP mode
// ============================================================
function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  if (!MCP_API_KEY) {
    // No API key configured — skip auth (local dev)
    next();
    return;
  }
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
  let providedKey: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7);
  } else if (apiKeyHeader) {
    providedKey = apiKeyHeader;
  }
  if (providedKey === MCP_API_KEY) {
    next();
    return;
  }
  res.status(401).json({ error: 'Unauthorized: invalid or missing API key' });
}

// ============================================================
// Main — stdio vs HTTP
// ============================================================
async function main() {
  const useStdio = process.argv.includes('--stdio');

  if (useStdio) {
    // Stdio mode (for Claude Desktop, local usage)
    if (!API_KEY) {
      console.error('Error: THINKPROMPT_API_KEY environment variable is required');
      process.exit(1);
    }
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('ThinkPrompt MCP Server running on stdio');
    return;
  }

  // HTTP mode (Streamable HTTP for remote deployment)
  if (!API_KEY) {
    console.error('Warning: THINKPROMPT_API_KEY not set — API calls will fail');
  }

  const app = express();
  app.use(express.json());

  // Health check (no auth)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', server: '@honeyfield/thinkprompt-mcp', version: '1.7.0' });
  });

  // Session management
  const transports: Map<string, StreamableHTTPServerTransport> = new Map();

  // POST /mcp — main MCP endpoint
  app.post('/mcp', apiKeyAuth, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      const server = createServer();

      transport.onclose = () => {
        // Find and remove session from map
        for (const [sid, t] of transports.entries()) {
          if (t === transport) {
            transports.delete(sid);
            break;
          }
        }
      };

      await server.connect(transport);

      // After connect, the transport should have a sessionId
      // We handle the request which will set the session id header in the response
      await transport.handleRequest(req, res, req.body);

      // Extract session id from response headers
      const newSessionId = res.getHeader('mcp-session-id') as string | undefined;
      if (newSessionId) {
        transports.set(newSessionId, transport);
      }
      return;
    }

    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Bad Request: No valid session ID provided. Send an initialize request first.' },
      id: null,
    });
  });

  // GET /mcp — SSE endpoint for Streamable HTTP
  app.get('/mcp', apiKeyAuth, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: 'Invalid or missing session ID' });
      return;
    }
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // DELETE /mcp — session cleanup
  app.delete('/mcp', apiKeyAuth, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.close();
      transports.delete(sessionId);
    }
    res.status(200).json({ success: true });
  });

  app.listen(PORT, () => {
    console.log(`ThinkPrompt MCP Server (Streamable HTTP) listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
    if (MCP_API_KEY) {
      console.log('API key authentication: ENABLED');
    } else {
      console.log('API key authentication: DISABLED (set MCP_API_KEY to enable)');
    }
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
