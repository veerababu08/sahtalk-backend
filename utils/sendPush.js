const { Expo } = require("expo-server-sdk");

const expo = new Expo();

const sendPush = async (pushToken, title, body, data = {}) => {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.log("❌ Invalid Expo push token:", pushToken);
    return;
  }

  const messages = [
    {
      to: pushToken,
      sound: "default",
      title,
      body,
      data,
    },
  ];

  try {
    await expo.sendPushNotificationsAsync(messages);
    console.log("✅ Push notification sent");
  } catch (error) {
    console.error("❌ Push notification error:", error);
  }
};

module.exports = sendPush;
