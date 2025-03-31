const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./db/database.db");

db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'mantenimiento'`, (err) => {
  if (err) {
    if (err.message.includes("duplicate column name")) {
      console.log("⚠️ La columna 'role' ya existe.");
    } else {
      console.error("❌ Error al agregar columna:", err.message);
    }
  } else {
    console.log("✅ Columna 'role' agregada correctamente.");
  }
  db.close();
});
