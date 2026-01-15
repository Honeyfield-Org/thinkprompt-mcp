# ThinkPrompt MCP Server

MCP (Model Context Protocol) Server for ThinkPrompt - enables Claude and other AI tools to directly access the prompt management and project management system.

## Features

- 📝 **Prompt Management** - Create, manage, and execute prompts with variables
- 📋 **Template Library** - Example prompts and writing style guides
- 🔄 **Workflow Automation** - Combine prompts, templates, and tasks into reusable sequences
- 📊 **Project Management** - Full project, feature, and task tracking
- 🤖 **AI Generation** - Generate tasks from features and features from documents
- 🔍 **Quality Analytics** - Code quality tracking with ESLint, TypeScript, coverage metrics
- 🧪 **Test Analytics** - QA session tracking with Playwright integration
- 🔌 **Plugin Marketplace** - Browse and publish Claude Code plugins

## Installation

No installation required! The MCP server runs via `npx` - just configure it in your Claude settings (see Configuration below).

## Configuration

The MCP Server requires two environment variables:

- `THINKPROMPT_API_URL`: URL of the ThinkPrompt API
- `THINKPROMPT_API_KEY`: API key for authentication (create under `/api-keys`)

## Claude Desktop Integration

Add the following to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

## Using ThinkPrompt MCP with Claude Desktop

### Getting Started

1. **Get your API Key**: Log into ThinkPrompt and navigate to `/api-keys` to create a new API key
2. **Configure Claude Desktop**: Add the configuration above to your `claude_desktop_config.json` file, replacing `tp_your-api-key-here` with your actual API key
3. **Restart Claude Desktop**: Close and reopen Claude Desktop to load the MCP server
4. **Verify Connection**: In Claude Desktop, you should see the ThinkPrompt tools available. Try asking Claude: "List my workspaces" or "Show me all projects"

### How It Works

Once configured, Claude Desktop will automatically connect to the ThinkPrompt MCP server. You can then interact with ThinkPrompt directly through natural language:

- Ask Claude to list, create, or manage prompts
- Request project and task information
- Generate tasks from features using AI
- Track code quality and test sessions
- Browse the plugin marketplace

The MCP server acts as a bridge between Claude and the ThinkPrompt API, translating your requests into API calls and returning the results in a conversational format.

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Tools not appearing | Restart Claude Desktop after saving config |
| Authentication errors | Verify your API key is correct and active |
| Connection timeout | Check that the API URL is accessible |
| "npx not found" | Ensure Node.js (v18+) is installed and in PATH |

## Available Tools

### Prompt Management

| Tool | Description |
|------|-------------|
| `list_prompts` | List all prompts (with search and filter) |
| `get_prompt` | Get single prompt with details |
| `execute_prompt` | Execute prompt with variables |
| `get_prompt_variables` | Get variables of a prompt |
| `create_prompt` | Create a new prompt |
| `update_prompt` | Update an existing prompt |

### Workspace Management

| Tool | Description |
|------|-------------|
| `list_workspaces` | List all workspaces the user belongs to |
| `get_current_workspace` | Get the currently active workspace |
| `switch_workspace` | Switch to a different workspace |

### Project Management

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects in the current workspace |
| `get_project` | Get detailed information about a project |
| `get_project_statistics` | Get dashboard statistics for a project |
| `create_project` | Create a new project |

### Feature Management

| Tool | Description |
|------|-------------|
| `list_features` | List all features/epics in a project (hierarchical) |
| `create_feature` | Create a new feature/epic |
| `update_feature_status` | Update the status of a feature |
| `get_feature_history` | Get the change history of a feature |
| `add_feature_comment` | Add a comment to a feature |
| `list_feature_comments` | List all comments on a feature |

### AI Generation

| Tool | Description |
|------|-------------|
| `generate_tasks_from_feature` | Generate development tasks from a feature using AI |
| `generate_tasks_bulk` | Generate tasks from all "ready_for_dev" features in a project |
| `generate_features_from_document` | Generate features from a document/transcription using AI |

### Task Management

