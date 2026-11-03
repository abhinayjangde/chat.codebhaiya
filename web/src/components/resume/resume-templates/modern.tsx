"use client";

import React from "react";
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from "lucide-react";
import type { IResumeData } from "@/lib/types";

interface TemplateProps {
  data: IResumeData;
}

export function ModernTemplate({ data }: TemplateProps) {
  const p = data.personalInfo || {};

  return (
    <div className="mx-auto w-full max-w-[800px] bg-white text-zinc-900 p-8 sm:p-12 shadow-sm rounded-lg font-sans text-sm leading-relaxed border border-zinc-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none">
      {/* Header */}
      <header className="border-b-2 border-blue-600 pb-5 mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-900 tracking-tight">
          {p.fullName || "Your Full Name"}
        </h1>
        {p.headline && (
          <p className="text-base sm:text-lg font-medium text-zinc-600 mt-1">
            {p.headline}
          </p>
        )}

        {/* Contact Info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-zinc-600">
          {p.email && (
            <a
              href={`mailto:${p.email}`}
              className="inline-flex items-center gap-1.5 hover:text-blue-600 transition"
            >
              <Mail className="h-3.5 w-3.5 text-blue-600" />
              <span>{p.email}</span>
            </a>
          )}
          {p.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-blue-600" />
              <span>{p.phone}</span>
            </span>
          )}
          {p.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              <span>{p.location}</span>
            </span>
          )}
        </div>

        {/* Social / Portfolio Links */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-blue-600">
          {p.linkedin && (
            <a
              href={p.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              <Linkedin className="h-3.5 w-3.5" />
              <span>LinkedIn</span>
            </a>
          )}
          {p.github && (
            <a
              href={p.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              <Github className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </a>
          )}
          {p.website && (
            <a
              href={p.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Portfolio</span>
            </a>
          )}
        </div>
      </header>

      {/* Professional Summary */}
      {data.summary && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-zinc-200 pb-1 mb-2">
            Professional Summary
          </h2>
          <p className="text-zinc-700 leading-relaxed">{data.summary}</p>
        </section>
      )}

      {/* Work Experience */}
      {data.experience && data.experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-zinc-200 pb-1 mb-3">
            Work Experience
          </h2>
          <div className="space-y-4">
            {data.experience.map((exp, index) => (
              <div key={index}>
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="font-bold text-zinc-900 text-sm">
                    {exp.position}{" "}
                    <span className="font-semibold text-blue-800">
                      — {exp.company}
                    </span>
                  </h3>
                  <span className="text-xs font-medium text-zinc-500">
                    {exp.startDate} – {exp.endDate}
                  </span>
                </div>
                {exp.location && (
                  <p className="text-xs text-zinc-500 mb-1">{exp.location}</p>
                )}
                {exp.highlights && exp.highlights.length > 0 && (
                  <ul className="list-disc list-outside ml-4 mt-1 space-y-1 text-zinc-700 text-xs sm:text-[13px]">
                    {exp.highlights.map((hl, hlIdx) => (
                      <li key={hlIdx} className="leading-snug">
                        {hl}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {data.skills && data.skills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-zinc-200 pb-1 mb-2.5">
            Technical Skills
          </h2>
          <div className="space-y-2">
            {data.skills.map((cat, index) => (
              <div key={index} className="flex flex-wrap items-baseline gap-1.5 text-xs">
                <span className="font-bold text-zinc-800 min-w-[120px]">
                  {cat.category}:
                </span>
                <span className="text-zinc-700">
                  {cat.items.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-zinc-200 pb-1 mb-3">
            Education
          </h2>
          <div className="space-y-3">
            {data.education.map((edu, index) => (
              <div key={index}>
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="font-bold text-zinc-900 text-sm">
                    {edu.degree}
                    {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}{" "}
                    <span className="font-semibold text-zinc-700">
                      — {edu.institution}
                    </span>
                  </h3>
                  <span className="text-xs font-medium text-zinc-500">
                    {edu.startDate ? `${edu.startDate} – ` : ""}
                    {edu.endDate}
                  </span>
                </div>
                {(edu.location || edu.gpa) && (
                  <p className="text-xs text-zinc-500">
                    {edu.location ? edu.location : ""}
                    {edu.location && edu.gpa ? " | " : ""}
                    {edu.gpa ? `GPA: ${edu.gpa}` : ""}
                  </p>
                )}
                {edu.highlights && edu.highlights.length > 0 && (
                  <ul className="list-disc list-outside ml-4 mt-1 space-y-1 text-zinc-700 text-xs">
                    {edu.highlights.map((hl, hlIdx) => (
                      <li key={hlIdx}>{hl}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Projects */}
      {data.projects && data.projects.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-zinc-200 pb-1 mb-3">
            Key Projects
          </h2>
          <div className="space-y-3">
            {data.projects.map((proj, index) => (
              <div key={index}>
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="font-bold text-zinc-900 text-sm">
                    {proj.name}
                    {proj.technologies?.length ? (
                      <span className="font-normal text-zinc-600 text-xs ml-2">
                        ({proj.technologies.join(", ")})
                      </span>
                    ) : null}
                  </h3>
                  {proj.link && (
                    <a
                      href={proj.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Project Link
                    </a>
                  )}
                </div>
                {proj.description && (
                  <p className="text-xs text-zinc-600 mt-0.5">{proj.description}</p>
                )}
                {proj.highlights && proj.highlights.length > 0 && (
                  <ul className="list-disc list-outside ml-4 mt-1 space-y-1 text-zinc-700 text-xs">
                    {proj.highlights.map((hl, hlIdx) => (
                      <li key={hlIdx}>{hl}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-zinc-200 pb-1 mb-2">
            Certifications
          </h2>
          <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-zinc-700">
            {data.certifications.map((cert, index) => (
              <li key={index}>
                <span className="font-semibold text-zinc-800">{cert.name}</span> —{" "}
                {cert.issuer}
                {cert.date ? ` (${cert.date})` : ""}
                {cert.url && (
                  <a
                    href={cert.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    Credential
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Custom Sections */}
      {data.customSections && data.customSections.length > 0 && (
        <>
          {data.customSections.map((cs, index) => (
            <section key={index} className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-zinc-200 pb-1 mb-2">
                {cs.title}
              </h2>
              <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-zinc-700">
                {cs.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
