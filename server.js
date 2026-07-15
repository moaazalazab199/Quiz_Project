const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'database.json');

// ===================================================================
// قراءة البيانات بأمان وضمان رجوع مصفوفة (Array) دائماً لتجنب أخطاء الـ Sort
// ===================================================================
function readData() {
    try {
        if (!fs.existsSync(DB_PATH)) return [];
        const data = fs.readFileSync(DB_PATH, 'utf8').trim();
        if (!data) return []; // لو الملف فارغ تماماً رجع مصفوفة فارغة
        
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : []; // التأكد 100% أن الناتج مصفوفة صالحة
    } catch (e) { 
        return []; 
    }
}

// حفظ البيانات في ملف قاعدة البيانات (database.json)
function writeData(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ===================================================================
// 1. رابط جلب لوحة الصدارة (مرتبة بالأكثر حلاً للألغاز أولاً ثم الـ IQ الأعلى)
// ===================================================================
app.get('/api/leaderboard', (req, res) => {
    const players = readData();
    const sorted = players.sort((a, b) => {
        if (b.solved !== a.solved) {
            return (b.solved || 0) - (a.solved || 0); // ترتيب تنازلي حسب عدد الألغاز المحلولة
        }
        return (b.iq || 0) - (a.iq || 0); // في حال التساوي، يتم الترتيب حسب الـ IQ الأعلى
    });
    res.json(sorted);
});

// ===================================================================
// 2. تحديث وإضافة المتسابقين وتوليد تاريخ الحل تلقائياً بناءً على تاريخ جهازك
// ===================================================================
app.post('/api/player/update', (req, res) => {
    const { username, age, country, flag, iq, wins, streak, fullname, king_title } = req.body;
    if (!username) return res.status(400).json({ error: "الاسم مطلوب" });

    let players = readData();
    let player = players.find(p => p.username === username);

    // توليد التاريخ الحالي لجهازك بالملي بتنسيق أنيق (YYYY-MM-DD)
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // النتيجة مثل: 2026-07-15

    if (player) {
        // تحديث البيانات الحالية مع استبدال التاريخ القديم بالتاريخ الجديد فوراً وتجاهل القديم
        player.age = age || player.age;
        player.country = country || player.country;
        player.flag = flag || player.flag;
        player.iq = iq || player.iq;
        player.solved = wins || player.solved; // ربط wins بـ solved
        player.title = king_title || player.title;
        player.fullname = fullname || player.fullname;
        player.streak = streak || player.streak;
        player.lastSolveDate = formattedDate; // تحديث التاريخ التلقائي للغز الجديد وتجاهل القديم
    } else {
        // إنشاء متسابق جديد بالكامل في حال لم يكن مسجلاً من قبل
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
            lastSolveDate: formattedDate // إدخال تاريخ أول حل تلقائياً
        };
        players.push(player);
    }

    writeData(players);
    res.json({ success: true, player });
});

// ===================================================================
// 3. تصفير الموسم بالكامل (حذف جميع بيانات المتسابقين)
// ===================================================================
app.post('/api/reset', (req, res) => {
    writeData([]);
    res.json({ success: true });
});

// تشغيل السيرفر على البورت 5000
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 سيرفر Dopamine AI الذكي شغال على بورت ${PORT}`));