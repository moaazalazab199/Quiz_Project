const express = require('express');
const cors = require('cors');
const path = require('path'); // ضفنا مكتبة التعامل مع مسارات الملفات عشان الـ HTML يشتغل
const { Redis } = require('@upstash/redis'); // استيراد مكتبة Upstash Redis الجديدة
const app = express();

// إعدادات الـ CORS الكاملة لمنع الحظر
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 💡 السطر ده اللي هيخلي تصميم الموقع والـ HTML يظهروا على اللينك الرئيسي فوراً!
app.use(express.static(__dirname));

// الاتصال التلقائي بـ Upstash Redis بالأسامي الصحيحة من السيرفر
const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

// مفتاح حفظ البيانات السحابي
const DB_KEY = 'dopamine_players_db';

// دالة مساعدة لجلب البيانات بأمان من السحاب
async function getPlayers() {
    try {
        const players = await redis.get(DB_KEY);
        // لو البيانات رجعت مصفوفة تمام، لو لسه أول مرة وقافلة رجع مصفوفة فارغة
        return Array.isArray(players) ? players : [];
    } catch (e) {
        console.error("خطأ في قراءة قاعدة بيانات Upstash:", e);
        return [];
    }
}

// 💡 الرابط ده عشان لما تفتح اللينك الرئيسي علطول، يفتح لك صفحة index.html بتاعتك تلقائياً
const path = require('path');

// توجيه اللينك الرئيسي لملف الـ HTML بتاعك
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ===================================================================
// 1. رابط جلب لوحة الصدارة (مرتبة بالأكثر حلاً ثم الـ IQ الأعلى)
// ===================================================================
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

// ===================================================================
// 2. تحديث وإضافة المتسابقين وتخزينها في السحاب مدى الحياة
// ===================================================================
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

    // حفظ المصفوفة بالكامل في السحاب
    await redis.set(DB_KEY, players);
    res.json({ success: true, player });
});

// ===================================================================
// 3. تصفير الموسم بالكامل
// ===================================================================
app.post('/api/reset', async (req, res) => {
    await redis.set(DB_KEY, []);
    res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 سيرفر Dopamine AI السحابي والمؤمن شغال بنجاح!`));

module.exports = app;