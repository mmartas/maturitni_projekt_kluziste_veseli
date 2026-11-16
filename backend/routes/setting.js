const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const { updateRentCounts } = require('../utils/helpers');

// 11. získání datumu z databáze do kdy je vyplněný rozpis
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT calendar_end_time, count_free_rent, count_booked_rent, count_all_rent FROM setting LIMIT 1");
        
        res.json({ 
            success: true, 
            limitDate: rows[0] && rows[0].calendar_end_time ? rows[0].calendar_end_time : null,
            freeCount: rows[0] ? rows[0].count_free_rent : 0,
            bookedCount: rows[0] ? rows[0].count_booked_rent : 0,
            allCount: rows[0] ? rows[0].count_all_rent : 0
        });
    } catch (err) {
        console.error("Chyba při načítání nastavení:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 12. Uložení / aktualizace data do kd je vyplněný rozpis
router.post('/', async (req, res) => {
    try {
        const { limitDate } = req.body;

        await pool.query(
            "INSERT INTO setting (id, calendar_end_time) VALUES (1, ?) ON DUPLICATE KEY UPDATE calendar_end_time = ?",
            [limitDate, limitDate]
        );

        res.json({ success: true, message: "Nastavení uloženo do databáze!" });
    } catch (err) {
        console.error("Chyba při ukládání nastavení:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 13. Endpoint který spustí přepočet statistik pronájmů
router.post('/update-counts', async (req, res) => {
    try {
        await updateRentCounts();
        const [rows] = await pool.query("SELECT * FROM setting WHERE id = 1");
        
        if (rows.length > 0) {
            res.json({ 
                success: true, 
                allCount: rows[0].count_all_rent, 
                freeCount: rows[0].count_free_rent, 
                bookedCount: rows[0].count_booked_rent,
                limitDate: rows[0].calendar_end_time
            });
        } else {
            res.json({ success: true });
        }
    } catch (err) {
        console.error("Chyba při aktualizaci statistik:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

module.exports = router;