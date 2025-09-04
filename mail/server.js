const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const generated = new Set();

function randomName(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let name = "";
  for (let i = 0; i < length; i++) {
    name += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return name;
}

function generateUniqueEmail() {
  let name;
  do {
    const len = Math.floor(Math.random() * 7) + 2; // 2–8 chars
    name = randomName(len);
  } while (generated.has(name));

  generated.add(name);
  return `${name}@kulam.my.id`;
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/generate", (req, res) => {
  res.json({ email: generateUniqueEmail() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
