# ThinkPrompt MCP Server

> Model Context Protocol server for [ThinkPrompt](https://thinkprompt.ai) — connect Claude, Cursor, and other AI tools to your team\'s coding standards, requirements, and project management.

[![npm version](https://img.shields.io/npm/v/@honeyfield/thinkprompt-mcp.svg)](https://www.npmjs.com/package/@honeyfield/thinkprompt-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

The ThinkPrompt MCP Server implements the [Model Context Protocol](https://modelcontextprotocol.io/) to bridge AI assistants with the ThinkPrompt platform. It provides **85 tools** that let AI agents manage style guides, requirements, projects, documents, workflows, and more — all from within your IDE.

## Installation

No installation required! The MCP server runs via `npx`:

```bash
npx @honeyfield/thinkprompt-mcp
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `THINKPROMPT_API_URL` | ThinkPrompt API base URL | Yes |
| `THINKPROMPT_API_KEY` | API key (create at thinkprompt.ai/settings) | Yes |

### Claude Code / Cursor

Add to your project\'s `.mcp.json` or global Claude settings:

```json
{
  "mcpServers": {
    "thinkprompt": {
      "command": "npx",
      "args": ["@honeyfield/thinkprompt-mcp"],
      "env": {
        "THINKPROMPT_API_URL": "https://thinkprompt-api-v2.azurewebsites.net/api/v1",
        "THINKPROMPT_API_KEY": "tp_your-api-key-here"
      }
    }
  }
}
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "thinkprompt": {
      "command": "npx",
      "args": ["@honeyfield/thinkprompt-mcp"],
      "env": {
        "THINKPROMPT_API_URL": "https://thinkprompt-api-v2.azurewebsites.net/api/v1",
        "THINKPROMPT_API_KEY": "tp_your-api-key-here"
      }
    }
  }
}
```

## Available Tools (85)

### Style Guides (4)
`list_style_guides` · `get_style_guide` · `create_style_guide` · `update_style_guide`

### Templates (4)
`list_templates` · `get_template` · `create_template` · `update_template`

### Workspaces (3)
`list_workspaces` · `get_current_workspace` · `switch_workspace`

### Tags (5)
`list_tags` · `get_tag` · `create_tag` · `update_tag` · `delete_tag`

### Projects (4)
`list_projects` · `get_project` · `get_project_statistics` · `create_project`

### Workflows (8)
`list_workflows` · `get_workflow` · `create_workflow` · `update_workflow` · `delete_workflow` · `validate_workflow` · `get_workflow_executions` · `get_workflow_execution`

### Plugin Marketplace (6)
`search_marketplace_plugins` · `get_marketplace_plugin` · `get_plugin_categories` · `get_featured_plugins` · `register_marketplace_plugin` · `track_plugin_install`

### Documents (13)
`list_documents` · `get_document` · `create_document` · `update_document` · `delete_document` · `search_documents` · `get_document_versions` · `get_document_version` · `restore_document_version` · `add_document_tags` · `remove_document_tag` · `list_document_folders` · `get_document_folder_tree`

### Document Folders (5)
`get_document_folder` · `create_document_folder` · `update_document_folder` · `delete_document_folder` · `reorder_document_folders`

### Requirements (20)
`list_requirements` · `get_requirement` · `create_requirement` · `update_requirement` · `update_requirement_status` · `delete_requirement` · `search_requirements` · `list_acceptance_criteria` · `create_acceptance_criterion` · `update_acceptance_criterion` · `delete_acceptance_criterion` · `list_preconditions` · `create_precondition` · `update_precondition` · `delete_precondition` · `list_verification_tests` · `create_verification_test` · `update_verification_test` · `delete_verification_test` · `list_requirement_links`

### Requirement Sub-entities (13)
`create_requirement_link` · `delete_requirement_link` · `list_requirement_comments` · `create_requirement_comment` · `update_requirement_comment` · `delete_requirement_comment` · `add_requirement_tags` · `remove_requirement_tag` · `get_requirement_tags` · `calculate_requirement_quality` · `get_requirement_quality` · `get_requirement_activity` · *and more*

## Resources

Prompts are also provided as MCP Resources under `prompt://{id}`.

## Example Usage

```
“Show me all style guides in my workspace”
“Create a requirement for user authentication with acceptance criteria”
“List all documents in the project”
“Switch to workspace \'frontend-team\'”
“Search requirements matching \'payment\'”
```

## Development

```bash
git clone https://github.com/Honeyfield-Org/thinkprompt-mcp.git
cd thinkprompt-mcp
pnpm install

# Development with hot-reload
pnpm dev

# Build
pnpm build

# Test with MCP Inspector
pnpm inspect
```

### Project Structure

```
src/
├── index.ts          # MCP server entry point (tool definitions & handlers)
└── api-client.ts     # ThinkPrompt API client
```

## Troubleshooting

| Issue | Solution |
|---|---|
| Tools not appearing | Restart Claude / Cursor after saving config |
| Authentication errors | Verify your API key at thinkprompt.ai/settings |
| Connection timeout | Check that the API URL is accessible |
| `npx` not found | Ensure Node.js (v18+) is installed and in PATH |

## Related Repos

- [thinkprompt-frontend](https://github.com/Honeyfield-Org/thinkprompt-frontend) — Next.js Frontend
- [thinkprompt-api](https://github.com/Honeyfield-Org/thinkprompt-api) — NestJS Backend API
- [thinkprompt-plugin](https://github.com/Honeyfield-Org/thinkprompt-plugin) — Claude Code Plugin

## License

MIT — © [Honeyfield GmbH](https://honeyfield.at)
