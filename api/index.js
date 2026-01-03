
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const https = require("https");

const app = express();

app.use(cors());
app.use(express.json());

// Setup Agent HTTPS
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
  rejectUnauthorized: false
});

// Header Sama Persis dengan Script Asli
const HEADERS = {
  "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
  "content-type": "application/json",
  "accept": "*/*",
  "origin": "https://vider.ai",
  "referer": "https://vider.ai/"
};

async function createTask(prompt) {
  // PERBAIKAN DI SINI:
  // aspectRatio harus integer 1, bukan string "1:1"
  const payload = {
    params: {
      model: "free-ai-image-generator",
      image: "",
      aspectRatio: 1, // KEMBALI KE INTEGER
      prompt: prompt
    }
  };

  try {
    console.log("[1] Sending payload:", JSON.stringify(payload));
    
    const { data } = await axios.post(
      'https://api.vider.ai/api/freev1/task_create/free-ai-image-generator',
      payload,
      { 
        headers: HEADERS,
        httpsAgent: agent
      }
    );
    
    console.log("[2] Response:", JSON.stringify(data));

    // Validasi Task ID
    if (data?.data?.taskId) {
      return data.data.taskId;
    } else {
      // Jika error server side Vider
      console.error("Vider Error Debug:", data.debug); 
      return null;
    }

  } catch (err) {
    if (err.response) {
      console.error("[Network Error]:", err.response.status, JSON.stringify(err.response.data));
    } else {
      console.error("[System Error]:", err.message);
    }
    return null;
  }
}

async function checkTask(id) {
  try {
    const { data: response } = await axios.get(
      `https://api.vider.ai/api/freev1/task_get/${id}`,
      { headers: HEADERS, httpsAgent: agent }
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

// --- Routes ---

app.get("/", (req, res) => res.send("Vider AI Fix Integer"));

app.post("/api/start", async (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) return res.status(400).json({ error: "Prompt kosong" });

  try {
    const taskId = await createTask(prompt);
    
    if (!taskId) {
      return res.status(502).json({ error: "Gagal membuat task. Server Vider menolak payload." });
    }

    res.json({ success: true, taskId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
    res.status(500).json({ error: "Error checking status" });
  }
});

module.exports = app;
