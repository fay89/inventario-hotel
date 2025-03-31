const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./db/database.db");

db.run(`ALTER TABLE items ADD COLUMN min_stock INTEGER DEFAULT 0`, (err) => {
  if (err) {
    if (err.message.includes("duplicate column name")) {
      console.log("⚠️ La columna 'min_stock' ya existe.");
    } else {
      console.error("❌ Error al modificar tabla:", err.message);
    }
  } else {
    console.log("✅ Columna 'min_stock' agregada con éxito.");
  }

  db.close();
});
