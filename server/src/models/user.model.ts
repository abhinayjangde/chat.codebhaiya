import mongoose from "mongoose";
import type { HydratedDocument, Model } from "mongoose";
import bcrypt from "bcrypt";

export type UserStatus = "active" | "pending_deletion";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  status: UserStatus;
  deletedAt?: Date | null;
  deletionScheduledAt?: Date | null;
  preferences: {
    theme: "light" | "dark";
    defaultModel: string;
    language?: "english" | "hinglish";
    systemInstructions?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

type UserModel = Model<IUser, {}, IUserMethods>;
type UserDocument = HydratedDocument<IUser, IUserMethods>;

const SALT_ROUNDS = 12;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema<IUser, UserModel, IUserMethods>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: EMAIL_REGEX,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    status: {
      type: String,
      enum: ["active", "pending_deletion"],
      default: "active",
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletionScheduledAt: {
      type: Date,
      default: null,
      index: true,
    },
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark"],
        default: "light",
      },
      defaultModel: {
        type: String,
        default: "nemotron-3-nano:30b",
      },
      language: {
        type: String,
        enum: ["english", "hinglish"],
        default: "english",
      },
      systemInstructions: {
        type: String,
        trim: true,
        maxlength: 4_000,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function () {
  const user = this as UserDocument;

  if (!user.isModified("password")) return;

  user.password = await hashPassword(user.password);
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

export const User = mongoose.model<IUser, UserModel>("User", userSchema);
