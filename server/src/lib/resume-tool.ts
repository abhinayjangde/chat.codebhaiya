import { tool } from "langchain";
import * as z from "zod";
import { ObjectId } from "mongodb";
import { Resume, type IResumeData } from "../models/resume.model.js";

export function createResumeTool(
  chatId: string,
  userId: string,
  onResumeUpdated?: (resume: any) => void
) {
  return tool(
    async ({ title, template, targetRole, targetCompany, data }) => {
      console.log(`📄 Executing save_or_update_resume for chat: ${chatId}`);

      const resolvedTitle = title || (targetRole ? `${targetRole} Resume` : "Professional Resume");
      const resolvedTemplate = template || "modern";

      const updated = await Resume.findOneAndUpdate(
        { chatId: new ObjectId(chatId), userId: new ObjectId(userId) },
        {
          $set: {
            title: resolvedTitle,
            template: resolvedTemplate,
            ...(targetRole ? { targetRole } : {}),
            ...(targetCompany ? { targetCompany } : {}),
            data,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId),
            createdAt: new Date(),
          },
        },
        { upsert: true, returnDocument: "after" }
      ).lean();

      if (onResumeUpdated) {
        try {
          onResumeUpdated(updated);
        } catch (err) {
          console.error("Error invoking onResumeUpdated callback:", err);
        }
      }

      return JSON.stringify({
        success: true,
        message: "Resume successfully saved and synchronized with the side-by-side preview panel.",
        resumeId: updated._id.toString(),
        title: updated.title,
        template: updated.template,
        candidateName: data.personalInfo?.fullName || "Candidate",
        experienceCount: data.experience?.length || 0,
        skillCategoryCount: data.skills?.length || 0,
      });
    },
    {
      name: "save_or_update_resume",
      description:
        "Saves or updates the user's structured resume in the database and updates the real-time side-by-side view panel. Call this tool when the user asks to create, update, or refine a resume, or after analyzing resume details and attached PDFs.",
      schema: z.object({
        title: z
          .string()
          .describe("A descriptive title, e.g. 'Senior Full Stack Engineer Resume'"),
        template: z
          .enum(["modern", "classic", "minimal", "executive"])
          .default("modern")
          .describe("The visual template style"),
        targetRole: z
          .string()
          .optional()
          .describe("Target job title or profession"),
        targetCompany: z
          .string()
          .optional()
          .describe("Target company or organization if specified"),
        data: z
          .object({
            personalInfo: z.object({
              fullName: z.string().describe("Full name of the candidate"),
              headline: z.string().optional().describe("Professional headline/title"),
              email: z.string().optional().describe("Contact email address"),
              phone: z.string().optional().describe("Contact phone number"),
              location: z.string().optional().describe("City, State or Country"),
              website: z.string().optional().describe("Portfolio website URL"),
              linkedin: z.string().optional().describe("LinkedIn profile URL"),
              github: z.string().optional().describe("GitHub profile URL"),
            }),
            summary: z
              .string()
              .describe(
                "A compelling, high-impact professional summary (3-4 sentences) highlighting experience, core competencies, and career value."
              ),
            skills: z
              .array(
                z.object({
                  category: z.string().describe("e.g. 'Languages', 'Frameworks', 'Cloud & DevOps'"),
                  items: z.array(z.string()).describe("List of skills/tools in this category"),
                })
              )
              .describe("Categorized technical and professional skills"),
            experience: z
              .array(
                z.object({
                  company: z.string().describe("Company or organization name"),
                  position: z.string().describe("Job title or role"),
                  location: z.string().optional().describe("Location or Remote"),
                  startDate: z.string().describe("e.g. 'Jan 2022' or '2022'"),
                  endDate: z.string().describe("e.g. 'Present' or 'Dec 2024'"),
                  highlights: z
                    .array(z.string())
                    .describe(
                      "Action-driven bullet points using STAR / Google XYZ formula (e.g. 'Architected X, resulting in Y% latency reduction by implementing Z')"
                    ),
                })
              )
              .describe("Work experience in reverse chronological order"),
            education: z
              .array(
                z.object({
                  institution: z.string().describe("University or College name"),
                  degree: z.string().describe("Degree title, e.g. 'B.S. in Computer Science'"),
                  fieldOfStudy: z.string().optional(),
                  location: z.string().optional(),
                  startDate: z.string().optional(),
                  endDate: z.string().describe("Graduation year or date range"),
                  gpa: z.string().optional(),
                  highlights: z.array(z.string()).optional(),
                })
              )
              .describe("Educational history"),
            projects: z
              .array(
                z.object({
                  name: z.string().describe("Project title"),
                  description: z.string().describe("Brief project overview"),
                  technologies: z.array(z.string()).describe("Technologies used"),
                  link: z.string().optional().describe("Live demo or GitHub link"),
                  highlights: z.array(z.string()).describe("Key accomplishments or metrics"),
                })
              )
              .describe("Key projects"),
            certifications: z
              .array(
                z.object({
                  name: z.string(),
                  issuer: z.string(),
                  date: z.string().optional(),
                  url: z.string().optional(),
                })
              )
              .optional()
              .describe("Professional certifications"),
            customSections: z
              .array(
                z.object({
                  title: z.string(),
                  items: z.array(z.string()),
                })
              )
              .optional()
              .describe("Optional custom sections like Awards, Volunteer, or Publications"),
          })
          .describe("The complete structured resume JSON data"),
      }),
    }
  );
}
