# ThinkPrompt MCP Server

MCP (Model Context Protocol) Server für ThinkPrompt - ermöglicht Claude und anderen AI-Tools den direkten Zugriff auf das Prompt-Management-System.

## Installation

```bash
cd thinkprompt-mcp
npm install
npm run build
```

## Konfiguration

Der MCP Server benötigt zwei Umgebungsvariablen:

- `THINKPROMPT_API_URL`: URL der ThinkPrompt API (z.B. `https://api.thinkprompt.app/api/v1`)
- `THINKPROMPT_API_KEY`: API-Key für die Authentifizierung (erstellen unter `/api-keys`)

## Claude Desktop Integration

Füge folgendes zu deiner `claude_desktop_config.json` hinzu:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "thinkprompt": {
      "command": "node",
      "args": ["/absoluter/pfad/zu/thinkprompt-mcp/dist/index.js"],
      "env": {
        "THINKPROMPT_API_URL": "https://api.thinkprompt.app/api/v1",
        "THINKPROMPT_API_KEY": "tp_dein-api-key-hier"
      }
    }
  }
}
```

## Verfügbare Tools

| Tool | Beschreibung |
|------|--------------|
| `list_prompts` | Alle Prompts auflisten (mit Suche und Filter) |
| `get_prompt` | Einzelnen Prompt mit Details abrufen |
| `execute_prompt` | Prompt mit Variablen ausführen |
| `get_prompt_variables` | Variablen eines Prompts abrufen |

## Resources

Prompts werden auch als Resources unter `prompt://{id}` bereitgestellt.

## Beispiel-Nutzung in Claude

```
Zeige mir alle verfügbaren Prompts mit dem Tag "marketing"
```

```
Führe den Prompt "blog-artikel-generator" aus mit:
- topic: "KI im Vertrieb"
- tone: "professionell"
```

## Development

```bash
# Mit Hot-Reload entwickeln
npm run dev

# Mit MCP Inspector testen
npm run inspect
```
