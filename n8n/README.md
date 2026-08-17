# Join n8n workflows

This directory contains credential-free workflow exports for the Join Issue Collector.

## MVP workflow

Import [`workflows/join-issue-collector-mvp.json`](workflows/join-issue-collector-mvp.json) into n8n 2.32.6 or newer. The workflow intentionally contains no Gmail, Firebase or AI credentials.

Before the first execution:

1. In Gmail account `8245oleg@gmail.com`, create the labels `erledigt` and `zu bearbeiten`.
2. Create a Gmail OAuth2 credential in n8n and select it in every Gmail node.
3. In the two **Add label** nodes, replace the placeholder label values by selecting the matching Gmail labels from the n8n dropdown.
4. Confirm that **Create Triage Task** points to the correct Firebase Realtime Database test project.
5. Keep the workflow inactive and use **Test workflow** with a non-sensitive test email first.

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

The MVP deliberately uses the email subject as the task title, the plain-text body as the description, `user` as the category, `medium` as the priority and seven days from receipt as a temporary deadline. These placeholders will be replaced by validated AI output in the next workflow version.

## Gmail processing states

- Successful Firebase write: add `erledigt`, remove `INBOX`, mark as read.
- Failed Firebase write: add `zu bearbeiten`, remove `INBOX`. The message stays unread for manual attention.

## Security

Do not export credentials with workflow data. Never commit Gmail tokens, Google OAuth client secrets, Firebase service-account files, OpenAI API keys or `N8N_ENCRYPTION_KEY`. Local runtime data and common credential files are excluded by the repository `.gitignore`.
