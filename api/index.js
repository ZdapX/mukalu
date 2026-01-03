
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Pilihan Model yang tersedia di Pollinations
// flux, flux-realism, any-dark, turbo, etc.
const BASE_URL = "https://image.pollinations.ai/prompt";

app.post("/api/generate", async (req, res) => {
  const { prompt, model } = req.body;

  if (!prompt) return res.status(400).json({ error: "Prompt required" });

  // Tambahkan seed random agar gambar selalu unik
  const seed = Math.floor(Math.random() * 1000000);
  const selectedModel = model || "flux"; // Default pakai model FLUX (bagus)
  
  // URL Encode prompt
  const safePrompt = encodeURIComponent(prompt);
  
  // Construct URL
  const imageUrl = `${BASE_URL}/${safePrompt}?width=1024&height=1024&seed=${seed}&model=${selectedModel}&nologo=true`;

  try {
    console.log(`Generating: ${prompt} (${selectedModel})`);

    // Kita fetch gambarnya sebagai ArrayBuffer (biner)
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000 // 30 detik
    });

    // Convert ke Base64 agar mudah dikirim ke frontend
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    res.json({
      success: true,
      image: dataUrl
    });

  } catch (error) {
    console.error("Error generating image:", error.message);
    res.status(500).json({ error: "Failed to generate image. Please try again." });
  }
});

app.get("/", (req, res) => res.send("Pollinations Proxy Active"));

module.exports = app;
