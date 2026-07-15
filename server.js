const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

// 1. إعدادات الـ CORS الكاملة لمنع أي حظر من المتصفحات أو الموبايل
app.use(cors({
    origin: '*', // السماح لأي مكان بالاتصال بالسيرفر
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// تحديد مسار قاعدة البيانات في مجلد /tmp المسموح بالكتابة فيه على Vercel
const DB_PATH = path.join('/tmp', 'database.json');

// ===================================================================
// قراءة البيانات بأمان وضمان رجوع مصفوفة (Array) دائماً
// ===================================================================
function readData() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            // لو الملف مش موجود في الـ tmp، نحاول نشوف لو فيه نسخة احتياطية في المجلد الرئيسي
            const localBackup = path.join(__dirname, 'database.json');
            if (fs.existsSync(localBackup)) {
                const backupData = fs.readFileSync(localBackup, 'utf8');
                fs.writeFileSync(DB_PATH, backupData, 'utf8'); // نسخها للـ tmp
                return JSON.parse(backupData);
            }
            return [];
        }
        const data = fs.readFileSync(DB_PATH, 'utf8').trim();
        if (!data) return [];
        
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) { 
        return []; 
    }
}

// حفظ البيانات في ملف قاعدة البيانات
function writeData(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error("خطأ أثناء حفظ البيانات:", e);
    }
}

// ===================================================================
// 1. رابط جلب لوحة الصدارة
// ===================================================================
app.get('/api/leaderboard', (req, res) => {
    const players = readData();
    const sorted = players.sort((a, b) => {
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

    let players = readData();
    let player = players.find(p => p.username === username);

    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // 2026-07-15

    if (player) {
        player.age = age || player.age;
        player.country = country || player.country;
        player.flag = flag || player.flag;
        player.iq = iq || player.iq;
        player.solved = wins || player.solved; 
        player.title = king_title || player.title;
        player.fullname = fullname || player.fullname;
        player.streak = streak || player.streak;
        player.lastSolveDate = formattedDate; 
    } else {
        player = { 
            username, 
            age, 
            country, 
            flag, 
            iq, 
            solved: wins || 0, 
            title: king_title, 
            fullname,
            streak: streak || 0,
            lastSolveDate: formattedDate 
        };
        players.push(player);
    }

    writeData(players);
    res.json({ success: true, player });
});

// ===================================================================
// 3. تصفير الموسم بالكامل
// ===================================================================
app.post('/api/reset', (req, res) => {
    writeData([]);
    res.json({ success: true });
});

// تشغيل السيرفر محلياً (Vercel سيتجاهل هذا عند الرفع ويشغله كسيرفر سحابي بدون مشاكل)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 سيرفر Dopamine AI شغال على بورت ${PORT}`));

module.exports = app; // مهم جداً لـ Vercel