import { InputUserLogin, InputUserSignup } from '../types/auth';
import * as bcrypt from 'bcrypt';
import prisma from '../db';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET;

export async function createUser(user: InputUserSignup) {
  try {
    user = hashUserPassword(user);
    // await User.create(user);
    await prisma.user.create({ data: user });
    return;
  } catch (error) {
    throw error;
  }
}

export async function getUserByName(userName: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { name: userName },
    });
    return user;
  } catch (error) {
    throw error;
  }
}
export async function getUserByEmail(userEmail: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });
    return user;
  } catch (error) {
    throw error;
  }
}

export async function checkPasswordMatch(password: string, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return bcrypt.compareSync(password, user.password);
  } catch (error) {
    throw error;
  }
}

export async function createJWTFromUser(user: User) {
  const userPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
  };
  return jwt.sign(userPayload, JWT_SECRET);
}

function hashUserPassword(user: InputUserSignup) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(user.password, salt);
  user.password = hash;
  return user;
}
