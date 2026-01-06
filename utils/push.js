const { Expo } = require("expo-server-sdk");

const expo = new Expo();

async function sendPushNotification(token, title, body, data = {}) {
  try {
    if (!Expo.isExpoPushToken(token)) {
      console.log("❌ Invalid Expo push token:", token);
      return;
    }

    const messages = [
      {
        to: token,
        sound: "default",
        title,
        body,
        data,
      },
    ];

    await expo.sendPushNotificationsAsync(messages);
  } catch (err) {
    console.log("❌ Push notification error:", err);
  }
}

module.exports = { sendPushNotification };
