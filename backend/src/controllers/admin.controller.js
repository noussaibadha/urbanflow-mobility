import * as UsersModel from '../models/users.model.js';

export async function listUsers(req, res, next) {
  try {
    const users = await UsersModel.findAll();
    res.json({ users, total: users.length });
  } catch (err) {
    next(err);
  }
}
