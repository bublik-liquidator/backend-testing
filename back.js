const express = require("express");
const cors = require("cors");
var bcrypt = require("bcryptjs");
const app = express();
const EXPIRES_IN = "24h";

require("dotenv").config();
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use((err, req, res, next) => {
  if (err instanceof pg.Error) {
    console.error(err.message);
    res.status(500).json({ error: `Ошибка базы данных: ${err.message}` });
  } else {
    next(err);
  }
});

const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.POSTGRESQL_HOST,
  port: process.env.POSTGRESQL_PORT,
  user: process.env.POSTGRESQL_USER,
  password: process.env.POSTGRESQL_PASSWORD,
  database: process.env.POSTGRESQL_DATABASE,
});
const secret = process.env.SECRET;

const jwt = require("jsonwebtoken");

app.use(express.json());

app.get("/ping", (req, res) => {
  res.json("Server is up and running! KEK)23");
});

app.post("/login", async (req, res) => {
  try {
    const { name, password } = req.body;
    const result = await pool.query(`SELECT * FROM users WHERE name=$1`, [
      name,
    ]);
    if (result.rowCount === 1) {
      const user = result.rows[0];

      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        // Пароли совпадают, выполняем аутентификацию пользователя
        const isAdmin = user.role === "admin";
        const token = jwt.sign({ user_id: user.id, isAdmin }, secret, {
          expiresIn: EXPIRES_IN,
        });
        res.json({ token });
      } else {
        // Пароли не совпадают, отправляем ошибку
        res.status(401).json("Пароль не совпал");
      }
    } else {
      res.status(403).json("Такого юзера не существует");
      return "Такого юзера не существует";
    }
  } catch (err) {
    console.error(err.message + " ошибка в login функции");
    res.status(401).json("Error");
  }
});

const authenticate = async (req, res, next) => {
  try {
    //// console.log('Request headers:', req.headers);  Отслеживаем заголовки запроса
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
        // console.log("tokentokentokentokentokentokentoken     "+token)
    const decoded = jwt.verify(token, secret);
    req.user_id = decoded.user_id;

    pool.query(
      `SELECT name FROM users WHERE id = $1`,
      [req.user_id],
      (err, result) => {
        if (err) {
          console.error(err.message + " authenticate " + req.user_id);
          res.status(500).json("Internal server error");
        } else if (result.rowCount === 1) {
          req.name = result.rows[0].name;
          next();
        } else {
          res.status(401).json("Unauthorized");
        }
      }
    );
  } catch (err) {
    console.error("Error:", err); // Отслеживаем ошибку
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json("Invalid or expired token");
    } else if (err instanceof TypeError) {
      console.log("err " + err);

      res.status(400).json("Missing Authorization header");
    } else {
      res.status(500).json("Internal server error");
      return err;
    }
  }
};

app.post("/checkTest", authenticate, async (req, res) => {
  // Check if the user has already taken the test
  try {
    const checkResult = await pool.query(
      `SELECT * FROM answers WHERE user_id = $1`,
      [req.user_id]
    );
    if (checkResult.rowCount > 0) {
      res.status(409).json("Вы уже проходили этот тест");
    } else {
      // Get the group name and list of questions for the user
      const groupResult = await pool.query(
        `SELECT g.name AS group_name, q.*
         FROM users u
         JOIN groups g ON u.group_id = g.id
         JOIN questions q ON g.id = q.group_id
         WHERE u.id = $1`,
        [req.user_id]
      );

      const groupName = groupResult.rows[0].group_name;
      const questions = groupResult.rows.map((row) => ({
        id: row.id,
        question: row.question,
        option1: row.option1,
        option2: row.option2,
        option3: row.option3,
        option4: row.option4,
        option5: row.option5,
      }));
      res.json({ groupName, questions });
    }
  } catch (err) {
    console.error(err.message + "checkTest");
    res.status(401).json("Error");
  }
});

app.post("/test", authenticate, async (req, res) => {
  //получение теста из бд
  try {
    const checkResult = await pool.query(
      `SELECT * FROM answers WHERE user_id = $1`,
      [req.user_id]
    );
    if (checkResult.rowCount > 0) {
      res.status(403).json("You have already taken the test");
    } else {
      const { answers } = req.body;
      if (Array.isArray(answers)) {
        // Получаем идентификатор группы для пользователя
        const groupResult = await pool.query(
          `SELECT group_id FROM users WHERE id = $1`,
          [req.user_id]
        );
        const groupId = groupResult.rows[0].group_id;

        // Retrieve the id values of the questions from the questions table
        const questionIds = await pool.query(
          `SELECT id FROM questions WHERE group_id = $1 ORDER BY id`,
          [groupId]
        );

        let i = 0;
        let j = 0;
        while (i < answers.length && j < questionIds.rows.length) {
          // Use the retrieved question id values as the values for question_id
          await pool.query(
            `INSERT INTO answers(user_id, group_id, question_id, answer) VALUES ($1, $2, $3, $4)`,
            [req.user_id, groupId, questionIds.rows[j].id, answers[i]]
          );
          i++;
          j++;
        }
        res.json("Ответы успешно получены, спасибо)");
      } else {
        res.status(400).json("Invalid request");
      }
    }
  } catch (err) {
    console.error(err);
    return err;
  }
});

