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
        sound: "default",
        title,
        body,
        data,
        channelId: "default", // 🔔 ADD THIS LINE - Critical for Android
        priority: "high",      // 🔔 ADD THIS LINE - Ensures delivery when phone is idle
      },
    ]);
    console.log("✅ Expo notification ticket sent");
  } catch (err) {
    console.error("❌ Push send error:", err);
  }
};

module.exports = { sendPushNotification };