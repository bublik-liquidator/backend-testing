CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    role TEXT NOT NULL
);


CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    option1 TEXT NOT NULL,
    option2 TEXT NOT NULL,
    option3 TEXT NOT NULL,
    option4 TEXT NOT NULL,
    option5 TEXT NOT NULL,
    group_id INTEGER NOT NULL REFERENCES groups(id)
);

CREATE TABLE answers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    group_id INTEGER NOT NULL REFERENCES groups(id),
    question_id INTEGER NOT NULL REFERENCES questions(id),
    answer INTEGER NOT NULL CHECK (answer >= 1 AND answer <= 5)
);

INSERT INTO groups (id, name) VALUES
(1, 'Group 1'),
(2, 'Group 2'),
(3, 'Group 3');



INSERT INTO questions (question, option1, option2, option3, option4, option5, group_id)
VALUES ('Занятия преподавателя информативны, не содержат "воды"', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель свободно отвечает на вопросы учащихся по теме занятия', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель обычно зачитывает материал занятия "читает по бумажке"', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель может допускать ошибки и неточности в изложении материала', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель объясняет значение данного предмета для будущей профессии', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель приводит примеры из реальной практики профессиональной деятельности', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель умеет организовать интересную дискуссию по теме занятия', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель обычно интересуется, какие вопросы вызывают у учащихся затруднения', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель излагает материал в доступной для понимания форме', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Обычно мне понятна логика изложения материала преподавателем', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Обычно мне понятны задания, которые даёт преподаватель на занятиях', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Вопросы на экзамене или зачёте соответствуют материалам занятий', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Обычно мне понятны задания, которые даёт преподаватель для самостоятельного выполнения', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель обычно комментирует результаты контрольных, проверочных работ, тестов', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель отмечает присутствие учащихся на занятиях', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель обычно точно соблюдает учебное расписание (вовремя начинает и заканчивает занятие, делает перерыв)', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель повышает голос, проявляет неуважение к учащимся', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель не учитывает жизненные обстоятельства учащихся, послужившие причиной невыполнения его требований', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель учитывает пожелание учащихся относительно организации занятия', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Преподаватель заинтересовывает излагаемым материалом', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',2),
       ('Преподаватель обозначает систему требований и чётко её соблюдает', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',1),
       ('Я бы рекомендовал курс данного преподавателя другим учащимся', 'Полностью согласен', 'Скорее согласен', 'Отчасти согласен отчасти нет', 'Полностью не согласен', 'Затрудняюсь ответить не могу оценить',2);



INSERT INTO users (name, password, role, group_id) VALUES
 ('user1', '$2b$10$YHqVeF8y/80staBMCclKlevZ0TyudE.7Ibi1DkwElaSl6VTiiqZti', 'user',1),
 ('user2', '$2b$10$MsLx.lZVQ/4B0dmm2WpAduHK.i1piomS0FTcQNGNPi7eDrsKlll22', 'user',1),
 ('user3', '$2b$10$Pupwh75gL4UsEdDgJa2te.VbAfocPcF7kO/PRE37COrLmLBQ/560q', 'user',1),
 ('user4', '$2b$10$h6pbw3j.ppXdXeP6UMiBsuMzWCnhy6PVrNOY/W0tyAJNzX7IEASxK', 'user',1),
 ('user5', '$2b$10$6jZlO/CoqFk7RVRALVIdTeEvkpenQraT2RMQu8ZZ07HasmCLeqUWa', 'user',1),
 ('user6', '$2b$10$7Smq88V5Lr0Y8GYgdTr19eBjBcJWZ.YhNJga.1Ck5SmUwoTG2cEnm', 'user',1),
 ('user7', '$2b$10$/vwTGn62suJEo5vnii/rqunnsPMgSsenlkW.lAMM2WDA0DWKKqqfa', 'user',1),
 ('user8', '$2b$10$pYFQfLdaX6Tp5xMj1K9fre0brNlB4N4DmDG.XknXnWF5ZU09Ee5dK', 'user',1),
 ('user9', '$2b$10$VpuRZShoLCgLQ6WZdtfG5eN.hvnTIgxhuEMql4u83TbkMIeN78Lta', 'user',1),
 ('user10', '$2b$10$68lUSAQfZ81osDiuwO9HZOg7DclB3ITUcsKRDVC13kMTzAyts2/N.', 'user',1),
 ('user11', '$2b$10$HbAEXF2mOGiPGAXvy.HQweimUvumFoASAXTValvvFqboglvmQCMAO', 'user',1),
 ('user12', '$2b$10$82P3uqb3bosQDoJUqPkW4.fCEfI4uOKbYqSWom7wiQhXadoHHX9zG', 'user',1),
 ('user13', '$2b$10$ec2zejfr1ggL41ct8H/apOROLxc7SsU6Jh3HK7NC3DXZeC/Y8tR2y', 'user',1),
 ('user14', '$2b$10$BjYwzaENxfmlD8suz05TMuk5JiGTahabeYdqMfNce0iyq74shgetO', 'user',1),
 ('user15', '$2b$10$DiF.3L5hCA4S4BBdgo5FGeFkZqzx0eRPkN3GgQ2fVL0lmTIZLckGy', 'user',1),
 ('user16', '$2b$10$eIQKJE4r/CoSGeEajW1IbOM1cc7yfKpG3Nz74ocvhZhCPJe0q6LsG', 'user',1),
 ('user17', '$2b$10$Dm5ks4O/BugEhlfHWlFTf.06JtvuoJB8optuuwUqLG6ksWU1hkq82', 'user',1),
 ('user18', '$2b$10$ex9.jPoeQTArlRglqAUTtekN2bowjNVbbg0UhmG.s/RvtfYMAYVxW', 'user',1),
 ('user19', '$2b$10$gwB.Tj5y/merZITVAylP0.rvaSm5rFCLwlJga4Zj.CMuuq08AL3aC', 'user',1),
 ('user20', '$2b$10$yPaxSTLQwZrfqbjW3L8Bge6F8PUR8j/YsWBy3A50p.TLkX1L.peGW', 'user',1),
 ('user21', '$2b$10$ikelw4oil2gLM7MgCoI7petWOj5198wRuRE2DzPD.iQAwos67VkPu', 'user',1),
 ('user22', '$2b$10$CoyMqDgxfdCgcSDYyssWGuxHX0pffFtwpGtu7Vi1BNgM4KLGEFQn.', 'user',1),
 ('user23', '$2b$10$dfp7Jk2ojgQt0vNqH0cKcOOxNWzacXdG2C5dv4HP9K9y4q8jl3O9K', 'user',1),
 ('user24', '$2b$10$cityU6FS5eUHxUBjuef/j.nSszawf1anq62f/YwZTATAQ5C9TsUsG', 'user',1),
 ('user25', '$2b$10$H9lQNcGLRQeLhpioy9UhEerlkoviFKkJRvqx6Sv9YQVC.Iu044VvO', 'user',1),
 ('user26', '$2b$10$T8k7Z1wUuKKNizAxh8YN2.YyQFyO4M5fS.RCjb6I.7HWk1A6/FDVi', 'user',1),
 ('user27', '$2b$10$5G0ZMVT.T9dXhCcoZnFVyuRB43txsgG/qO87dLHcRPLlhbcV7W/JO', 'user',3),
 ('user28', '$2b$10$UHvQmlKyKK3H3IV8t6VO7.BjT3iKhqPg5oHiQxcqKBbSVPZe1Zm7.', 'user',1),
 ('user29', '$2b$10$3gJrsCni79F.40YMxMxiU.bGUNBvVyBPxk6FpZMbn4diCht/5VG.2', 'user',2),
 ('user30', '$2b$10$Zw9REHl2Zii.3GxQlFJEheOfh.m/HBnhcvd8DX17fViUVY7qp0FEu', 'user',2);