const fetch = require("node-fetch");

const sendPush = async (expoPushToken, title, body, data = {}) => {
  if (!expoPushToken) return;

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: expoPushToken,
      sound: "default",
      title,
      body,
      data,
	sound: "default",
    }),
  });
};

module.exports = sendPush;
