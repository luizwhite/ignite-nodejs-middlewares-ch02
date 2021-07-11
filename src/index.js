const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate: uuidValidate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(req, res, next) {
  const { username } = req.headers;
  if (!username)
    return res.status(400).json({ error: 'Username data is required!' });

  const userFound = users.find((user) => username === user.username);
  if (!userFound) return res.status(404).json({ error: 'Username not found!' });

  req.user = userFound;
  return next();
}

function checksCreateTodosUserAvailability(req, res, next) {
  const { user } = req;

  if (!user.pro && user.todos.length >= 10)
    return res
      .status(403)
      .json({ error: "User already has 10 To-Dos and he isn't a Pro member!" });

  return next();
}

function checksTodoExists(req, res, next) {
  const { username } = req.headers;
  const { id } = req.params;

  if (!username)
    return res.status(400).json({ error: 'Username data is required!' });
  if (!id || !uuidValidate(id))
    return res
      .status(400)
      .json({ error: 'To-Do id is required! Id must be an uuid!' });

  const userFound = users.find((user) => username === user.username);
  if (!userFound) return res.status(404).json({ error: 'Username not found!' });

  const todoFound = userFound.todos.find((todo) => id === todo.id);
  if (!todoFound)
    return res
      .status(404)
      .json({ error: 'To-Do with the given id not found!' });

  req.todo = todoFound;
  req.user = userFound;

  return next();
}

function findUserById(req, res, next) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'User id is required!' });

  const userFound = users.find((user) => id === user.id);
  if (!userFound) return res.status(404).json({ error: 'Username not found!' });

  req.user = userFound;
  return next();
}

app.post('/users', (req, res) => {
  const { name, username } = req.body;

  const usernameAlreadyExists = users.some(
    (user) => user.username === username
  );

  if (usernameAlreadyExists) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: [],
  };

  users.push(user);

  return res.status(201).json(user);
});

app.get('/users/:id', findUserById, (req, res) => {
  const { user } = req;

  return res.json(user);
});

app.patch('/users/:id/pro', findUserById, (req, res) => {
  const { user } = req;

  if (user.pro) {
    return res.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return res.json(user);
});

app.get('/todos', checksExistsUserAccount, (req, res) => {
  const { user } = req;

  return res.json(user.todos);
});

app.post(
  '/todos',
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  (req, res) => {
    const { title, deadline } = req.body;
    const { user } = req;

    const newTodo = {
      id: uuidv4(),
      title,
      deadline: new Date(deadline),
      done: false,
      created_at: new Date(),
    };

    user.todos.push(newTodo);

    return res.status(201).json(newTodo);
  }
);

app.put('/todos/:id', checksTodoExists, (req, res) => {
  const { title, deadline } = req.body;
  const { todo } = req;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return res.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (req, res) => {
  const { todo } = req;

  todo.done = true;

  return res.json(todo);
});

app.delete(
  '/todos/:id',
  checksExistsUserAccount,
  checksTodoExists,
  (req, res) => {
    const { user, todo } = req;

    const todoIndex = user.todos.indexOf(todo);

    if (todoIndex === -1) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    user.todos.splice(todoIndex, 1);

    return res.status(204).send();
  }
);

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById,
};
