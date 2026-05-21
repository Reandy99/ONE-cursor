# Workflow update: PDF + Telegram

Workflow ID: `E7bMzLuWKui9CovW`

## New nodes (after Append to Google Sheets)

1. **Generate HTML Report** — builds HTML table from Prepare Rows
2. **Create Google Doc** — Google Drive createFromText + convertToGoogleDocument
3. **Export PDF** — Google Drive download as application/pdf
4. **Send PDF to Telegram** — sendDocument to chat `8637267690` (or `telegram_chat_id` in webhook body)

## Delivery

- Default Telegram chat: `8637267690` (same as other Whitepaper workflows)
- Optional webhook body: `{ "telegram_chat_id": "YOUR_CHAT_ID" }`
