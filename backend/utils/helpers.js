const pool = require('../config/db');

// formátování datumu z ISO formátu na formát datum-čas
function formatEmailDate(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    
    const dateText = 
        d.getDate() + "." + 
        (d.getMonth() + 1) + "." + 
        d.getFullYear();

    return `${dateText} ${hours}:${minutes}`;
}

// funkce pro přepočet a uložení všech statistik pronájmů
async function updateRentCounts() {
    try {
        const [allRows] = await pool.query(
            "SELECT COUNT(*) AS total FROM events WHERE type = 'rent' AND start >= CURDATE()"
        );

        const allCount = allRows[0].total;

        const [bookedRows] = await pool.query(`
            SELECT COUNT(*) AS total FROM events e
            JOIN reservations r ON e.id = r.event_id
            WHERE e.type = 'rent' AND e.start >= CURDATE()
        `);

        const bookedCount = bookedRows[0].total;

        const freeCount = allCount - bookedCount;

        await pool.query(
            "UPDATE setting SET count_free_rent = ?, count_booked_rent = ?, count_all_rent = ? WHERE id = 1",
            [freeCount, bookedCount, allCount]
        );
    } catch (err) {
        console.error("Chyba při aktualizaci statistik pronájmů:", err);
    }
}

module.exports = {
    formatEmailDate,
    updateRentCounts
};