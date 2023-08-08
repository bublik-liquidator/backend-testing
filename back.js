const express = require("express");
const cors = require("cors");
var bcrypt = require('bcryptjs');
const app = express();
const rateLimit = require("express-rate-limit");

require("dotenv").config();
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

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later",
});

app.get("/ping", (req, res) => {
  res.json("Server is up and running!");
});

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
        [username, hashedPassword, "user"]
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

app.post("/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (result.rowCount === 1) {
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        // Пароли совпадают, выполняем аутентификацию пользователя
        const isAdmin = user.role === "admin";
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

app.get("/test", authenticate, async (req, res) => {
  //проверка что юзер проходил тест
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

app.post("/test", authenticate, async (req, res) => {
  //получение теста из бд
  try {
    const checkResult = await pool.query(
      "SELECT * FROM answers WHERE user_id = $1",
      [req.user_id]
    );

    if (checkResult.rowCount > 0) {
      res.status(403).json("You have already taken the test");
    } else {
      const { answers } = req.body;
      if (Array.isArray(answers) && answers.length <= MAX_ANSWERS) {
        for (let i = 0; i < answers.length; i++) {
          await pool.query(
            "INSERT INTO answers (user_id, question_id, answer) VALUES ($1, $2, $3)",
            [req.user_id, i + 1, answers[i]]
          );
        }

        res.json("Answers submitted successfully!");
      } else {
        res.status(400).json("Invalid request");
      }
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/users-not-completed", authenticate, async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, получаем список пользователей
      const result = await pool.query(
        `SELECT username
         FROM users
         WHERE NOT EXISTS (SELECT 1 FROM answers WHERE user_id = users.id);`
      );
      const usernames = result.rows.map((row) => row.username);
      res.json(usernames);
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
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
    const { username, newPassword, tableName } = req.body;
    // Check if the current user is an administrator
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // The current user is an administrator, update the user's password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      await pool.query(`UPDATE ${tableName} SET password = $1 WHERE username = $2`, [
        hashedPassword,
        username,
      ]);
      res.json("Password updated successfully!");
    } else {
      // The current user is not an administrator, send an error
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/users", async (req, res) => {
  try {
    // Get the table name from the query parameters
    const tableName = req.query.tableName;
    // Check if the current user is an administrator
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // The current user is an administrator, get the list of users
      const result = await pool.query(`SELECT * FROM ${tableName}`);
      res.json(result.rows);
    } else {
      // The current user is not an administrator, send an error
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/create-tables", async (req, res) => {
  try {
    // Check if the current user is an administrator
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // The current user is an administrator, create new tables
      const { tableName, answersName,users } = req.body;
      await pool.query(`
        CREATE TABLE ${tableName} (
          id SERIAL PRIMARY KEY,
          question TEXT NOT NULL,
          option1 TEXT NOT NULL,
          option2 TEXT NOT NULL,
          option3 TEXT NOT NULL,
          option4 TEXT NOT NULL,
          option5 TEXT NOT NULL
        );
        CREATE TABLE ${answersName} (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES ${users}(id),
          question_id INTEGER NOT NULL REFERENCES ${tableName}(id),
          answer INTEGER NOT NULL CHECK (answer >= 1 AND answer <= 5)
        );
        CREATE TABLE ${users} (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL
        );
      `);
      res.json("Tables created successfully!");
    } else {
      // The current user is not an administrator, send an error
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/add-question", async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, добавляем новый вопрос в таблицу
      const {
        tableName,
        question,
        option1,
        option2,
        option3,
        option4,
        option5,
      } = req.body;
      await pool.query(
        `INSERT INTO ${tableName} (question, option1, option2, option3, option4, option5) VALUES ($1, $2, $3, $4, $5, $6)`,
        [question, option1, option2, option3, option4, option5]
      );
      res.json("Question added successfully!");
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/tables", async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, получаем список таблиц
      const result = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
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

app.post("/delete-table", async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, удаляем указанную таблицу
      const { tableName } = req.body;
      await pool.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
      res.json("Table deleted successfully!");
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/get-questions", async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, получаем список вопросов из указанной таблицы
      const { tableName } = req.query;
      const result = await pool.query(`SELECT id, question FROM ${tableName}`);
      res.json(result.rows);
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/update-question", async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, обновляем вопрос и опции в указанной таблице
      const { tableName, questionId, question, option1, option2, option3, option4, option5 } = req.body;
      await pool.query(
        `UPDATE ${tableName} SET question = $1, option1 = $2, option2 = $3, option3 = $4, option4 = $5, option5 = $6 WHERE id = $7`,
        [question, option1, option2, option3, option4, option5, questionId]
      );
      res.json("Question updated successfully!");
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
