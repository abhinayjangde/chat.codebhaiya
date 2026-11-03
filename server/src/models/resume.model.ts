import mongoose, { Schema, type Document as MongoDocument } from "mongoose";

export interface IResumePersonal {
  fullName: string;
  headline?: string;
  email: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
}

export interface IResumeExperience {
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate: string;
  highlights: string[];
}

export interface IResumeEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  location?: string;
  startDate?: string;
  endDate: string;
  gpa?: string;
  highlights?: string[];
}

export interface IResumeSkillCategory {
  category: string;
  items: string[];
}

export interface IResumeProject {
  name: string;
  description: string;
  technologies: string[];
  link?: string;
  highlights: string[];
}

export interface IResumeCertification {
  name: string;
  issuer: string;
  date?: string;
  url?: string;
}

export interface IResumeCustomSection {
  title: string;
  items: string[];
}

export interface IResumeData {
  personalInfo: IResumePersonal;
  summary: string;
  skills: IResumeSkillCategory[];
  experience: IResumeExperience[];
  education: IResumeEducation[];
  projects: IResumeProject[];
  certifications?: IResumeCertification[];
  customSections?: IResumeCustomSection[];
}

export interface IResumeDoc extends MongoDocument {
  chatId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  template: "modern" | "classic" | "minimal" | "executive";
  targetRole?: string;
  targetCompany?: string;
  data: IResumeData;
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<IResumeDoc>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "Professional Resume" },
    template: {
      type: String,
      enum: ["modern", "classic", "minimal", "executive"],
      default: "modern",
    },
    targetRole: { type: String },
    targetCompany: { type: String },
    data: {
      personalInfo: {
        fullName: { type: String, default: "" },
        headline: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        location: { type: String, default: "" },
        website: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        github: { type: String, default: "" },
      },
      summary: { type: String, default: "" },
      skills: [
        {
          category: { type: String, required: true },
          items: [{ type: String }],
        },
      ],
      experience: [
        {
          company: { type: String, required: true },
          position: { type: String, required: true },
          location: { type: String },
          startDate: { type: String, required: true },
          endDate: { type: String, required: true },
          highlights: [{ type: String }],
        },
      ],
      education: [
        {
          institution: { type: String, required: true },
          degree: { type: String, required: true },
          fieldOfStudy: { type: String },
          location: { type: String },
          startDate: { type: String },
          endDate: { type: String, required: true },
          gpa: { type: String },
          highlights: [{ type: String }],
        },
      ],
      projects: [
        {
          name: { type: String, required: true },
          description: { type: String, default: "" },
          technologies: [{ type: String }],
          link: { type: String },
          highlights: [{ type: String }],
        },
      ],
      certifications: [
        {
          name: { type: String, required: true },
          issuer: { type: String, required: true },
          date: { type: String },
          url: { type: String },
        },
      ],
      customSections: [
        {
          title: { type: String, required: true },
          items: [{ type: String }],
        },
      ],
    },
  },
  { timestamps: true }
);

export const Resume = mongoose.model<IResumeDoc>("Resume", resumeSchema);
