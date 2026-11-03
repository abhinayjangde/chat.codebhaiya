import PDFDocument from "pdfkit";
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Packer,
  ExternalHyperlink,
} from "docx";
import type { IResumeData, IResumeDoc } from "../models/resume.model.js";

function escapeLatex(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

export function generateResumeTxt(resume: { title: string; data: IResumeData }): string {
  const { data } = resume;
  const p = data.personalInfo || {};
  const lines: string[] = [];
  const divider = "=".repeat(80);
  const subDivider = "-".repeat(80);

  // Header
  lines.push(divider);
  lines.push(p.fullName ? p.fullName.toUpperCase() : "RESUME");
  if (p.headline) lines.push(p.headline);

  const contactParts: string[] = [];
  if (p.email) contactParts.push(p.email);
  if (p.phone) contactParts.push(p.phone);
  if (p.location) contactParts.push(p.location);
  if (contactParts.length > 0) lines.push(contactParts.join(" | "));

  const linkParts: string[] = [];
  if (p.linkedin) linkParts.push(`LinkedIn: ${p.linkedin}`);
  if (p.github) linkParts.push(`GitHub: ${p.github}`);
  if (p.website) linkParts.push(`Portfolio: ${p.website}`);
  if (linkParts.length > 0) lines.push(linkParts.join(" | "));
  lines.push(divider);
  lines.push("");

  // Summary
  if (data.summary) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push(subDivider);
    lines.push(data.summary);
    lines.push("");
  }

  // Experience
  if (data.experience && data.experience.length > 0) {
    lines.push("WORK EXPERIENCE");
    lines.push(subDivider);
    for (const exp of data.experience) {
      const locStr = exp.location ? ` | ${exp.location}` : "";
      lines.push(`${exp.position} — ${exp.company}${locStr}`);
      lines.push(`${exp.startDate} - ${exp.endDate}`);
      if (exp.highlights && exp.highlights.length > 0) {
        for (const hl of exp.highlights) {
          lines.push(`  * ${hl}`);
        }
      }
      lines.push("");
    }
  }

  // Skills
  if (data.skills && data.skills.length > 0) {
    lines.push("TECHNICAL SKILLS");
    lines.push(subDivider);
    for (const skillCat of data.skills) {
      lines.push(`* ${skillCat.category}: ${skillCat.items.join(", ")}`);
    }
    lines.push("");
  }

  // Education
  if (data.education && data.education.length > 0) {
    lines.push("EDUCATION");
    lines.push(subDivider);
    for (const edu of data.education) {
      const fieldStr = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : "";
      const locStr = edu.location ? ` | ${edu.location}` : "";
      const gpaStr = edu.gpa ? ` (GPA: ${edu.gpa})` : "";
      lines.push(`${edu.degree}${fieldStr} — ${edu.institution}${locStr}${gpaStr}`);
      lines.push(`${edu.startDate ? `${edu.startDate} - ` : ""}${edu.endDate}`);
      if (edu.highlights && edu.highlights.length > 0) {
        for (const hl of edu.highlights) {
          lines.push(`  * ${hl}`);
        }
      }
      lines.push("");
    }
  }

  // Projects
  if (data.projects && data.projects.length > 0) {
    lines.push("PROJECTS");
    lines.push(subDivider);
    for (const proj of data.projects) {
      const techStr = proj.technologies?.length ? ` (${proj.technologies.join(", ")})` : "";
      lines.push(`${proj.name}${techStr}`);
      if (proj.link) lines.push(`  Link: ${proj.link}`);
      if (proj.description) lines.push(`  ${proj.description}`);
      if (proj.highlights && proj.highlights.length > 0) {
        for (const hl of proj.highlights) {
          lines.push(`  * ${hl}`);
        }
      }
      lines.push("");
    }
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    lines.push("CERTIFICATIONS");
    lines.push(subDivider);
    for (const cert of data.certifications) {
      const dateStr = cert.date ? ` (${cert.date})` : "";
      lines.push(`* ${cert.name} — ${cert.issuer}${dateStr}`);
      if (cert.url) lines.push(`  Credential: ${cert.url}`);
    }
    lines.push("");
  }

  // Custom Sections
  if (data.customSections && data.customSections.length > 0) {
    for (const section of data.customSections) {
      lines.push(section.title.toUpperCase());
      lines.push(subDivider);
      for (const item of section.items) {
        lines.push(`* ${item}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function generateResumeLatex(resume: { title: string; data: IResumeData }): string {
  const { data } = resume;
  const p = data.personalInfo || {};

  const lines: string[] = [
    "\\documentclass[10pt,a4paper]{article}",
    "\\usepackage[utf8]{inputenc}",
    "\\usepackage[margin=0.7in]{geometry}",
    "\\usepackage{hyperref}",
    "\\usepackage{enumitem}",
    "\\usepackage{titlesec}",
    "\\usepackage{xcolor}",
    "",
    "\\hypersetup{colorlinks=true, linkcolor=blue, urlcolor=blue}",
    "\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0em}{}[\\titlerule]",
    "\\titlespacing*{\\section}{0pt}{1.2ex plus .2ex minus .2ex}{0.8ex}",
    "\\setlist[itemize]{leftmargin=*,noitemsep,topsep=0.3ex}",
    "",
    "\\begin{document}",
    "\\pagestyle{empty}",
    "",
    "% Header",
    "\\begin{center}",
    `  {\\Huge \\textbf{${escapeLatex(p.fullName || "Resume")}}} \\\\ \\vspace{4pt}`,
  ];

  if (p.headline) {
    lines.push(`  {\\large \\textit{${escapeLatex(p.headline)}}} \\\\ \\vspace{4pt}`);
  }

  const contacts: string[] = [];
  if (p.email) contacts.push(`\\href{mailto:${escapeLatex(p.email)}}{${escapeLatex(p.email)}}`);
  if (p.phone) contacts.push(escapeLatex(p.phone));
  if (p.location) contacts.push(escapeLatex(p.location));
  if (contacts.length > 0) {
    lines.push(`  ${contacts.join(" $\\cdot$ ")} \\\\`);
  }

  const links: string[] = [];
  if (p.linkedin) links.push(`\\href{${escapeLatex(p.linkedin)}}{LinkedIn}`);
  if (p.github) links.push(`\\href{${escapeLatex(p.github)}}{GitHub}`);
  if (p.website) links.push(`\\href{${escapeLatex(p.website)}}{Portfolio}`);
  if (links.length > 0) {
    lines.push(`  ${links.join(" $\\cdot$ ")}`);
  }

  lines.push("\\end{center}", "\\vspace{6pt}", "");

  // Summary
  if (data.summary) {
    lines.push("\\section{Professional Summary}");
    lines.push(escapeLatex(data.summary));
    lines.push("");
  }

  // Experience
  if (data.experience && data.experience.length > 0) {
    lines.push("\\section{Work Experience}");
    for (const exp of data.experience) {
      const loc = exp.location ? `\\textit{${escapeLatex(exp.location)}}` : "";
      lines.push(`\\noindent \\textbf{${escapeLatex(exp.position)}} -- \\textbf{${escapeLatex(exp.company)}} \\hfill ${loc} \\\\`);
      lines.push(`\\textit{${escapeLatex(exp.startDate)} -- ${escapeLatex(exp.endDate)}}`);
      if (exp.highlights && exp.highlights.length > 0) {
        lines.push("\\begin{itemize}");
        for (const hl of exp.highlights) {
          lines.push(`  \\item ${escapeLatex(hl)}`);
        }
        lines.push("\\end{itemize}");
      }
      lines.push("\\vspace{4pt}");
    }
  }

  // Skills
  if (data.skills && data.skills.length > 0) {
    lines.push("\\section{Technical Skills}");
    lines.push("\\begin{itemize}");
    for (const sc of data.skills) {
      lines.push(`  \\item \\textbf{${escapeLatex(sc.category)}}: ${escapeLatex(sc.items.join(", "))}`);
    }
    lines.push("\\end{itemize}");
    lines.push("");
  }

  // Education
  if (data.education && data.education.length > 0) {
    lines.push("\\section{Education}");
    for (const edu of data.education) {
      const field = edu.fieldOfStudy ? ` in ${escapeLatex(edu.fieldOfStudy)}` : "";
      const loc = edu.location ? `\\textit{${escapeLatex(edu.location)}}` : "";
      const gpa = edu.gpa ? ` \\hfill \\textbf{GPA:} ${escapeLatex(edu.gpa)}` : "";
      lines.push(`\\noindent \\textbf{${escapeLatex(edu.degree)}${field}} -- \\textbf{${escapeLatex(edu.institution)}} \\hfill ${loc} \\\\`);
      lines.push(`\\textit{${edu.startDate ? `${escapeLatex(edu.startDate)} -- ` : ""}${escapeLatex(edu.endDate)}}${gpa}`);
      if (edu.highlights && edu.highlights.length > 0) {
        lines.push("\\begin{itemize}");
        for (const hl of edu.highlights) {
          lines.push(`  \\item ${escapeLatex(hl)}`);
        }
        lines.push("\\end{itemize}");
      }
      lines.push("\\vspace{4pt}");
    }
  }

  // Projects
  if (data.projects && data.projects.length > 0) {
    lines.push("\\section{Key Projects}");
    for (const proj of data.projects) {
      const tech = proj.technologies?.length ? ` [\\textit{${escapeLatex(proj.technologies.join(", "))}}]` : "";
      const link = proj.link ? ` \\hfill \\href{${escapeLatex(proj.link)}}{View Project}` : "";
      lines.push(`\\noindent \\textbf{${escapeLatex(proj.name)}}${tech}${link}`);
      if (proj.description) {
        lines.push(`\\\\ ${escapeLatex(proj.description)}`);
      }
      if (proj.highlights && proj.highlights.length > 0) {
        lines.push("\\begin{itemize}");
        for (const hl of proj.highlights) {
          lines.push(`  \\item ${escapeLatex(hl)}`);
        }
        lines.push("\\end{itemize}");
      }
      lines.push("\\vspace{4pt}");
    }
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    lines.push("\\section{Certifications}");
    lines.push("\\begin{itemize}");
    for (const cert of data.certifications) {
      const date = cert.date ? ` (${escapeLatex(cert.date)})` : "";
      const link = cert.url ? ` -- \\href{${escapeLatex(cert.url)}}{Credential}` : "";
      lines.push(`  \\item \\textbf{${escapeLatex(cert.name)}} -- ${escapeLatex(cert.issuer)}${date}${link}`);
    }
    lines.push("\\end{itemize}");
    lines.push("");
  }

  // Custom Sections
  if (data.customSections && data.customSections.length > 0) {
    for (const cs of data.customSections) {
      lines.push(`\\section{${escapeLatex(cs.title)}}`);
      lines.push("\\begin{itemize}");
      for (const item of cs.items) {
        lines.push(`  \\item ${escapeLatex(item)}`);
      }
      lines.push("\\end{itemize}");
      lines.push("");
    }
  }

  lines.push("\\end{document}");
  return lines.join("\n");
}

export async function generateResumeDocx(resume: { title: string; data: IResumeData }): Promise<Buffer> {
  const { data } = resume;
  const p = data.personalInfo || {};
  const children: Paragraph[] = [];

  // Header: Full Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: p.fullName || "Resume",
          bold: true,
          size: 32, // 16pt
          color: "1E3A8A", // Navy accent
        }),
      ],
    })
  );

  // Headline
  if (p.headline) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: p.headline,
            italics: true,
            size: 22,
            color: "4B5563",
          }),
        ],
      })
    );
  }

  // Contact Info Line
  const contactTextRuns: TextRun[] = [];
  if (p.email) contactTextRuns.push(new TextRun({ text: p.email, size: 19 }));
  if (p.phone) {
    if (contactTextRuns.length > 0) contactTextRuns.push(new TextRun({ text: "  |  ", color: "9CA3AF" }));
    contactTextRuns.push(new TextRun({ text: p.phone, size: 19 }));
  }
  if (p.location) {
    if (contactTextRuns.length > 0) contactTextRuns.push(new TextRun({ text: "  |  ", color: "9CA3AF" }));
    contactTextRuns.push(new TextRun({ text: p.location, size: 19 }));
  }
  if (contactTextRuns.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: contactTextRuns,
      })
    );
  }

  // Links Line
  const linkTextRuns: (TextRun | ExternalHyperlink)[] = [];
  if (p.linkedin) {
    linkTextRuns.push(
      new ExternalHyperlink({
        children: [new TextRun({ text: "LinkedIn", color: "2563EB", underline: {}, size: 19 })],
        link: p.linkedin,
      })
    );
  }
  if (p.github) {
    if (linkTextRuns.length > 0) linkTextRuns.push(new TextRun({ text: "  |  ", color: "9CA3AF" }));
    linkTextRuns.push(
      new ExternalHyperlink({
        children: [new TextRun({ text: "GitHub", color: "2563EB", underline: {}, size: 19 })],
        link: p.github,
      })
    );
  }
  if (p.website) {
    if (linkTextRuns.length > 0) linkTextRuns.push(new TextRun({ text: "  |  ", color: "9CA3AF" }));
    linkTextRuns.push(
      new ExternalHyperlink({
        children: [new TextRun({ text: "Portfolio", color: "2563EB", underline: {}, size: 19 })],
        link: p.website,
      })
    );
  }
  if (linkTextRuns.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: linkTextRuns,
      })
    );
  }

  const createSectionHeading = (title: string): Paragraph => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 80 },
      border: {
        bottom: {
          color: "1E3A8A",
          space: 4,
          style: BorderStyle.SINGLE,
          size: 12,
        },
      },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 22,
          color: "1E3A8A",
        }),
      ],
    });
  };

  // Summary Section
  if (data.summary) {
    children.push(createSectionHeading("Professional Summary"));
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: data.summary, size: 20 })],
      })
    );
  }

  // Work Experience
  if (data.experience && data.experience.length > 0) {
    children.push(createSectionHeading("Work Experience"));
    for (const exp of data.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({ text: exp.position, bold: true, size: 21 }),
            new TextRun({ text: ` — ${exp.company}`, bold: true, color: "374151", size: 21 }),
            new TextRun({
              text: exp.location ? ` | ${exp.location}` : "",
              color: "6B7280",
              size: 19,
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `${exp.startDate} – ${exp.endDate}`,
              italics: true,
              color: "4B5563",
              size: 18,
            }),
          ],
        })
      );

      if (exp.highlights && exp.highlights.length > 0) {
        for (const hl of exp.highlights) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 40 },
              children: [new TextRun({ text: hl, size: 19 })],
            })
          );
        }
      }
    }
  }

  // Skills
  if (data.skills && data.skills.length > 0) {
    children.push(createSectionHeading("Technical Skills"));
    for (const sc of data.skills) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          bullet: { level: 0 },
          children: [
            new TextRun({ text: `${sc.category}: `, bold: true, size: 20 }),
            new TextRun({ text: sc.items.join(", "), size: 20 }),
          ],
        })
      );
    }
  }

  // Education
  if (data.education && data.education.length > 0) {
    children.push(createSectionHeading("Education"));
    for (const edu of data.education) {
      const fieldStr = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : "";
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({ text: `${edu.degree}${fieldStr}`, bold: true, size: 21 }),
            new TextRun({ text: ` — ${edu.institution}`, color: "374151", size: 21 }),
          ],
        })
      );

      const eduMeta: TextRun[] = [
        new TextRun({
          text: `${edu.startDate ? `${edu.startDate} – ` : ""}${edu.endDate}`,
          italics: true,
          color: "4B5563",
          size: 18,
        }),
      ];
      if (edu.location) {
        eduMeta.push(new TextRun({ text: ` | ${edu.location}`, color: "6B7280", size: 18 }));
      }
      if (edu.gpa) {
        eduMeta.push(new TextRun({ text: ` | GPA: ${edu.gpa}`, bold: true, size: 18 }));
      }
      children.push(new Paragraph({ spacing: { after: 60 }, children: eduMeta }));

      if (edu.highlights && edu.highlights.length > 0) {
        for (const hl of edu.highlights) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 40 },
              children: [new TextRun({ text: hl, size: 19 })],
            })
          );
        }
      }
    }
  }

  // Projects
  if (data.projects && data.projects.length > 0) {
    children.push(createSectionHeading("Key Projects"));
    for (const proj of data.projects) {
      const projHeader: (TextRun | ExternalHyperlink)[] = [
        new TextRun({ text: proj.name, bold: true, size: 21 }),
      ];
      if (proj.technologies?.length) {
        projHeader.push(
          new TextRun({
            text: ` (${proj.technologies.join(", ")})`,
            italics: true,
            color: "4B5563",
            size: 18,
          })
        );
      }
      if (proj.link) {
        projHeader.push(new TextRun({ text: " — ", color: "9CA3AF" }));
        projHeader.push(
          new ExternalHyperlink({
            children: [new TextRun({ text: "Link", color: "2563EB", underline: {}, size: 18 })],
            link: proj.link,
          })
        );
      }
      children.push(new Paragraph({ spacing: { before: 80, after: 40 }, children: projHeader }));

      if (proj.description) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: proj.description, size: 19 })],
          })
        );
      }

      if (proj.highlights && proj.highlights.length > 0) {
        for (const hl of proj.highlights) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 40 },
              children: [new TextRun({ text: hl, size: 19 })],
            })
          );
        }
      }
    }
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    children.push(createSectionHeading("Certifications"));
    for (const cert of data.certifications) {
      const certRuns: (TextRun | ExternalHyperlink)[] = [
        new TextRun({ text: cert.name, bold: true, size: 20 }),
        new TextRun({ text: ` — ${cert.issuer}`, size: 20 }),
      ];
      if (cert.date) {
        certRuns.push(new TextRun({ text: ` (${cert.date})`, italics: true, color: "6B7280", size: 18 }));
      }
      if (cert.url) {
        certRuns.push(new TextRun({ text: " | ", color: "9CA3AF" }));
        certRuns.push(
          new ExternalHyperlink({
            children: [new TextRun({ text: "Credential", color: "2563EB", underline: {}, size: 18 })],
            link: cert.url,
          })
        );
      }
      children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: certRuns }));
    }
  }

  // Custom Sections
  if (data.customSections && data.customSections.length > 0) {
    for (const cs of data.customSections) {
      children.push(createSectionHeading(cs.title));
      for (const item of cs.items) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: item, size: 19 })],
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 in
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

export async function generateResumePdf(resume: { title: string; data: IResumeData }): Promise<Buffer> {
  const { data } = resume;
  const p = data.personalInfo || {};

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 36, bottom: 36, left: 40, right: 40 },
    });

    const buffers: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err: Error) => reject(err));

    const primaryColor = "#1E3A8A";
    const darkText = "#111827";
    const subText = "#4B5563";
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Name
    doc.font("Helvetica-Bold").fontSize(20).fillColor(primaryColor).text(p.fullName || "Resume", {
      align: "center",
      width: pageWidth,
    });

    // Headline
    if (p.headline) {
      doc.moveDown(0.2);
      doc.font("Helvetica-Oblique").fontSize(11).fillColor(subText).text(p.headline, {
        align: "center",
        width: pageWidth,
      });
    }

    // Contact
    const contacts: string[] = [];
    if (p.email) contacts.push(p.email);
    if (p.phone) contacts.push(p.phone);
    if (p.location) contacts.push(p.location);
    if (contacts.length > 0) {
      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(9).fillColor(subText).text(contacts.join("   •   "), {
        align: "center",
        width: pageWidth,
      });
    }

    // Links
    const links: string[] = [];
    if (p.linkedin) links.push(p.linkedin);
    if (p.github) links.push(p.github);
    if (p.website) links.push(p.website);
    if (links.length > 0) {
      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(8.5).fillColor("#2563EB").text(links.join("   •   "), {
        align: "center",
        width: pageWidth,
      });
    }

    doc.moveDown(0.8);

    const renderSectionHeader = (title: string) => {
      doc.moveDown(0.6);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(primaryColor).text(title.toUpperCase());
      const y = doc.y + 2;
      doc.strokeColor(primaryColor).lineWidth(1).moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + pageWidth, y).stroke();
      doc.moveDown(0.5);
    };

    // Summary
    if (data.summary) {
      renderSectionHeader("Professional Summary");
      doc.font("Helvetica").fontSize(9.5).fillColor(darkText).text(data.summary, {
        align: "left",
        width: pageWidth,
        lineGap: 2,
      });
    }

    // Experience
    if (data.experience && data.experience.length > 0) {
      renderSectionHeader("Work Experience");
      for (const exp of data.experience) {
        doc.moveDown(0.3);
        const startY = doc.y;

        doc.font("Helvetica-Bold").fontSize(10).fillColor(darkText).text(exp.position, { continued: true });
        doc.font("Helvetica").fontSize(10).fillColor("#374151").text(` — ${exp.company}${exp.location ? ` (${exp.location})` : ""}`);

        doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(subText).text(`${exp.startDate} – ${exp.endDate}`);

        if (exp.highlights && exp.highlights.length > 0) {
          doc.moveDown(0.2);
          for (const hl of exp.highlights) {
            doc.font("Helvetica").fontSize(9).fillColor(darkText).text(`•  ${hl}`, {
              indent: 10,
              width: pageWidth - 10,
              lineGap: 1.5,
            });
          }
        }
      }
    }

    // Skills
    if (data.skills && data.skills.length > 0) {
      renderSectionHeader("Technical Skills");
      for (const sc of data.skills) {
        doc.font("Helvetica-Bold").fontSize(9).fillColor(darkText).text(`•  ${sc.category}: `, {
          continued: true,
          indent: 6,
        });
        doc.font("Helvetica").fontSize(9).fillColor("#374151").text(sc.items.join(", "), {
          lineGap: 2,
        });
      }
    }

    // Education
    if (data.education && data.education.length > 0) {
      renderSectionHeader("Education");
      for (const edu of data.education) {
        doc.moveDown(0.3);
        const fieldStr = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : "";
        doc.font("Helvetica-Bold").fontSize(10).fillColor(darkText).text(`${edu.degree}${fieldStr}`, { continued: true });
        doc.font("Helvetica").fontSize(10).fillColor("#374151").text(` — ${edu.institution}${edu.location ? ` (${edu.location})` : ""}`);

        const dateGpa = `${edu.startDate ? `${edu.startDate} – ` : ""}${edu.endDate}${edu.gpa ? ` | GPA: ${edu.gpa}` : ""}`;
        doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(subText).text(dateGpa);

        if (edu.highlights && edu.highlights.length > 0) {
          for (const hl of edu.highlights) {
            doc.font("Helvetica").fontSize(9).fillColor(darkText).text(`•  ${hl}`, {
              indent: 10,
              width: pageWidth - 10,
            });
          }
        }
      }
    }

    // Projects
    if (data.projects && data.projects.length > 0) {
      renderSectionHeader("Key Projects");
      for (const proj of data.projects) {
        doc.moveDown(0.3);
        const techStr = proj.technologies?.length ? ` (${proj.technologies.join(", ")})` : "";
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor(darkText).text(proj.name, { continued: true });
        doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(subText).text(techStr);

        if (proj.link) {
          doc.font("Helvetica").fontSize(8).fillColor("#2563EB").text(`Link: ${proj.link}`);
        }
        if (proj.description) {
          doc.font("Helvetica").fontSize(9).fillColor(darkText).text(proj.description, {
            indent: 8,
            width: pageWidth - 8,
          });
        }
        if (proj.highlights && proj.highlights.length > 0) {
          for (const hl of proj.highlights) {
            doc.font("Helvetica").fontSize(9).fillColor(darkText).text(`•  ${hl}`, {
              indent: 10,
              width: pageWidth - 10,
            });
          }
        }
      }
    }

    // Certifications
    if (data.certifications && data.certifications.length > 0) {
      renderSectionHeader("Certifications");
      for (const cert of data.certifications) {
        doc.font("Helvetica-Bold").fontSize(9).fillColor(darkText).text(`•  ${cert.name}`, { continued: true });
        doc.font("Helvetica").fontSize(9).fillColor(subText).text(` — ${cert.issuer}${cert.date ? ` (${cert.date})` : ""}`);
      }
    }

    // Custom Sections
    if (data.customSections && data.customSections.length > 0) {
      for (const cs of data.customSections) {
        renderSectionHeader(cs.title);
        for (const item of cs.items) {
          doc.font("Helvetica").fontSize(9).fillColor(darkText).text(`•  ${item}`, {
            indent: 10,
            width: pageWidth - 10,
          });
        }
      }
    }

    doc.end();
  });
}
