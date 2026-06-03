const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

app.get('/', (req, res) => {
  res.json({ status: 'running', model: OLLAMA_MODEL });
});

app.post('/chat', async (req, res) => {
  const { message, model } = req.body;
  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: model || OLLAMA_MODEL,
      prompt: message,
      stream: false
    });
    res.json({ reply: response.data.response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/code', async (req, res) => {
  const { task } = req.body;
  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: 'codegemma',
      prompt: `You are a code assistant. Task: ${task}`,
      stream: false
    });
    res.json({ code: response.data.response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});