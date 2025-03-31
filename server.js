const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");

const app = express();
const PORT = 3000;
const dbPath = "./db/database.db";

// Configurar motor de vistas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

// Sesión
app.use(session({
  secret: "hotel_mantenimiento_secret",
  resave: false,
  saveUninitialized: true
}));

// Rutas

app.get("/", (req, res) => {
  const user = req.session.user;
  res.render("index", {
    title: "Panel de Inventario del Hotel",
    user: user
  });
});

// Registro
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const { name, email, password, role } = req.body;
  const db = new sqlite3.Database(dbPath);
  const query = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;

  db.run(query, [name, email, password, role], function(err) {
    if (err) {
      console.error("❌ Error al registrar usuario:", err.message);
      return res.send("Error al registrar. ¿Correo ya en uso?");
    }
    res.redirect("/login");
  });

  db.close();
});

// Login
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const db = new sqlite3.Database(dbPath);
  const query = `SELECT * FROM users WHERE email = ? AND password = ?`;

  db.get(query, [email, password], (err, user) => {
    if (err) return res.send("Error interno");
    if (!user) return res.send("Credenciales incorrectas");

    req.session.user = user;
    res.redirect("/");
  });

  db.close();
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Inventario con búsqueda y filtro
app.get("/inventory", (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { search = "", location = "" } = req.query;

  let query = `SELECT * FROM items WHERE 1=1`;
  let params = [];

  if (search) {
    query += ` AND name LIKE ?`;
    params.push(`%${search}%`);
  }

  if (location) {
    query += ` AND location = ?`;
    params.push(location);
  }

  db.all(query, params, (err, items) => {
    if (err) {
      console.error("❌ Error al mostrar inventario:", err.message);
      return res.send("Error al mostrar inventario");
    }

    db.all(`SELECT DISTINCT location FROM items WHERE location IS NOT NULL`, [], (err, locations) => {
      if (err) {
        console.error("❌ Error al obtener ubicaciones:", err.message);
        return res.send("Error");
      }

      res.render("inventory", {
        items,
        locations,
        user: req.session.user,
        filters: { search, location }
      });
    });
  });

  db.close();
});

// Agregar producto (solo admin)
app.post("/inventory/add", (req, res) => {
  const { name, quantity, location, min_stock } = req.body;
  const user = req.session.user;
  const db = new sqlite3.Database(dbPath);
  const now = new Date().toLocaleString();

  const query = `
    INSERT INTO items (name, quantity, location, last_updated_by, last_updated_at, min_stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [name, quantity, location, user.name, now, min_stock], function(err) {
    if (err) return res.send("Error al agregar producto");
    res.redirect("/inventory");
  });

  db.close();
});

// Actualizar stock + registrar movimiento
app.post("/inventory/update/:id", (req, res) => {
  const id = req.params.id;
  const change = parseInt(req.body.change, 10);
  const user = req.session.user;
  const now = new Date().toLocaleString();

  const db = new sqlite3.Database(dbPath);
  const updateQuery = `
    UPDATE items
    SET quantity = quantity + ?, last_updated_by = ?, last_updated_at = ?
    WHERE id = ?
  `;

  db.run(updateQuery, [change, user.name, now, id], function(err) {
    if (err) return res.send("Error al modificar inventario");

    const insertMovement = `
      INSERT INTO movements (item_id, change, user, date)
      VALUES (?, ?, ?, ?)
    `;
    db.run(insertMovement, [id, change, user.name, now], function(err) {
      if (err) console.error("❌ Error al registrar movimiento:", err.message);
      res.redirect("/inventory");
    });
  });

  db.close();
});

// Historial de movimientos
app.get("/movements", (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const query = `
    SELECT m.id, m.change, m.user, m.date, i.name AS item_name
    FROM movements m
    JOIN items i ON m.item_id = i.id
    ORDER BY m.id DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.send("Error al cargar historial");

    res.render("movements", {
      movements: rows,
      user: req.session.user
    });
  });

  db.close();
});

// Dashboard (solo admin puede verlo desde link)
app.get("/dashboard", (req, res) => {
  const db = new sqlite3.Database(dbPath);

  const stats = {
    totalProductos: 0,
    totalUnidades: 0,
    productosBajoStock: [],
    productosMasUsados: []
  };

  db.get(`SELECT COUNT(*) AS total FROM items`, (err, row) => {
    stats.totalProductos = row.total;

    db.get(`SELECT SUM(quantity) AS total FROM items`, (err, row2) => {
      stats.totalUnidades = row2.total || 0;

      db.all(`SELECT name, quantity FROM items WHERE quantity < min_stock`, (err, bajoStock) => {
        stats.productosBajoStock = bajoStock;

        db.all(`
          SELECT i.name, COUNT(m.id) AS movimientos
          FROM movements m
          JOIN items i ON m.item_id = i.id
          GROUP BY m.item_id
          ORDER BY movimientos DESC
          LIMIT 5
        `, (err, usados) => {
          stats.productosMasUsados = usados;

          res.render("dashboard", {
            user: req.session.user,
            stats
          });

          db.close();
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