app.post("/users-not-completed", authenticate, async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, получаем список пользователей
      const result = await pool.query(
        `SELECT name
         FROM users
         WHERE NOT EXISTS (SELECT 1 FROM answers WHERE user_id = users.id);`
      );
      const names = result.rows.map((row) => row.name);
      res.json(names);
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message + "users-not-complete");
    res.status(401).json("Error");
  }
});

app.post("/user-count", authenticate, async (req, res) => {
  try {
const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Only allow the user with the name 'admin' to view the results
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
    res.status(401).json("Error");
  }
});

app.post("/results", authenticate, async (req, res) => {
  try {
const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, получаем результаты
      const result = await pool.query(
        `SELECT g.name AS group_name,
                q.question,
                COUNT(CASE WHEN a.answer = 1 THEN 1 END) AS option1_count,
                COUNT(CASE WHEN a.answer = 2 THEN 1 END) AS option2_count,
                COUNT(CASE WHEN a.answer = 3 THEN 1 END) AS option3_count,
                COUNT(CASE WHEN a.answer = 4 THEN 1 END) AS option4_count,
                COUNT(CASE WHEN a.answer = 5 THEN 1 END) AS option5_count
         FROM questions q
         JOIN groups g ON q.group_id = g.id
         LEFT JOIN answers a ON q.id = a.question_id
         GROUP BY g.id, g.name, q.id
         ORDER BY g.id`
      );
      res.json(result.rows);
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
    res.status(401).json("Error");
  }
});

app.post("/users", async (req, res) => {
  try {
const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      const result = await pool.query(`SELECT * FROM users`);
      res.json(result.rows);
    } else {
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
    res.status(401).json("Error");
  }
});

app.post("/change-password", async (req, res) => {
  try {
    const { name, newPassword, groups_name } = req.body;
    // Check if the current user is an administrator
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Check if the user exists
      const user = await pool.query(`SELECT * FROM users WHERE name = $1`, [
        name,
      ]);
      if (user.rowCount > 0) {
        // User exists, update their password and group_id
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Retrieve the id of the group with the specified groups_name
        const groupResult = await pool.query(
          `SELECT id FROM groups WHERE name = $1`,
          [groups_name]
        );
        const group_id = groupResult.rows[0].id;

        await pool.query(
          `UPDATE users SET password = $1, group_id = $2 WHERE name = $3`,
          [hashedPassword, group_id, name]
        );
        res.json("пароль у юзера " + name + " у спешно изменён");
      } else {
        res.status(404).json("Такого юзера нет");
      }
    } else {
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message + " in change-password");
    res.status(401).json("Error");
  }
});

