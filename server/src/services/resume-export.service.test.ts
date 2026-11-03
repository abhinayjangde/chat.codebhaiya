import { describe, expect, it } from "vitest";
import {
  generateResumeDocx,
  generateResumeLatex,
  generateResumePdf,
  generateResumeTxt,
} from "./resume-export.service.js";

const sampleResume = {
  title: "Senior Full Stack Engineer Resume",
  data: {
    personalInfo: {
      fullName: "Priya Sharma",
      headline: "Senior Full Stack Engineer",
      email: "priya@example.com",
      phone: "+91 9876543210",
      location: "Bengaluru, India",
      linkedin: "https://linkedin.com/in/priyasharma",
      github: "https://github.com/priyasharma",
      website: "https://priyasharma.dev",
    },
    summary:
      "Full-stack engineer with 6+ years of experience designing scalable web architectures, microservices, and high-performance React frontends.",
    skills: [
      { category: "Languages", items: ["TypeScript", "JavaScript", "Python"] },
      { category: "Frontend", items: ["React", "Next.js", "Tailwind CSS"] },
      { category: "Backend & Cloud", items: ["Node.js", "PostgreSQL", "AWS", "Docker"] },
    ],
    experience: [
      {
        company: "InnovateTech",
        position: "Senior Software Engineer",
        location: "Bengaluru, India",
        startDate: "Jan 2022",
        endDate: "Present",
        highlights: [
          "Architected real-time notification engine handling 5M daily push events with 99.98% reliability.",
          "Spearheaded Next.js migration reducing initial bundle size by 42% and boosting Core Web Vitals to 95+.",
        ],
      },
    ],
    education: [
      {
        institution: "IIT Bombay",
        degree: "B.Tech in Computer Science",
        location: "Mumbai, India",
        startDate: "2016",
        endDate: "2020",
        gpa: "8.9/10",
        highlights: ["Dean's List for Academic Excellence"],
      },
    ],
    projects: [
      {
        name: "DevHub",
        description: "Open source collaborative code editor",
        technologies: ["React", "WebSockets", "Go"],
        link: "https://github.com/priyasharma/devhub",
        highlights: ["2,000+ active monthly developers"],
      },
    ],
    certifications: [
      {
        name: "AWS Certified Developer",
        issuer: "Amazon Web Services",
        date: "2023",
        url: "https://aws.amazon.com/verification",
      },
    ],
  },
};

describe("resume-export.service", () => {
  it("generates structured plain text resume", () => {
    const txt = generateResumeTxt(sampleResume as any);

    expect(txt).toContain("PRIYA SHARMA");
    expect(txt).toContain("Senior Full Stack Engineer");
    expect(txt).toContain("priya@example.com");
    expect(txt).toContain("PROFESSIONAL SUMMARY");
    expect(txt).toContain("WORK EXPERIENCE");
    expect(txt).toContain("InnovateTech");
    expect(txt).toContain("TECHNICAL SKILLS");
    expect(txt).toContain("Languages: TypeScript, JavaScript, Python");
    expect(txt).toContain("EDUCATION");
    expect(txt).toContain("IIT Bombay");
    expect(txt).toContain("PROJECTS");
    expect(txt).toContain("DevHub");
  });

  it("generates compilable LaTeX code with escaped characters", () => {
    const latex = generateResumeLatex(sampleResume as any);

    expect(latex).toContain("\\documentclass[10pt,a4paper]{article}");
    expect(latex).toContain("Priya Sharma");
    expect(latex).toContain("\\section{Professional Summary}");
    expect(latex).toContain("\\section{Work Experience}");
    expect(latex).toContain("InnovateTech");
    expect(latex).toContain("\\section{Technical Skills}");
    expect(latex).toContain("\\begin{document}");
    expect(latex).toContain("\\end{document}");
  });

  it("generates a valid DOCX buffer", async () => {
    const docxBuffer = await generateResumeDocx(sampleResume as any);

    expect(Buffer.isBuffer(docxBuffer)).toBe(true);
    expect(docxBuffer.length).toBeGreaterThan(1000);
    // Standard zip / docx magic header PK (0x50, 0x4B)
    expect(docxBuffer[0]).toBe(0x50);
    expect(docxBuffer[1]).toBe(0x4b);
  });

  it("generates a valid PDF buffer", async () => {
    const pdfBuffer = await generateResumePdf(sampleResume as any);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF magic header %PDF (0x25, 0x50, 0x44, 0x46)
    expect(pdfBuffer.toString("utf8", 0, 4)).toBe("%PDF");
  });
});
