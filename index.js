5const express = require('express');
const https = require('https');
const app = express();

app.use(express.json());

const dailyLimit = {};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

app.post('/', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const today = getToday();
  const key = `${ip}:${today}`;

  if (!dailyLimit[key]) dailyLimit[key] = 0;
  
  if (dailyLimit[key] >= 10) {
    return res.status(429).json({ error: { type: "daily_limit_exceeded", message: "오늘 AI 추천 횟수를 모두 사용했어요. 내일 다시 시도해 주세요." } });
  }

  dailyLimit[key]++;

  const body = JSON.stringify(req.body);
  
  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => res.json(JSON.parse(data)));
  });

  apiReq.on('error', (err) => res.status(500).json({ error: err.message }));
  apiReq.write(body);
  apiReq.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});
