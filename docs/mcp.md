# MCP Server Setup

Connect your AI assistant to Changebot and it can draft, publish, and manage
your changelog for you — compose an update in conversation, publish it to your
hosted changelog, Slack, or Discord, customize the changelog's design, and set
up a custom domain, all without leaving your editor or chat.

The server lives at:

```
https://app.changebot.ai/mcp
```

Authentication is OAuth: the first connection opens a browser window where you
sign in (or create an account — signup works right inside the flow). No API
keys to manage.

## Claude Code

```bash
claude mcp add --transport http changebot https://app.changebot.ai/mcp
```

Then run `/mcp` inside Claude Code and pick **changebot** to authenticate.

## Claude Desktop / claude.ai

Go to **Settings → Connectors → Add custom connector** and enter
`https://app.changebot.ai/mcp`. Claude walks you through the sign-in.

## Cursor

Add to `~/.cursor/mcp.json` (or per-project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "changebot": {
      "url": "https://app.changebot.ai/mcp"
    }
  }
}
```

Cursor prompts you to authenticate in the browser on first use.

## ChatGPT

Enable **developer mode** (Settings → Connectors → Advanced), then add a
connector with the URL `https://app.changebot.ai/mcp`.

## VS Code (GitHub Copilot)

Run **MCP: Add Server** from the command palette, choose **HTTP**, and enter
`https://app.changebot.ai/mcp`.

## What the tools can do

- **Discover** — `list_products` returns your teams, products, and changelog
  URLs; every other tool takes ids/slugs from it.
- **Compose** — `create_customer_update` takes markdown and creates a private
  draft; `update_customer_update`, `archive_customer_update`, and
  `restore_customer_update` manage the lifecycle. Reading past updates
  (`read_customer_update`) helps your assistant match your changelog's voice.
- **Publish** — `publish_customer_update` pushes an update to the
  destinations you choose (when a team has exactly one enabled destination,
  the choice is implicit). Hosted changelog and widget publishes return live
  URLs immediately; Slack, Discord, and Webflow complete in the background.
  `sync_publications` pushes edits to already-published copies;
  `unpublish_customer_update` takes them down.
- **Configure** — `create_destination` / `update_destination` manage your
  hosted changelog (title, colors, design, logo), widget, Slack, and Discord
  destinations. `add_custom_domain` returns the DNS records to create — if
  your assistant can manage your DNS (say, through a Cloudflare integration),
  it can create them itself and poll `check_custom_domain` until your domain
  is live.

## Limitations

- Images and file attachments in update bodies are not supported over MCP —
  use the web editor for those.
- Webflow destinations are created and edited in the web app; MCP can list
  and publish to them.
- Publishing to Slack/Discord requires the workspace/server to be connected
  in the web app first (the tools link you there when needed).
