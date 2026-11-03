import * as z from "zod";

export const resumeDataSchema = z.object({
  personalInfo: z.object({
    fullName: z.string().min(1, "Full name is required"),
    headline: z.string().optional().default(""),
    email: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    location: z.string().optional().default(""),
    website: z.string().optional().default(""),
    linkedin: z.string().optional().default(""),
    github: z.string().optional().default(""),
  }),
  summary: z.string().default(""),
  skills: z.array(
    z.object({
      category: z.string(),
      items: z.array(z.string()),
    })
  ).default([]),
  experience: z.array(
    z.object({
      company: z.string(),
      position: z.string(),
      location: z.string().optional().default(""),
      startDate: z.string(),
      endDate: z.string(),
      highlights: z.array(z.string()).default([]),
    })
  ).default([]),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      fieldOfStudy: z.string().optional().default(""),
      location: z.string().optional().default(""),
      startDate: z.string().optional().default(""),
      endDate: z.string(),
      gpa: z.string().optional().default(""),
      highlights: z.array(z.string()).default([]),
    })
  ).default([]),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string().default(""),
      technologies: z.array(z.string()).default([]),
      link: z.string().optional().default(""),
      highlights: z.array(z.string()).default([]),
    })
  ).default([]),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string(),
      date: z.string().optional().default(""),
      url: z.string().optional().default(""),
    })
  ).optional().default([]),
  customSections: z.array(
    z.object({
      title: z.string(),
      items: z.array(z.string()),
    })
  ).optional().default([]),
});

export const updateResumeBodySchema = z.object({
  title: z.string().optional(),
  template: z.enum(["modern", "classic", "minimal", "executive"]).optional(),
  targetRole: z.string().optional(),
  targetCompany: z.string().optional(),
  data: resumeDataSchema,
});

export const exportFormatQuerySchema = z.object({
  format: z.enum(["docx", "pdf", "txt", "latex"]),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;
export type UpdateResumeBody = z.infer<typeof updateResumeBodySchema>;
