import jwt from "jsonwebtoken";
import type { IUser } from "../models/user.model.js";
import { User, hashPassword } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { env } from "../config/env.js";

const JWT_SECRET = env.JWT_SECRET;
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;
const JWT_ACCESS_EXPIRY = env.JWT_ACCESS_EXPIRY;
const JWT_REFRESH_EXPIRY = env.JWT_REFRESH_EXPIRY;

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ user: IUser; tokens: AuthTokens }> {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists with this email");
  }

  const hashedPassword = await hashPassword(password);
  
  const user = await User.create({
    email,
    password: hashedPassword,
    name,
  });

  const tokens = generateTokens(user);
  return { user, tokens };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: IUser; tokens: AuthTokens }> {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await (user as any).comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const tokens = generateTokens(user);
  return { user, tokens };
}

export function generateTokens(user: IUser): AuthTokens {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY as any,
  });

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY as any,
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    return generateTokens(user);
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Delete all messages and chats owned by this user
  await Message.deleteMany({ userId });
  await Chat.deleteMany({ userId });

  // Delete the user
  await User.findByIdAndDelete(userId);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Verify current password
  const isMatch = await (user as any).comparePassword(currentPassword);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  // Ensure new password differs from the old one
  const isSame = await (user as any).comparePassword(newPassword);
  if (isSame) {
    throw new Error("New password must be different from the current password");
  }

  // Hash and save the new password
  user.password = await hashPassword(newPassword);
  user.updatedAt = new Date();
  await user.save();
}
