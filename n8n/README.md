# Join n8n workflows

This directory contains credential-free workflow exports for the Join Issue Collector.

## MVP workflow

Import [`workflows/join-issue-collector-mvp.json`](workflows/join-issue-collector-mvp.json) into n8n 2.32.6 or newer. The workflow intentionally contains no Gmail, Firebase or AI credentials.

Before the first execution:

1. In Gmail account `8245oleg@gmail.com`, create the labels `erledigt` and `zu bearbeiten`.
2. Create a Gmail OAuth2 credential in n8n and select it in every Gmail node, including **Send Success Confirmation** and **Send Processing Error**.
3. In the two **Add label** nodes, replace the placeholder label values by selecting the matching Gmail labels from the n8n dropdown.
4. Confirm that **Create Triage Task** points to the correct Firebase Realtime Database test project.
5. Create a **Google Gemini (PaLM) API** credential in n8n and select it in **Analyze Email with Gemini**.
6. Keep the workflow inactive and use **Execute workflow** with a non-sensitive test email first.

The Gmail Trigger accepts only messages delivered to the dedicated alias
`8245oleg+join@gmail.com`. The subject can be written normally, for example
`Add dark mode`; unrelated messages delivered to the main inbox are ignored.

### Gmail OAuth2 for local Docker

Self-hosted n8n requires a custom Google OAuth client:

1. Create or select a project in Google Cloud Console.
2. Enable the Gmail API.
3. Configure the OAuth consent screen as **External** and add `8245oleg@gmail.com` as a test user while the app is in testing mode.
4. Create an OAuth client with application type **Web application**.
5. Add the exact redirect URL displayed by the n8n Gmail credential. For the current local Docker setup it should be `http://localhost:5678/rest/oauth2-credential/callback`.
6. Paste the generated Client ID and Client Secret directly into the n8n credential and select **Sign in with Google**.

Do not paste the Client ID, Client Secret or OAuth tokens into this repository.

## AI email analysis

After the daily-limit check, **Analyze Email with Gemini** uses the Google Gemini
API and the free-tier `gemini-3.1-flash-lite` model to create JSON task metadata.
The following values are requested and then validated:

- a concise English title;
- category `tech` or `user`;
- priority `urgent`, `medium` or `low`;
- an explicit deadline in `YYYY-MM-DD` format, or `null` when none was stated.

**Build Validated AI Task** validates the result again before writing to Firebase.
If the email has no explicit deadline, the workflow uses seven days after receipt.
The original email body is preserved, an AI notice is prepended, and the task is
marked with `aiGenerated: true` and `processingVersion: gemini-1`. A Gemini or
validation error sends the creator a manual-review notice, then goes to the
`zu bearbeiten` branch and creates no task.

After Firebase creates the ticket, **Send Success Confirmation** emails the
external creator with the generated title, priority and due date. Only then does
the incoming message continue to the normal processed-email path.

## Daily request limit

`Reserve Daily Slot` uses Firebase's atomic server-side increment at
`stakeholderEmailRequests/{YYYY-MM-DD}/count`. Counts 1 through 10 continue to
ticket creation. Later requests do not create a ticket; `Send Limit Reply`
notifies the sender and the message follows the normal processed-email path.
The Landing Page only reads this authoritative counter and does not count mail
link clicks.

## Gmail processing states

- Successful Firebase write: send the creator a confirmation, add `erledigt`, remove `INBOX`, mark as read.
- Daily limit reached: send the limit reply, add `erledigt`, remove `INBOX`, mark as read.
- Failed normalization, Gemini analysis, validation, Firebase write or confirmation: notify the creator, add `zu bearbeiten`, remove `INBOX`. The message stays unread for manual attention. If the notification itself fails, the Gmail labeling and archiving path still continues.

## Security

Do not export credentials with workflow data. Never commit Gmail tokens, Google OAuth client secrets, Firebase service-account files, Gemini API keys or `N8N_ENCRYPTION_KEY`. Local runtime data and common credential files are excluded by the repository `.gitignore`.
