const express = require('express');
const cors = require('cors');
const { Redis } = require('@upstash/redis');
const path = require('path');
const app = express();

// إعدادات الـ CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ✅ خدمة الملفات الثابتة
app.use(express.static(__dirname));

// ✅ إضافة مسار الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ مسار admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ✅ مسار rules
app.get('/rules', (req, res) => {
    res.sendFile(path.join(__dirname, 'rules.html'));
});

// الاتصال بـ Upstash Redis
const redis = new Redis({
    url: 'https://enjoyed-javelin-164695.upstash.io',
    token: 'gQAAAAAAAoNXAAIgcDIwNzA5ZmZjZDBmYjk0YjM5OTU3YmNkMmFhZmZlODljZQ',
});

const DB_KEY = 'dopamine_players_db';

async function getPlayers() {
    try {
        const players = await redis.get(DB_KEY);
        return Array.isArray(players) ? players : [];
    } catch (e) {
        console.error("خطأ في قراءة قاعدة بيانات Upstash:", e);
        return [];
    }
}

// 1. جلب لوحة الصدارة
app.get('/api/leaderboard', async (req, res) => {
    const players = await getPlayers();
    const sorted = [...players].sort((a, b) => {
        if (b.solved !== a.solved) {
            return (b.solved || 0) - (a.solved || 0); 
        }
        return (b.iq || 0) - (a.iq || 0); 
    });
    res.json(sorted);
});

// 2. تحديث متسابق
app.post('/api/player/update', async (req, res) => {
    const { username, age, country, flag, iq, wins, streak, fullname, king_title } = req.body;
    if (!username) return res.status(400).json({ error: "الاسم مطلوب" });

    let players = await getPlayers();
    let player = players.find(p => p.username === username);

    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; 

    if (player) {
        player.age = age || player.age;
        player.country = country || player.country;
        player.flag = flag || player.flag;
        player.iq = parseInt(iq) || player.iq;
        player.solved = parseInt(wins) || player.solved; 
        player.title = king_title || player.title;
        player.fullname = fullname || player.fullname;
        player.streak = parseInt(streak) || player.streak;
        player.lastSolveDate = formattedDate; 
    } else {
        player = { 
            username, 
            age, 
            country, 
            flag, 
            iq: parseInt(iq) || 0, 
            solved: parseInt(wins) || 0, 
            title: king_title, 
            fullname,
            streak: parseInt(streak) || 0,
            lastSolveDate: formattedDate 
        };
        players.push(player);
    }

    await redis.set(DB_KEY, players);
    res.json({ success: true, player });
});

// 3. تصفير الموسم
app.post('/api/reset', async (req, res) => {
    await redis.set(DB_KEY, []);
    res.json({ success: true });
});

module.exports = app;