# Join – Kanban Project Management Tool

Join is a responsive Kanban application for organizing tasks, contacts and project progress. It was created as an educational web development project at Developer Akademie GmbH and as part of my personal portfolio.

> [!NOTE]
> Join is a learning project. It is not intended for production use or for storing business-critical or sensitive information.

## Features

- User registration, login and guest access
- Dashboard with task statistics and upcoming deadlines
- Kanban board with the columns **Triage**, **To Do**, **In Progress**, **Await Feedback** and **Done**; new tasks enter **Triage** by default
- Task creation and editing with due dates, categories and priorities
- Drag-and-drop and touch controls for moving tasks between columns
- Subtasks with completion tracking
- Contact management and task assignments
- Search and filtering on the board
- Stakeholder email-request flow with AI-generated title, category, priority and deadline, plus an n8n-enforced daily 10-request limit
- Email notifications to task creators after ticket creation, processing errors and Board status changes
- Credential-free n8n workflow exports for the Gmail-to-Triage and status-notification integrations
- Responsive layouts for desktop, tablet and mobile devices
- Persistent data storage with Firebase Realtime Database
- Local task and contact cache with IndexedDB
- Privacy Policy, Legal Notice and in-app help page

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- Firebase Realtime Database REST API
- n8n and the Google Gemini API
- IndexedDB and Session Storage
- Web Crypto API for password hashing

No framework, package installation or build step is required.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/OlegOlanovski/Kanban-Project-Join.git
cd Kanban-Project-Join
```

### 2. Configure Firebase

The shared database URL is defined in [`javascript/firebase-config.js`](javascript/firebase-config.js). For your own installation, replace the existing `realtimeDbUrl` fallback with the URL of your Firebase Realtime Database.

The application uses these database nodes:

```text
register/
tasks/
contacts/
stakeholderEmailRequests/
statusNotifications/
```

The dedicated stakeholder alias is `8245oleg+join@gmail.com`; Gmail delivers it
to the underlying demo inbox `8245oleg@gmail.com`. The
legal contact address remains `info@oleg-olanovski.de`.

Configure appropriate Firebase Security Rules before publishing the application. Do not use an unrestricted database for real user data.

Tasks created inside Join receive a `creator` object automatically. An email/AI integration should use the same shape so the Board can identify an external sender:

```json
{
  "status": "triage",
  "aiGenerated": true,
  "creator": {
    "type": "external",
    "source": "email",
    "name": "Sender name",
    "email": "sender@example.com"
  }
}
```

### 3. Configure n8n

The credential-free workflow exports and their setup instructions are in
[`n8n/README.md`](n8n/README.md). Import the JSON files into n8n, connect Gmail
through OAuth2, create a Google Gemini API credential and select the Gmail labels
documented there. Never commit Gmail tokens, Firebase service-account files,
Gemini API keys or the n8n encryption key.

### 4. Start a local server

For example, with Python:

```bash
python3 -m http.server 5500
```

Then open [http://localhost:5500](http://localhost:5500) in your browser.

Opening the HTML files directly with a `file://` URL is not recommended because browser security restrictions may prevent parts of the application from working correctly.

## Project Structure

```text
Kanban-Project-Join/
├── assets/              Icons and image assets
├── css/                 Global, page and board styles
├── docs/                Generated JavaScript documentation
├── javascript/          Application logic and Firebase integration
│   └── board/           Board rendering, storage and interactions
├── subpages/            Board, contacts, tasks and information pages
├── index.html            Login page
└── style.css             Shared legacy styles
```

## Data Storage

Join stores account records, contacts, tasks and daily stakeholder request statistics in Firebase Realtime Database. Separate daily values track AI processing attempts and successfully created email tickets. The currently configured database is located in the `europe-west1` region. Tasks and contacts can additionally be cached in the browser using IndexedDB, while request statistics use Local Storage as an offline fallback and technically necessary login state is stored in cookies or Session Storage.

More details are available in the project's [Privacy Policy](subpages/privacy_policy.html).

## Educational Scope

This project demonstrates practical work with:

- Semantic and responsive web interfaces
- Modular JavaScript without a frontend framework
- CRUD operations through a REST API
- Drag-and-drop and touch interactions
- Client-side form validation and browser storage
- Data synchronization between Firebase and IndexedDB
- Structured AI extraction and validation for stakeholder emails

The current authentication implementation is intended for demonstration purposes and is not a replacement for a production authentication system such as Firebase Authentication.

## Author

**Oleg Olanovski**

- Email: [info@oleg-olanovski.de](mailto:info@oleg-olanovski.de)
- GitHub: [OlegOlanovski](https://github.com/OlegOlanovski)

## Legal Notice

This project was created for educational purposes. The Join design originates from Developer Akademie GmbH. Please see the included [Legal Notice](subpages/legal_notice.html) for further information.
