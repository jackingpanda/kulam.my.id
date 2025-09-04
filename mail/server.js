// server.js
const express = require("express");
const { google } = require("googleapis");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// 🔑 Ganti dengan kredensial Gmail API Mas
const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";
const CLIENT_SECRET = "YOUR_GOOGLE_CLIENT_SECRET";
const REDIRECT_URI = "http://localhost:3000/oauth2callback";
const REFRESH_TOKEN = "YOUR_REFRESH_TOKEN";

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

// 🟢 API generate random email
app.get("/generate", (req, res) => {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const length = Math.floor(Math.random() * 7) + 2;
  let name = "";
  for (let i = 0; i < length; i++) {
    name += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  res.json({ email: `${name}@kulam.my.id` });
});

// 🟢 API cek inbox berdasarkan email
app.get("/inbox/:address", async (req, res) => {
  const address = req.params.address;

  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: `to:${address}`,
      maxResults: 10,
    });

    if (!response.data.messages) return res.json([]);

    const messages = await Promise.all(
      response.data.messages.map(async (msg) => {
        const full = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
        });

        const headers = full.data.payload.headers;
        const from = headers.find((h) => h.name === "From")?.value || "";
        const subject = headers.find((h) => h.name === "Subject")?.value || "";
        const date = headers.find((h) => h.name === "Date")?.value || "";

        return { from, subject, date };
      })
    );

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching emails");
  }
});

app.listen(3000, () => {
  console.log("🚀 Temp Mail backend running on http://localhost:3000");
});
