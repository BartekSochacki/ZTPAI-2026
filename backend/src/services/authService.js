const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../errors/AppError');
const userRepository = require('../repositories/userRepository');
const { toUserDto } = require('../utils/dto');

function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

async function register({ email, password, firstName, lastName }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw AppError.conflict('Email is already registered', 'EMAIL_TAKEN');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userRepository.create({
    email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    role: 'MEMBER'
  });
  return { token: signToken(user), user: toUserDto(user) };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!passwordMatches) {
    throw AppError.unauthorized('Invalid email or password');
  }
  return { token: signToken(user), user: toUserDto(user) };
}

async function me(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  return toUserDto(user);
}

module.exports = { register, login, me, signToken };
