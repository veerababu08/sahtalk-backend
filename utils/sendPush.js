const { Expo } = require("expo-server-sdk");
const expo = new Expo();

const sendPushNotification = async (token, title, body, data = {}) => {
  if (!Expo.isExpoPushToken(token)) {
    console.log("❌ Invalid Expo token:", token);
    return;
  }

  try {
    await expo.sendPushNotificationsAsync([
      {
        to: token,
        title,
        body,
        data,
	sound: "default",
        // 🔔 FIXED: These must be inside the 'android' object
	mutableContent: true,
        android: {
          channelId: "default",
          priority: "high",
	  sound: true, // 🔔 AND THIS
	  largeIcon: data.icon || "https://your-default-app-icon.com/logo.png"
        },
      },
    ]);
    console.log("✅ Expo notification ticket sent");
  } catch (err) {
    console.error("❌ Push send error:", err);
  }
};

module.exports = { sendPushNotification };