
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const https = require("https");

const app = express();

app.use(cors());
app.use(express.json());

// 1. Setup HTTPS Agent untuk menyamar jadi browser & bypass SSL error
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
  rejectUnauthorized: false // Penting untuk bypass beberapa firewall
});

// 2. Headers yang lebih lengkap
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Content-Type": "application/json",
  "Accept": "*/*",
  "Origin": "https://vider.ai",
  "Referer": "https://vider.ai/",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection": "keep-alive"
};

// --- Logic Vider AI ---

async function createTask(prompt) {
  // PERBAIKAN: Payload langsung di body, bukan di dalam "params"
  // PERBAIKAN: aspectRatio pakai string "1:1"
  const payload = {
    model: "free-ai-image-generator",
    image: "",
    aspectRatio: "1:1", 
    prompt: prompt
  };

  console.log("Mengirim request ke Vider:", JSON.stringify(payload));

  try {
    const { data } = await axios.post(
      'https://api.vider.ai/api/freev1/task_create/free-ai-image-generator',
      payload,
      { 
        headers: HEADERS,
        httpsAgent: agent,
        timeout: 30000 // 30 detik timeout request
      }
    );
    
    // Cek respon asli di Logs Vercel
    console.log("Respon Vider (Create):", JSON.stringify(data));

    return data?.data?.taskId;
  } catch (err) {
    // Log Error detail untuk debugging
    if (err.response) {
      console.error("Vider Error Status:", err.response.status);
      console.error("Vider Error Data:", JSON.stringify(err.response.data));
    } else {
      console.error("Vider Network Error:", err.message);
    }
    return null;
  }
}

async function checkTask(id) {
  try {
    const { data: response } = await axios.get(
      `https://api.vider.ai/api/freev1/task_get/${id}`,
      { 
        headers: HEADERS,
        httpsAgent: agent
      }
    );

    return {
      finished: response?.data?.finish === 1,
      url: response?.data?.result?.file_url
    };
  } catch (err) {
    console.error("Check Error:", err.message);
    return { finished: false, url: null };
  }
}

// --- API Routes ---

app.get("/", (req, res) => res.send("Vider AI Backend V2 Online"));

// 1. Endpoint Start
app.post("/api/start", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt kosong" });

  try {
    const taskId = await createTask(prompt);
    
    if (!taskId) {
      // Jika null, berarti error di request axios tadi
      throw new Error("Gagal request ke Vider. Cek Logs Vercel untuk detail error (403/500).");
    }

    res.json({ success: true, taskId });
  } catch (error) {
    console.error("API Start Failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. Endpoint Check Status
app.post("/api/check", async (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: "Task ID missing" });

  try {
    const result = await checkTask(taskId);

    if (result.finished && result.url) {
      res.json({ state: "completed", images: [result.url] });
    } else {
      res.json({ state: "processing" });
    }
  } catch (error) {
    res.status(500).json({ error: "Gagal mengecek status." });
  }
});

module.exports = app;
