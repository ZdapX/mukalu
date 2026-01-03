
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Headers sesuai script Vider AI kamu
const HEADERS = {
  "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
  "content-type": "application/json",
  "accept": "*/*",
  "origin": "https://vider.ai",
  "referer": "https://vider.ai/"
};

// --- Logic Vider AI ---

async function createTask(prompt) {
  const { data } = await axios.post(
    'https://api.vider.ai/api/freev1/task_create/free-ai-image-generator',
    {
      params: {
        model: "free-ai-image-generator",
        image: "",
        aspectRatio: 1, // 1:1 Square
        prompt: prompt
      }
    },
    { headers: HEADERS }
  );
  
  // Ambil Task ID
  return data?.data?.taskId;
}

async function checkTask(id) {
  const { data: response } = await axios.get(
    `https://api.vider.ai/api/freev1/task_get/${id}`,
    { headers: HEADERS }
  );

  const isFinished = response?.data?.finish === 1;
  const url = response?.data?.result?.file_url;

  return {
    finished: isFinished,
    url: url
  };
}

// --- API Routes ---

app.get("/", (req, res) => res.send("Vider AI Backend Ready"));

// 1. Endpoint Start
app.post("/api/start", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt kosong" });

  try {
    const taskId = await createTask(prompt);
    
    if (!taskId) throw new Error("Gagal mendapatkan Task ID dari Vider AI");

    res.json({ success: true, taskId });
  } catch (error) {
    console.error("Start Error:", error.message);
    res.status(500).json({ error: "Gagal memulai generate gambar." });
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
    console.error("Check Error:", error.message);
    res.status(500).json({ error: "Gagal mengecek status." });
  }
});

module.exports = app;
