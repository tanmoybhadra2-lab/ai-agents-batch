const axios = require('axios');
const RSSParser = require('rss-parser');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env from server folder
dotenv.config({ path: path.join(__dirname, '../../server/.env') });

const parser = new RSSParser();
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// ── 1. Fetch top 5 BBC News headlines ──────────────────────────
async function fetchNews() {
  try {
    const feed = await parser.parseURL('https://feeds.bbci.co.uk/news/rss.xml');
    const items = feed.items.slice(0, 5);
    return items.map((item, i) => `${i + 1}. [${item.title}](${item.link})`).join('\n');
  } catch (err) {
    return '⚠️ Could not fetch news.';
  }
}

// ── 2. Fetch weather for Kolkata ────────────────────────────────
async function fetchWeather() {
  try {
    const res = await axios.get('https://wttr.in/Kolkata?format=3', {
      headers: { 'User-Agent': 'curl/7.68.0' }
    });
    return res.data.trim();
  } catch (err) {
    return '⚠️ Could not fetch weather.';
  }
}

// ── 3. Read tasks from tasks.txt ────────────────────────────────
function readTasks() {
  const tasksFile = path.join(__dirname, 'tasks.txt');
  if (!fs.existsSync(tasksFile)) {
    fs.writeFileSync(
      tasksFile,
      '- Review project progress\n- Check agent logs\n- Add your own tasks here'
    );
  }
  const content = fs.readFileSync(tasksFile, 'utf8').trim();
  return content || 'No tasks for today.';
}

// ── 4. Send report to Discord ───────────────────────────────────
async function sendToDiscord(news, weather, tasks) {
  const now = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  const embed = {
    title: `📋 Daily Report — ${now}`,
    color: 0x5865f2,
    fields: [
      {
        name: '🌤️ Weather — Kolkata',
        value: weather,
        inline: false
      },
      {
        name: '📰 Top 5 News Headlines',
        value: news,
        inline: false
      },
      {
        name: "✅ Today's Tasks",
        value: tasks,
        inline: false
      }
    ],
    footer: {
      text: 'AI Agents Batch System  •  Free & Local  •  Powered by Ollama'
    },
    timestamp: new Date().toISOString()
  };

  await axios.post(WEBHOOK_URL, { embeds: [embed] });
  console.log('✅ Daily report sent to Discord!');
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('🤖 Generating daily report...');

  if (!WEBHOOK_URL) {
    console.error('❌ DISCORD_WEBHOOK_URL not set in .env file');
    process.exit(1);
  }

  const [news, weather] = await Promise.all([fetchNews(), fetchWeather()]);
  const tasks = readTasks();

  await sendToDiscord(news, weather, tasks);
}

main().catch(console.error);
