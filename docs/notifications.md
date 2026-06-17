# Notification System

## Overview

The F1 League app uses push notifications (via Web Push API) to remind players about upcoming prediction deadlines and send other announcements.

## How It Works

1. Users opt-in to push notifications via the service worker (`src/lib/subscribe.ts`)
2. Push subscriptions are stored in PocketBase's `subscriptions` collection
3. Notifications are sent server-side using `web-push` library
4. Subscribers receive notifications on their devices (desktop/mobile)

## Endpoints

### Prediction Reminders (Cron)

```
POST /api/notifications/predictions
```

Triggered automatically by GitHub Actions every 6 hours. Sends reminder notifications to all subscribers about upcoming prediction deadlines.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "reminders_sent",
    "totalUsers": 12,
    "submittedUsers": 9,
    "nonSubmitterCount": 3,
    "nonSubmitters": ["Alice", "Bob", "Charlie"],
    "raceName": "British Grand Prix"
  }
}
```

### Test Notification

```
GET /api/notifications/test
```

Send a generic test notification to verify the system is working.

**Query Parameters:**
| Param | Description |
|-------|-------------|
| `prediction=true` | Send prediction reminder instead of test notification |
| `race=British` | Filter to a specific race (e.g., "British" for "British Grand Prix") |
| `message=Custom message` | Custom notification message |
| `dry-run=1` | Show results without actually sending |

**Examples:**
```
# Basic test notification
GET /api/notifications/test

# Prediction reminder for upcoming race
GET /api/notifications/test?prediction=true

# Prediction reminder for specific race
GET /api/notifications/test?prediction=true&race=British

# Custom message
GET /api/notifications/test?prediction=true&message=Custom+message
```

## Testing in Production

### Method 1: Direct API Call

```bash
curl https://f1-league.hades.ws/api/notifications/test
```

### Method 2: Prediction Reminder Test

```bash
curl https://f1-league.hades.ws/api/notifications/test?prediction=true
```

### Method 3: GitHub Actions Workflow

```
Run the "Prediction Reminder Notifications" workflow manually:
https://github.com/yourusername/f1-league/actions/workflows/prediction-reminders.yml
```

## PocketBase Schema

### subscriptions collection

| Field | Type | Description |
|-------|------|-------------|
| `endpoint` | text | Push subscription endpoint URL |
| `keys` | json | VAPID key information |
| `expirationTime` | number | Subscription expiration timestamp |
| `userId` | text (optional) | User ID who owns this subscription |

**Note:** The `userId` field enables targeting specific users with notifications. If not set, notifications are sent to all subscribers.

## Configuration

Required environment variables:

| Variable | Description |
|----------|-------------|
| `PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key for push notifications |
| `VAPID_PRIVATE_KEY` | VAPID private key for signing push notifications |
| `PB_USER` | PocketBase admin email |
| `PB_PASS` | PocketBase admin password |

## Notification Payload Structure

```json
{
  "title": "⏰ British Grand Prix Predictions Due!",
  "body": "3 players haven't submitted predictions. Race in 18h 30m.",
  "url": "/predictions",
  "tag": "prediction-reminder-{raceId}",
  "data": {
    "url": "/predictions",
    "raceId": "abc123",
    "raceName": "British Grand Prix",
    "nonSubmitterCount": 3
  },
  "actions": [
    {
      "action": "submit",
      "title": "Submit Predictions",
      "icon": "/icon.png"
    }
  ]
}
```

## Cron Schedule

The GitHub Actions workflow runs every 6 hours (`0 */6 * * *`). This ensures reminders are sent:

- **~48 hours before race** - Initial reminder
- **~24 hours before race** - Urgent reminder  
- **~12 hours before race** - Last chance reminder
- **~6 hours before race** - Final reminder (if still in submission window)

The submission window closes at the start of the first race session, so reminders stop automatically.

## Service Worker

Push notifications require the service worker to be active. The subscription flow:

1. User visits the app
2. `subscribeToPush()` requests notification permission
3. If granted, creates a push subscription via `PushManager`
4. Subscription is sent to `/api/subscribe` and stored in PocketBase

The service worker is registered in `src/service-worker.js`.
