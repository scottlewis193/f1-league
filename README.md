# F1 League

F1 League prediction app with push notifications, wagering, and real-time standings.

## Features

- 🏎️ **Race Predictions** - Predict top 3 finishers and wild predictions for each race
- 🔔 **Push Notifications** - Get reminded about upcoming prediction deadlines
- 💰 **Prediction Wagering** - £5 entry per race, winner takes all
- 📊 **Live Standings** - Track your position throughout the season
- 👤 **Player Stats** - View detailed prediction history and accuracy

## Push Notifications

The app sends push notifications to remind players about upcoming prediction deadlines:

- **Cron reminders** - Automatically sent every 6 hours before each race
- **Test notifications** - Use the API or test script to verify notifications work

### Testing Notifications

```bash
# Basic test notification
curl https://f1-league.hades.ws/api/notifications/test

# Prediction reminder
curl https://f1-league.hades.ws/api/notifications/test?prediction=true

# Using the test script
node scripts/test-notifications.mjs
node scripts/test-notifications.mjs prediction

# Detailed docs
docs/notifications.md
```

## Developing

```sh
npm install
npm run dev
```

## Building

```sh
npm run build
```

## Deployment

Built with Docker:

```sh
docker build --build-arg PUBLIC_PB_URL=https://pb-f1-league.hades.ws --build-arg PUBLIC_VAPID_PUBLIC_KEY=YOUR_KEY -t f1-league .
```

## Documentation

- [Notification System](docs/notifications.md)
