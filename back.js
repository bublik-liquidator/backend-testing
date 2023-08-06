const express = require("express");
const cors = require("cors");
const bcrypt = require('bcrypt');
const app = express();
require('dotenv').config();
app.use(cors({ origin: "http://localhost:4200" }));
const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.HOST, 
  port: process.env.PORT,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});
const secret = process.env.SECRET;

const jwt = require("jsonwebtoken");


app.use(express.json());


app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (result.rowCount === 0) {
      // Хешируем пароль перед сохранением
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      await pool.query(
        "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)",
        [username, hashedPassword, 'user']
      );
      res.json("User registered successfully!");
    } else {
      res.status(400).json("Username already taken");
    }
  } catch (err) {
    console.error(err.message);
  }
});

// app.post("/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     const result = await pool.query(
//       "SELECT * FROM users WHERE username = $1 AND password = $2",
//       [username, password]
//     );
//     if (result.rowCount === 1) {
//       const user = result.rows[0];
//       const isAdmin = user.role === 'admin';
//       const token = jwt.sign({ user_id: user.id, isAdmin }, secret);
//       res.json({ token });
//     } else {
//       res.status(401).json("Invalid username or password");
//     }
//   } catch (err) {
//     console.error(err.message);
//   }
// });

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (result.rowCount === 1) {
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        // Пароли совпадают, выполняем аутентификацию пользователя
        const isAdmin = user.role === 'admin';
        const token = jwt.sign({ user_id: user.id, isAdmin }, secret);
        res.json({ token });
      } else {
        // Пароли не совпадают, отправляем ошибку
        res.status(401).json("Invalid password");
      }
    } else {
      res.status(401).json("Username not found");
    }
  } catch (err) {
    console.error(err.message);
  }
});


const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, secret);
    req.user_id = decoded.user_id;

    // Get the username of the user
    pool.query(
      "SELECT username FROM users WHERE id = $1",
      [req.user_id],
      (err, result) => {
        if (err) {
          console.error(err.message);
          res.status(500).json("Internal server error");
        } else if (result.rowCount === 1) {
          req.username = result.rows[0].username;
          next();
        } else {
          res.status(401).json("Unauthorized");
        }
      }
    );
  } catch (err) {
    res.status(401).json("Unauthorized");
  }
};

app.get("/test", authenticate, async (req, res) => {  //проверка что юзер проходил тест
  try {
    const checkResult = await pool.query(
      "SELECT * FROM answers WHERE user_id = $1",
      [req.user_id]
    );

    if (checkResult.rowCount > 0) {
      res.status(403).json("You have already taken the test");
    } else {
      const result = await pool.query("SELECT * FROM questions");
      res.json(result.rows);
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/test", authenticate, async (req, res) => { //получение теста из бд
  try {
    const checkResult = await pool.query(
      "SELECT * FROM answers WHERE user_id = $1",
      [req.user_id]
    );

    if (checkResult.rowCount > 0) {
      res.status(403).json("You have already taken the test");
    } else {
      const { answers } = req.body;
      for (let i = 0; i < answers.length; i++) {
        await pool.query(
          "INSERT INTO answers (user_id, question_id, answer) VALUES ($1, $2, $3)",
          [req.user_id, i + 1, answers[i]]
        );
      }

      res.json("Answers submitted successfully!");
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/users-not-completed", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT username
       FROM users
       WHERE NOT EXISTS (SELECT 1 FROM answers WHERE user_id = users.id);`
    );
    const usernames = result.rows.map(row => row.username);
    res.json(usernames);
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/user-count", authenticate, async (req, res) => {
  try {
    if (req.username === "admin") {
      // Only allow the user with the username 'admin' to view the results
      const result = await pool.query(
        `SELECT COUNT(DISTINCT a.user_id) AS user_count
         FROM answers a;`
      );
      res.json(result.rows[0].user_count);
    } else {
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/results", authenticate, async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, получаем результаты
      const result = await pool.query(
        `SELECT q.question,
                COUNT(CASE WHEN a.answer = 1 THEN 1 END) AS option1_count,
                COUNT(CASE WHEN a.answer = 2 THEN 1 END) AS option2_count,
                COUNT(CASE WHEN a.answer = 3 THEN 1 END) AS option3_count,
                COUNT(CASE WHEN a.answer = 4 THEN 1 END) AS option4_count,
                COUNT(CASE WHEN a.answer = 5 THEN 1 END) AS option5_count
         FROM questions q
         LEFT JOIN answers a ON q.id = a.question_id
         GROUP BY q.id;`
      );
      res.json(result.rows);
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
  }
});


app.post("/change-password", async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    // Проверяем, является ли текущий пользователь администратором
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, обновляем пароль пользователя
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      await pool.query(
        "UPDATE users SET password = $1 WHERE username = $2",
        [hashedPassword, username]
      );
      res.json("Password updated successfully!");
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
  }
});
app.get("/users", async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, получаем список пользователей
      const result = await pool.query("SELECT * FROM users");
      res.json(result.rows);
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
  }
});


app.listen(3000, () => {
  console.log("Server started on port 3000");
});
