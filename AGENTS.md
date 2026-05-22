# Workspace agents

## n8n Workflow Builder (expert)

**Skill:** `.cursor/skills/n8n-workflow-builder/SKILL.md`

Use this agent when you want to build or fix n8n automations without knowing nodes or JSON.

### How to invoke

In Cursor chat, describe your goal in plain language, for example:

```text
Buat workflow n8n: kalau ada email masuk dengan label "Invoice", simpan attachment ke Google Drive folder Finance, lalu kirim notif Slack #finance.
```

Or explicitly:

```text
Pakai skill n8n-workflow-builder: [goal Anda]
```

Ensure the **n8n MCP server** is connected in Cursor (Settings → MCP).

### What you provide (minimal)

- **Goal** — what should happen end-to-end
- **Trigger** — what starts it (time, email, form, webhook, manual)
- **Systems** — Gmail, Sheets, Slack, etc.
- **On failure** — ignore, retry, or notify you
- **Credentials** — already connected in n8n or not

The agent chooses optimal nodes, validates, deploys, tests, and reports back in simple language.

### Related files

- Example SDK workflow in repo: `n8n-workflow-photo-expand.js`
- Cursor rule (auto-hint): `.cursor/rules/n8n-workflow-builder.mdc`
