# Preface

**!IMPORTANT!** Some aspects of the technical specifications and certain parts of the project itself are **not entirely logical**. Ideally, they should be adapted for potential expansion of the project, etc. However, **the client wanted it this way**. Plus, according to my estimates, theoretically, adapting for future modernization and improvement of the project would have taken more time and, as a result, the project would not have been ready on time.
P.S. Wherever possible, I made it as adaptable as possible for future improvements.

# Project Description

This is a project: [Testing](https://github.com/bublik-liquidator/testing/tree/main)

<h3>There are entities user and admin</h3>

**User** this entity can pass the test: there are about 20-30 questions in the test, for each question there are 5 possible answers, the user can choose only one answer out of 5.
After selecting all the answers, the user clicks the Send button and that's all the features and functionality for user.

**Admin** is an entity that cannot take the test. However, it can:

- View the number of users who have passed the test.
- View the users who have not passed the test.
- Get test results in a table: the total selection of a specific answer to a question is shown, i.e. how many users chose a particular answer option to a question. The results are sorted by groups.
- Save the results as a table on their device in .docx format.
- Add information before saving the results: date and a brief description of the results.
- Get the names of all users and their group_id.
- Change the password and group_id of a user.
- Create a new user: new_name, new_password, new_group_id.
- Update the content of a question and its answers.
- Get information from the table where user IDs and their answer options are stored.
- Clear user answers in the table.

<h3>Database</h3>
<figure>
  <img src="pictures/DB/1.png" alt="Database schema">
  <figcaption>Database schema</figcaption>
</figure>

**Users** stores information about users: id, name, password, group_id.
**Groups** stores information about groups that users can belong to: id, name. **!IMPORTANT!** A user can only belong to one group.
**Answers**tores information about user responses, i.e. when a user selects a specific answer to a question, this information is recorded in **Answers**: id, user_id, question_id, group_id, answer.
**Questions** stores information about questions and their answers, i.e. what the user sees during the test: id, group_id, question, option1, option2, option3, option4, option5.

## Technologies used:

- [Angular](https://github.com/bublik-liquidator/testing/tree/main)
- Node.js
- Express
- PostgreSQL 14
- Typescript

## Launch

- To launch: run the `back.js` file, in the console `nodemon`.
- To launch the [client side](https://github.com/bublik-liquidator/testing/tree/main):  in the console `ng serve`. Go to `http://localhost:4200 /`.

**## IMPORTANT**
The project is being modernized, so various bugs may occur. If you find any, please let me know😉
