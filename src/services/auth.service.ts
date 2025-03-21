import { InputUser } from '../types/auth';
import * as bcrypt from 'bcrypt';
import prisma from '../db';

export async function createUser(user: InputUser) {
  try {
    user = hashUserPassword(user);
    // await User.create(user);
    await prisma.user.create({ data: user });
    return;
  } catch (error) {
    throw error;
  }
}

function hashUserPassword(user: InputUser) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(user.password, salt);
  user.password = hash;
  return user;
}
