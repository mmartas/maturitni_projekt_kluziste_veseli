require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors()); // Povolí komunikaci mezi frontendem a backendem
app.use(express.json()); // Umožní serveru číst JSON data z formulářů

// nastavení session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const { requireAuth } = require('./middleware/auth');
const { updateRentCounts } = require('./utils/helpers');
const pool = require('./config/db');

const eventsRoutes = require('./routes/events');
const reservationsRoutes = require('./routes/reservations-admin');
const settingRoutes = require('./routes/setting');
const authRoutes = require('./routes/auth');

app.use('/api/events', eventsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/setting', settingRoutes);
app.use('/', authRoutes);

// nikdo se nedostane na admin.html pokud není přihlášený
app.get('/admin.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/admin.html'));
});

app.get('/pages/admin.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/admin.html'));
});

app.use(express.static(path.join(__dirname, '../frontend')));

// spuštění serveru - ověření v terminálu že běží
app.listen(PORT, () => {
    console.log(`Backend server úspěšně běží na adrese: http://localhost:${PORT}`);

    updateRentCounts();
});

// 15. Endpoint pro získání všech zákazníků a jejich statistik
app.get('/api/admin-customers', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                TRIM(r.name) AS name,
                TRIM(r.surname) AS surname,
                MAX(r.email) AS email,
                MAX(r.phone) AS phone,
                SUM(CASE WHEN COALESCE(e.start, r.date) < NOW() THEN 1 ELSE 0 END) AS total_orders,
                MAX(CASE WHEN COALESCE(e.start, r.date) < NOW() THEN COALESCE(e.start, r.date) END) AS last_completed_date
            FROM reservations r
            LEFT JOIN events e ON r.event_id = e.id
            WHERE r.name IS NOT NULL AND TRIM(r.name) != ''
              AND r.surname IS NOT NULL AND TRIM(r.surname) != ''
            GROUP BY TRIM(r.name), TRIM(surname)
            HAVING total_orders > 0
            ORDER BY total_orders DESC, last_completed_date DESC
        `);
        res.json({ success: true, customers: rows });
    } catch (err) {
        console.error("Chyba při načítání zákazníků:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 14. Endpoint pro získání všech rezervací a jejich detailů pro administraci
app.get('/api/admin-reservations', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT e.id AS event_id, e.title, e.start, e.end, e.type,
                   r.id AS reservation_id, r.name, r.surname, r.phone, r.email, r.note
            FROM events e
            LEFT JOIN reservations r ON e.id = r.event_id
            WHERE e.type = 'rent' AND e.start >= CURDATE()
            ORDER BY e.start ASC
        `);
        res.json({ success: true, events: rows });
    } catch (err) {
        console.error("Chyba při načítání administrace rezervací:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 16. Endpoint pro bloky (volné / obsazené)
app.get('/api/admin-blocks-stats', async (req, res) => {
    try {
        let { startDate, endDate } = req.query;
        const [settingRows] = await pool.query("SELECT * FROM setting WHERE id = 1");
        let limitDate = null;
        let rawLimit = null;

        if (settingRows.length > 0 && settingRows[0].calendar_end_time) {
            rawLimit = settingRows[0].calendar_end_time;
            limitDate = new Date(rawLimit).toISOString().split('T')[0];
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const defaultEnd = limitDate || todayStr;
        const effectiveStart = startDate || todayStr;
        const effectiveEnd = endDate || defaultEnd;

        let baseWhere = "type = 'rent' AND start >= ? AND start <= ?";
        const params = [effectiveStart, effectiveEnd + ' 23:59:59'];

        const [allRows] = await pool.query(`SELECT COUNT(*) AS total FROM events WHERE ${baseWhere}`, params);
        const allCount = allRows[0].total;

        const [bookedRows] = await pool.query(`
            SELECT COUNT(*) AS total FROM events e
            JOIN reservations r ON e.id = r.event_id
            WHERE e.${baseWhere}
        `, params);

        const bookedCount = bookedRows[0].total;
        const freeCount = allCount - bookedCount;

        res.json({ 
            success: true, 
            allCount, 
            freeCount, 
            bookedCount, 
            limitDate: rawLimit,
            defaultStart: effectiveStart,
            defaultEnd: effectiveEnd
        });
    } catch (err) {
        console.error("Chyba při načítání bloků:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 17. Endpoint pro typy událostí
app.get('/api/admin-event-types-stats', async (req, res) => {
    try {
        let { startDate, endDate } = req.query;
        
        const [settingRows] = await pool.query("SELECT * FROM setting WHERE id = 1");
        let limitDate = null;
        if (settingRows.length > 0 && settingRows[0].calendar_end_time) {
            limitDate = new Date(settingRows[0].calendar_end_time).toISOString().split('T')[0];
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const defaultEnd = limitDate || todayStr;

        const effectiveStart = startDate || todayStr;
        const effectiveEnd = endDate || defaultEnd;

        const [rows] = await pool.query(`
            SELECT type, COUNT(*) AS count
            FROM events
            WHERE start >= ? AND start <= ?
            GROUP BY type
        `, [effectiveStart, effectiveEnd + ' 23:59:59']);

        res.json({ 
            success: true, 
            stats: rows,
            defaultStart: effectiveStart,
            defaultEnd: effectiveEnd
        });
    } catch (err) {
        console.error("Chyba při načítání typů událostí:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 18. Endpoint pro získání top zákazníků
app.get('/api/admin-top-customers', async (req, res) => {
    try {
        let { startDate, endDate } = req.query;

        const [settingRows] = await pool.query("SELECT * FROM setting WHERE id = 1");
        let limitDate = null;
        if (settingRows.length > 0 && settingRows[0].calendar_end_time) {
            limitDate = new Date(settingRows[0].calendar_end_time).toISOString().split('T')[0];
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const defaultEnd = limitDate || todayStr;

        const effectiveStart = startDate || '2026-10-01';
        const effectiveEnd = endDate || defaultEnd;

        const [rows] = await pool.query(`
            SELECT CONCAT(TRIM(name), ' ', TRIM(surname)) AS customer_name, COUNT(*) AS order_count
            FROM reservations
            WHERE name IS NOT NULL AND TRIM(name) != ''
              AND surname IS NOT NULL AND TRIM(surname) != ''
              AND date >= ? 
              AND date <= ?
            GROUP BY TRIM(name), TRIM(surname)
            ORDER BY order_count DESC
            LIMIT 5
        `, [effectiveStart, effectiveEnd + ' 23:59:59']);

        res.json({ success: true, customers: rows });
    } catch (err) {
        console.error("Chyba při načítání top zákazníků:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 22. Veřejná routa pro získání veškerého obsahu webu
app.get('/api/content', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM site_content');
        const contentMap = {};
        rows.forEach(row => {
            contentMap[row.section_key] = row.content;
        });
        res.json({ success: true, content: contentMap });
    } catch (err) {
        console.error('Chyba při načítání obsahu:', err);
        res.status(500).json({ success: false, error: 'Chyba serveru' });
    }
});

// 23. Chráněná routa pro aktualizaci obsahu z adminu
app.post('/api/content/update', requireAuth, async (req, res) => {
    const { section_key, content } = req.body;

    if (!section_key || content === undefined) {
        return res.status(400).json({ success: false, error: 'Chybí data (section_key nebo content)' });
    }

    try {
        await pool.query(
            'INSERT INTO site_content (section_key, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
            [section_key, content, content]
        );
        res.json({ success: true, message: 'Obsah byl úspěšně aktualizován' });
    } catch (err) {
        console.error('Chyba při ukládání obsahu:', err);
        res.status(500).json({ success: false, error: 'Chyba při ukládání do databáze' });
    }
});