| Tool | Description |
|------|-------------|
| `list_tasks` | List tasks with optional filters |
| `get_task` | Get task by ID or Kürzel (e.g., "TP-001") |
| `create_task` | Create a new task in a project |
| `update_task` | Update an existing task |
| `update_task_status` | Quick update of task status |
| `ai_edit_task` | Edit task content using AI |
| `add_task_comment` | Add a comment to a task |
| `list_task_comments` | List all comments on a task |
| `get_task_history` | Get the change history of a task |

### Template Management

| Tool | Description |
|------|-------------|
| `list_templates` | Browse example prompts and style guides |
| `get_template` | Get template details and use case hints |
| `create_template` | Create a new template (example or style guide) |
| `update_template` | Update an existing template |

### Workflow Management

| Tool | Description |
|------|-------------|
| `list_workflows` | List automation workflows |
| `get_workflow` | Get workflow details with steps and resources |
| `create_workflow` | Create workflow combining prompts, templates, tasks |
| `update_workflow` | Update an existing workflow |
| `delete_workflow` | Delete a workflow |
| `validate_workflow` | Check workflow configuration |
| `get_workflow_executions` | Get execution history for a workflow |
| `get_workflow_execution` | Get details of a specific execution |

### Quality Analytics

| Tool | Description |
|------|-------------|
| `start_quality_analysis` | Begin a quality snapshot for a project |
| `record_quality_metric` | Store ESLint, TypeScript, coverage, complexity metrics |
| `report_quality_issue` | Report code quality issues with location and severity |
| `bulk_report_quality_issues` | Report multiple issues at once |
| `complete_quality_analysis` | Finalize analysis and calculate scores |
| `delete_quality_snapshot` | Delete a quality snapshot |
| `get_quality_overview` | Get dashboard with scores, trends, and issue breakdown |
| `get_quality_trends` | Get metric trends over time |
| `list_quality_snapshots` | List quality snapshots for a project |
| `list_quality_issues` | List code quality issues with filters |

### Test Analytics

| Tool | Description |
|------|-------------|
| `start_test_session` | Start tracking QA/Playwright testing session |
| `record_metric` | Log network requests, console messages, interactions |
| `report_issue` | Document bugs with screenshots and environment info |
| `end_test_session` | Complete session and get summary |
| `list_test_sessions` | List test sessions with filters |
| `get_test_session` | Get session details with metrics |
| `list_test_issues` | List test issues with filters |
| `get_test_issue` | Get details of a specific test issue |
| `update_test_issue` | Update issue status or details |

### Plugin Marketplace

| Tool | Description |
|------|-------------|
| `search_marketplace_plugins` | Find Claude Code plugins by category, keywords |
| `get_marketplace_plugin` | Get plugin details and install instructions |
| `get_plugin_categories` | List all available plugin categories |
| `get_featured_plugins` | Get featured/highlighted plugins |
| `register_marketplace_plugin` | Publish a new plugin to the marketplace |
| `track_plugin_install` | Track plugin installation for statistics |

## Resources

Prompts are also provided as Resources under `prompt://{id}`.

## Example Usage in Claude

### Prompt Management
```
Show me all available prompts with the tag "marketing"
```

```
Execute the prompt "blog-article-generator" with:
- topic: "AI in Sales"
- tone: "professional"
```

### Project & Task Management
```
List all projects in my workspace
```

```
Show me all open tasks in project "Website Redesign"
```

```
Create a new feature "User Authentication" in project TP
```

```
Generate development tasks from feature "Login System"
```

```
Update task TP-042 status to "in_progress"
```

### Quality Analytics
```
Run a quality analysis on the current project and store results
```

```
Show me the quality trends for the last 30 days
```

```
List all high-severity code quality issues
```

### Test Analytics
```
Start a test session for the homepage testing
```

```
Report a bug found during testing with screenshot
```

```
Show me all test issues from the last session
```

### Workflows
```
List all available workflows
```

```
Create a workflow that combines the "code-review" template with task generation
```

## Development

```bash
# Develop with hot-reload
npm run dev

# Test with MCP Inspector
npm run inspect
```
