"use client";

import React from "react";
import type { IResumeData } from "@/lib/types";

interface TemplateProps {
  data: IResumeData;
}

export function ClassicTemplate({ data }: TemplateProps) {
  const p = data.personalInfo || {};

  return (
    <div className="mx-auto w-full max-w-[800px] bg-white text-black p-8 sm:p-12 shadow-sm rounded-none font-serif text-sm leading-relaxed border border-zinc-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none">
      {/* Header - Centered ATS Format */}
      <header className="text-center pb-4 mb-5 border-b border-zinc-800">
        <h1 className="text-3xl font-bold tracking-normal uppercase">
          {p.fullName || "Full Name"}
        </h1>
        {p.headline && (
          <p className="text-sm italic text-zinc-800 mt-0.5">{p.headline}</p>
        )}

        {/* Contact info separated by bullets */}
        <div className="mt-2 text-xs text-zinc-800 space-x-2">
          {p.email && <span>{p.email}</span>}
          {p.phone && <span>• {p.phone}</span>}
          {p.location && <span>• {p.location}</span>}
        </div>

        {/* Links */}
        <div className="mt-1 text-xs text-zinc-800 space-x-2">
          {p.linkedin && (
            <a href={p.linkedin} target="_blank" rel="noreferrer" className="underline">
              LinkedIn
            </a>
          )}
          {p.github && (
            <a href={p.github} target="_blank" rel="noreferrer" className="underline">
              • GitHub
            </a>
          )}
          {p.website && (
            <a href={p.website} target="_blank" rel="noreferrer" className="underline">
              • Portfolio
            </a>
          )}
        </div>
      </header>

      {/* Summary */}
      {data.summary && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest border-b border-zinc-400 pb-0.5 mb-2">
            Professional Summary
          </h2>
          <p className="text-xs sm:text-sm text-zinc-900 leading-relaxed text-justify">
            {data.summary}
          </p>
        </section>
      )}

      {/* Work Experience */}
      {data.experience && data.experience.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest border-b border-zinc-400 pb-0.5 mb-2.5">
            Work Experience
          </h2>
          <div className="space-y-4">
            {data.experience.map((exp, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline font-bold text-sm">
                  <span>{exp.position}, {exp.company}</span>
                  <span className="text-xs font-normal italic">
                    {exp.startDate} – {exp.endDate}
                  </span>
                </div>
                {exp.location && (
                  <p className="text-xs italic text-zinc-700">{exp.location}</p>
                )}
                {exp.highlights && exp.highlights.length > 0 && (
                  <ul className="list-disc list-outside ml-4 mt-1 space-y-1 text-xs">
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

      {/* Technical Skills */}
      {data.skills && data.skills.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest border-b border-zinc-400 pb-0.5 mb-2">
            Skills & Competencies
          </h2>
          <ul className="list-disc list-outside ml-4 space-y-1 text-xs">
            {data.skills.map((sc, index) => (
              <li key={index}>
                <span className="font-bold">{sc.category}:</span>{" "}
                <span>{sc.items.join(", ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest border-b border-zinc-400 pb-0.5 mb-2.5">
            Education
          </h2>
          <div className="space-y-3">
            {data.education.map((edu, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline font-bold text-sm">
                  <span>
                    {edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}, {edu.institution}
                  </span>
                  <span className="text-xs font-normal italic">
                    {edu.startDate ? `${edu.startDate} – ` : ""}{edu.endDate}
                  </span>
                </div>
                {(edu.location || edu.gpa) && (
                  <p className="text-xs italic text-zinc-700">
                    {edu.location ? edu.location : ""}
                    {edu.location && edu.gpa ? " | " : ""}
                    {edu.gpa ? `GPA: ${edu.gpa}` : ""}
                  </p>
                )}
                {edu.highlights && edu.highlights.length > 0 && (
                  <ul className="list-disc list-outside ml-4 mt-1 space-y-1 text-xs">
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
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest border-b border-zinc-400 pb-0.5 mb-2.5">
            Projects
          </h2>
          <div className="space-y-3">
            {data.projects.map((proj, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline font-bold text-xs sm:text-sm">
                  <span>
                    {proj.name}
                    {proj.technologies?.length ? ` (${proj.technologies.join(", ")})` : ""}
                  </span>
                  {proj.link && (
                    <a href={proj.link} target="_blank" rel="noreferrer" className="text-xs underline font-normal">
                      Link
                    </a>
                  )}
                </div>
                {proj.description && (
                  <p className="text-xs italic text-zinc-800 mt-0.5">{proj.description}</p>
                )}
                {proj.highlights && proj.highlights.length > 0 && (
                  <ul className="list-disc list-outside ml-4 mt-1 space-y-1 text-xs">
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
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest border-b border-zinc-400 pb-0.5 mb-2">
            Certifications
          </h2>
          <ul className="list-disc list-outside ml-4 space-y-1 text-xs">
            {data.certifications.map((cert, index) => (
              <li key={index}>
                <span className="font-bold">{cert.name}</span> — {cert.issuer}
                {cert.date ? ` (${cert.date})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
