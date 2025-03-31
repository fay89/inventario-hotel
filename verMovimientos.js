const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./db/database.db");

db.all("SELECT * FROM movements", (err, rows) => {
  if (err) {
    return console.error("❌ Error consultando movimientos:", err.message);
  }

  if (rows.length === 0) {
    console.log("📭 No hay movimientos registrados.");
  } else {
    console.log("📦 Movimientos registrados:");
    console.table(rows);
  }

  db.close();
});
