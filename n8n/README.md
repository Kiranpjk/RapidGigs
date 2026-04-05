# n8n Workflow Automation for RapidGigs

Self-hosted workflow automation for notifications, status updates, and job-freelancer matching.

## Quick Start

### Option 1: Docker Compose (recommended)

```bash
# From the project root
docker compose --profile automation up -d
```

n8n will be available at `http://localhost:5678`

### Option 2: Standalone Docker

```bash
docker run -it --rm \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e WEBHOOK_URL=http://host.docker.internal:3001 \
  -e N8N_WEBHOOK_SECRET=rapidgig-webhook-secret-change-in-production \
  n8nio/n8n
```

## Importing Workflows

1. Open n8n at `http://localhost:5678`
2. Go to **Workflows** > **Import from File**
3. Import each JSON file from `n8n/workflows/`:
   - `application-received.json` - Notifies recruiters when someone applies
   - `status-changed.json` - Notifies freelancers when their application status changes
   - `job-matching.json` - Matches new jobs to freelancers and notifies them

## Required Environment Variables

Set these in n8n's environment or workflow credentials:

| Variable | Description | Default |
|----------|-------------|---------|
| `WEBHOOK_URL` | Backend API base URL | `http://backend:3001` (Docker) or `http://localhost:3001` |
| `N8N_WEBHOOK_SECRET` | Shared secret for webhook auth | Must match `N8N_WEBHOOK_SECRET` in backend `.env` |

## Workflow Details

### 1. Application Received (`application-received.json`)
- **Trigger**: Polls every 5 minutes
- **Action**: Fetches new applications, creates in-app notifications for recruiters
- **Extendable**: Add an SMTP node to also send email notifications

### 2. Status Changed (`status-changed.json`)
- **Trigger**: Polls every 5 minutes
- **Action**: Fetches applications with status changes, notifies applicants
- **Extendable**: Add an SMTP node for email, or a Slack node for team notifications

### 3. Job-Freelancer Matching (`job-matching.json`)
- **Trigger**: Webhook (called when a new job is posted)
- **Action**: Finds matching freelancers and sends them notifications
- **Extendable**: Improve matching logic by adding skills/category filters

## Adding Email Notifications

To send actual emails, add an **SMTP** node after the notification step:

1. In n8n, go to **Credentials** > **Create New** > **SMTP**
2. Configure with a free SMTP service:
   - **Gmail**: smtp.gmail.com, port 587 (use App Password)
   - **Outlook**: smtp.office365.com, port 587
   - **Mailtrap** (for testing): smtp.mailtrap.io
3. Add an SMTP node in each workflow after the "Create Notification" step

## Backend Webhook Endpoints

The following endpoints are available for n8n to call:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/webhooks/new-applications?since=ISO_DATE` | Get applications since timestamp |
| GET | `/api/webhooks/status-changes?since=ISO_DATE` | Get status changes since timestamp |
| POST | `/api/webhooks/match-freelancers` | Find freelancers matching a job |
| POST | `/api/webhooks/create-notification` | Create an in-app notification |

All endpoints require `x-webhook-secret` header for authentication.