app.post("/add-question", async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, добавляем новый вопрос в таблицу
      const {
        question,
        option1,
        option2,
        option3,
        option4,
        option5,
        group_id,
      } = req.body;
      await pool.query(
        `INSERT INTO questions (question, option1, option2, option3, option4, option5, group_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [question, option1, option2, option3, option4, option5, group_id]
      );
      res.json("Вопрос " + question + " был успешно создан");
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
    res.status(401).json("Error");
  }
});

app.post("/get-questions", async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
     const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, получаем список вопросов из таблицы questions
      const result = await pool.query(
        `SELECT q.id, q.question, g.name AS group_name FROM questions q INNER JOIN groups g ON q.group_id = g.id ORDER BY q.group_id`
      );
      res.json(result.rows);
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
    res.status(401).json("Error");
  }
});

app.post("/update-question", async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, обновляем вопрос и опции в таблице questions
      const {
        questionId,
        question,
        option1,
        option2,
        option3,
        option4,
        option5,
        group_id,
      } = req.body;
      await pool.query(
        `UPDATE questions SET question = $1, option1 = $2, option2 = $3, option3 = $4, option4 = $5, option5 = $6, group_id = $7 WHERE id = $8`,
        [
          question,
          option1,
          option2,
          option3,
          option4,
          option5,
          group_id,
          questionId,
        ]
      );
      res.json("Вопрос " + question + " был успешно обновлён");
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
    res.status(401).json("Error");
  }
});

app.post("/add-user", async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
        const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // The user is an administrator, proceed with adding the new user

      // Extract the user data from the request body
      const { name, password, group_id, role } = req.body;

      // Check if a user with the specified name already exists in the table
      const result = await pool.query(`SELECT * FROM users WHERE name = $1`, [
        name,
      ]);

      if (result.rowCount > 0) {
        // A user with the specified name already exists, send an error response
        res.status(400).json("Error: Юзер с таким именем уже сущесвует");
      } else {
        // No user with the specified name exists, add the new user

        // Hash the password before storing it in the database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the users table
        await pool.query(
          `INSERT INTO users (name, password, group_id,role) VALUES ($1, $2, $3, $4)`,
          [name, hashedPassword, group_id, role]
        );

        // Send a success response
        res.json("Пользователь " + name + " был добавлен успешно");
      }
    } else {
      // The user is not an administrator, send an error response
      res
        .status(403)
        .json(
          "Error: Только администраторы могут добавлять новых пользователей"
        );
    }
  } catch (err) {
    console.error(err.message);
    res.status(401).json("Error");
  }
});

app.post("/get-ansver", async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, получаем список ответов из таблицы answers
      const result = await pool.query(
        `SELECT a.id, a.user_id, a.question_id, a.answer, g.name AS group_name FROM answers a INNER JOIN groups g ON a.group_id = g.id`
      );
      res.json(result.rows);
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
    res.status(401).json("Error");
  }
});

app.post("/clear-table", async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      // Текущий пользователь является администратором, удаляем указанную таблицу
      await pool.query(`DELETE FROM answers`);
      res.json("Таблица успешно очищенна");
    } else {
      // Текущий пользователь не является администратором, отправляем ошибку
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
    res.status(401).json("Error");
  }
});

app.post("/users_group_id", authenticate, async (req, res) => {
  try {
    // Проверяем, является ли текущий пользователь администратором
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      const groupResult = await pool.query(
        `SELECT name FROM groups`
      );
      res.json(groupResult.rows);
    } else {
      res.status(403).json("Forbidden");
      console.error(err.message);

    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

function generatePassword(length) {
  var charset = "abcdefghjkmnopqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ234567890"; // Исключены символы '1', 'i', 'I', 'l', 'L'
  var password = "";
  for (var i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

function generateUsers(numUsers, group_id1, group_id2) {
  var data = [];
  for (var i = 2; i <= numUsers; i++) {
      var user = {
          id: i,
          login: 'user' + i,
          password: generatePassword(6),
          group_id: ((i-1) <= numUsers/2) ? group_id1 : group_id2, 
          role: 'user' 
        };
      data.push(user);
  }
  return data;
}

app.post("/populate-users", authenticate, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);

    if (decodedToken.isAdmin) {
      const numUsers = req.body.numUsers;
      const group_id1 = req.body.group_id1;
      const group_id2 = req.body.group_id2;
      const usersData = generateUsers(numUsers, group_id1, group_id2);
      const loginPasswordData = [];
      const insertData = [];

      for (let user of usersData) {
        var saltRounds = 10;
        var hashedPassword = bcrypt.hashSync(user.password, saltRounds);
 
        // Получаем имя группы по ID группы
        const groupResult = await pool.query(`SELECT name FROM groups WHERE id = $1`, [user.group_id]);
        const groupName = groupResult.rows[0].name;

        loginPasswordData.push({name: user.login, password: user.password, group_name: groupName});
        insertData.push(`('${user.login}', '${hashedPassword}', ${user.group_id}, '${user.role}')`);
      }

      // Пакетная вставка
      await pool.query(`INSERT INTO users (name, password, group_id, role) VALUES ${insertData.join(", ")}`);

      res.json(loginPasswordData);

    } else {
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
    res.status(401).json("Error");
  }
});




app.post("/clear-tables", async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);
    if (decodedToken.isAdmin) {
      await pool.query(`DELETE FROM answers`);
      await pool.query(`DELETE FROM users WHERE role != 'admin'`);
      await pool.query(`ALTER SEQUENCE users_id_seq RESTART WITH 2`); // Сбросить счетчик ID
      res.json("Таблицы успешно очищены");
    } else {
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
    res.status(401).json("Error");
  }
});


app.get("/get-questions", authenticate, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);

    if (decodedToken.isAdmin) {
      const result = await pool.query(`SELECT * FROM questions`);
      const questionsData = result.rows;
      res.json(questionsData);
    } else {
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
    res.status(401).json("Error");
  }
});

app.get("/get-questions-massiv", authenticate, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secret);

    if (decodedToken.isAdmin) {
      const result = await pool.query(`SELECT question FROM questions`);
      const questionsData = result.rows.map(row => row.question);
      res.json(questionsData);
    } else {
      res.status(403).json("Forbidden");
    }
  } catch (err) {
    console.error(err.message);
    res.status(401).json("Error");
  }
});


app.listen(3000, () => {
  console.log(
    "Server started on POSTGRESQL_PORT  " + process.env.POSTGRESQL_PORT
  );
  console.log(
    "Server started on POSTGRESQL_HOST  " + process.env.POSTGRESQL_HOST
  );
  console.log(
    "Server started on POSTGRESQL_DATABASE  " + process.env.POSTGRESQL_DATABASE
  );
  console.log(
    "Server started on POSTGRESQL_PASSWORD  " + process.env.POSTGRESQL_PASSWORD
  );
  console.log(
    "Server started on POSTGRESQL_USER  " + process.env.POSTGRESQL_USER
  );
});
