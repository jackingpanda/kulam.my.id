const fs = require("fs");
const express = require("express");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;

const credentials = require("./credentials.json");
const token = require("./token.json");

const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
oAuth2Client.setCredentials(token);

const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

app.use(express.static("public"));

// API untuk ambil email terbaru
app.get("/api/inbox/:alias", async (req, res) => {
  const alias = req.params.alias.toLowerCase();
  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: `to:${alias}@kulam.my.id`,
      maxResults: 5,
    });

    if (!response.data.messages) {
      return res.json([]);
    }

    const messages = await Promise.all(
      response.data.messages.map(async (m) => {
        const msg = await gmail.users.messages.get({ userId: "me", id: m.id });
        return {
          id: m.id,
          snippet: msg.data.snippet,
          from: msg.data.payload.headers.find((h) => h.name === "From")?.value,
          subject: msg.data.payload.headers.find((h) => h.name === "Subject")?.value,
        };
      })
    );

    res.json(messages);
  } catch (err) {
    console.error("❌ Error fetching emails:", err);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
