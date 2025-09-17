# Push Notifications Setup Guide

This guide explains how to set up and use the push notification system for CyberSimply.

## Features

- **Daily News Notifications**: Users receive daily cybersecurity news updates at their preferred time
- **Customizable Timing**: Users can choose from multiple time slots (6 AM - 6 PM)
- **Test Notifications**: Users can send test notifications to verify the system works
- **Privacy-Focused**: All settings are stored locally on the device
- **Cross-Platform**: Works on both iOS and Android

## Implementation Details

### 1. Notification Service (`src/services/notificationService.ts`)

The `NotificationService` class handles all notification functionality:

- **Initialization**: Requests permissions and sets up push tokens
- **Scheduling**: Creates daily recurring notifications
- **Settings Management**: Stores and retrieves user preferences
- **Test Notifications**: Allows users to test the notification system

### 2. Notification Settings Screen (`src/screens/NotificationSettingsScreen.tsx`)

A dedicated settings screen where users can:

- Enable/disable daily notifications
- Choose notification time (6 AM - 6 PM)
- Send test notifications
- View privacy information

### 3. Integration

- **App.tsx**: Initializes the notification service on app startup
- **SettingsScreen.tsx**: Added navigation to notification settings
- **AppNavigator.tsx**: Added NotificationSettingsScreen to navigation stack
- **app.json**: Configured notification settings and permissions

## Configuration

### Expo Configuration

The app is configured with your sandbox key `8NG2865546` in the notification service.

### iOS Configuration

- Background modes enabled for background processing
- Notification permissions properly configured
- Custom notification icon and color

### Android Configuration

- Default notification channel created
- Custom notification icon and color
- Proper permission handling

## Usage

### For Users

1. **Enable Notifications**: Go to Settings → Notifications → Enable Notifications
2. **Choose Time**: Select your preferred notification time
3. **Test**: Use the "Send Test Notification" button to verify it works
4. **Customize**: Change settings anytime from the notification settings screen

### For Developers

```typescript
// Initialize the service
const notificationService = NotificationService.getInstance();
await notificationService.initialize();

// Schedule daily notifications
await notificationService.scheduleDailyNotification('09:00');

// Send test notification
await notificationService.sendTestNotification();

// Check if notifications are enabled
const enabled = await notificationService.areNotificationsEnabled();
```

## Notification Content

Daily notifications include:

- **Title**: "📰 Your Daily Cybersecurity News"
- **Body**: "Stay updated with the latest cybersecurity insights and threats. Tap to read today's top stories!"
- **Data**: Includes screen navigation information
- **Sound**: Default system notification sound

## Privacy & Security

- All notification settings are stored locally using AsyncStorage
- No personal data is collected or transmitted
- Users have full control over notification preferences
- Notifications can be disabled at any time

## Troubleshooting

### Common Issues

1. **Notifications not appearing**: Check device notification permissions
2. **Test notification fails**: Ensure the app has notification permissions
3. **Time not updating**: Restart the app after changing notification time

### Debug Information

The service logs important information to the console:
- Initialization status
- Permission requests
- Notification scheduling
- Error messages

## Future Enhancements

Potential improvements for future versions:

- **Smart Timing**: Learn user's app usage patterns to suggest optimal notification times
- **Content Customization**: Allow users to choose notification content types
- **Frequency Options**: Weekly or custom frequency options
- **Rich Notifications**: Include article previews or images
- **Analytics**: Track notification engagement (with user consent)

## Testing

To test the notification system:

1. Run the app on a physical device (notifications don't work in simulators)
2. Navigate to Settings → Notifications
3. Enable notifications and select a time
4. Use the "Send Test Notification" button
5. Verify the notification appears and can be tapped

## Support

If users experience issues with notifications:

1. Check device notification settings
2. Ensure the app has notification permissions
3. Try disabling and re-enabling notifications
4. Restart the app if settings don't take effect
