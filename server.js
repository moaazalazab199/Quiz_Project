const express = require('express');
const cors = require('cors');
const app = express();

// إعدادات الـ CORS الكاملة
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// مصفوفة في الذاكرة لتخزين البيانات بدلاً من الملفات لتجنب خطأ 500 على Vercel
let playersDatabase = [];

// ===================================================================
// 1. رابط جلب لوحة الصدارة
// ===================================================================
app.get('/api/leaderboard', (req, res) => {
    const sorted = [...playersDatabase].sort((a, b) => {
        if (b.solved !== a.solved) {
            return (b.solved || 0) - (a.solved || 0); 
        }
        return (b.iq || 0) - (a.iq || 0); 
    });
    res.json(sorted);
});

// ===================================================================
// 2. تحديث وإضافة المتسابقين
// ===================================================================
app.post('/api/player/update', (req, res) => {
    const { username, age, country, flag, iq, wins, streak, fullname, king_title } = req.body;
    if (!username) return res.status(400).json({ error: "الاسم مطلوب" });

    let player = playersDatabase.find(p => p.username === username);

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
        playersDatabase.push(player);
    }

    res.json({ success: true, player });
});

// ===================================================================
// 3. تصفير الموسم بالكامل
// ===================================================================
app.post('/api/reset', (req, res) => {
    playersDatabase = [];
    res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 سيرفر Dopamine AI شغال بنجاح على بورت ${PORT}`));

module.exports = app;