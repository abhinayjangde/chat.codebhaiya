import { describe, expect, it } from "vitest";
import {
  resumeDataSchema,
  updateResumeBodySchema,
  exportFormatQuerySchema,
} from "./resume.schema.js";

describe("resume.schema", () => {
  describe("resumeDataSchema", () => {
    it("validates a full resume data object", () => {
      const data = {
        personalInfo: {
          fullName: "Alex Mercer",
          headline: "Staff Engineer",
          email: "alex@example.com",
          phone: "+1 555-0199",
          location: "San Francisco, CA",
          linkedin: "https://linkedin.com/in/alexmercer",
          github: "https://github.com/alexmercer",
        },
        summary: "10+ years architecting scalable cloud platforms.",
        skills: [
          { category: "Languages", items: ["TypeScript", "Go", "Python"] },
          { category: "Cloud", items: ["AWS", "Kubernetes", "Terraform"] },
        ],
        experience: [
          {
            company: "Tech Corp",
            position: "Staff Software Engineer",
            location: "San Francisco, CA",
            startDate: "2021",
            endDate: "Present",
            highlights: ["Led migration to microservices", "Improved system uptime to 99.99%"],
          },
        ],
        education: [
          {
            institution: "UC Berkeley",
            degree: "B.S. in Computer Science",
            startDate: "2015",
            endDate: "2019",
            gpa: "3.9",
          },
        ],
        projects: [
          {
            name: "CloudMesh",
            description: "Service mesh observability tool",
            technologies: ["Go", "eBPF", "Grafana"],
            link: "https://github.com/alexmercer/cloudmesh",
            highlights: ["5k+ GitHub stars"],
          },
        ],
        certifications: [
          {
            name: "AWS Certified Solutions Architect",
            issuer: "Amazon Web Services",
            date: "2023",
          },
        ],
      };

      const result = resumeDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("requires a full name in personalInfo", () => {
      const result = resumeDataSchema.safeParse({
        personalInfo: {
          fullName: "",
        },
        summary: "",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("updateResumeBodySchema", () => {
    it("accepts valid template and title with data", () => {
      const result = updateResumeBodySchema.safeParse({
        title: "Senior SRE Resume",
        template: "classic",
        targetRole: "Site Reliability Engineer",
        data: {
          personalInfo: { fullName: "Jane Doe" },
          summary: "Expert in reliability engineering.",
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.template).toBe("classic");
      }
    });

    it("rejects invalid template enum", () => {
      const result = updateResumeBodySchema.safeParse({
        template: "neon-futuristic",
        data: {
          personalInfo: { fullName: "Jane Doe" },
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe("exportFormatQuerySchema", () => {
    it("accepts valid formats: docx, pdf, txt, latex", () => {
      expect(exportFormatQuerySchema.safeParse({ format: "docx" }).success).toBe(true);
      expect(exportFormatQuerySchema.safeParse({ format: "pdf" }).success).toBe(true);
      expect(exportFormatQuerySchema.safeParse({ format: "txt" }).success).toBe(true);
      expect(exportFormatQuerySchema.safeParse({ format: "latex" }).success).toBe(true);
    });

    it("rejects unsupported format", () => {
      expect(exportFormatQuerySchema.safeParse({ format: "html" }).success).toBe(false);
    });
  });
});
