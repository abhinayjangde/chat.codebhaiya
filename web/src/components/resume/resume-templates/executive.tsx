"use client";

import React from "react";
import type { IResumeData } from "@/lib/types";

interface TemplateProps {
  data: IResumeData;
}

export function ExecutiveTemplate({ data }: TemplateProps) {
  const p = data.personalInfo || {};

  return (
    <div className="mx-auto w-full max-w-[800px] bg-white text-zinc-900 p-8 sm:p-12 shadow-sm rounded-lg font-sans text-sm leading-relaxed border border-zinc-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none">
      {/* Executive Header Banner */}
      <header className="border-b-4 border-slate-900 pb-5 mb-6">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase">
          {p.fullName || "Candidate Name"}
        </h1>
        {p.headline && (
          <p className="text-base sm:text-lg font-semibold text-slate-700 mt-1 uppercase tracking-wider">
            {p.headline}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs font-medium text-slate-600">
          {p.email && <span>{p.email}</span>}
          {p.phone && <span>| {p.phone}</span>}
          {p.location && <span>| {p.location}</span>}
          {p.linkedin && (
            <a href={p.linkedin} target="_blank" rel="noreferrer" className="text-slate-900 underline hover:text-blue-700">
              | LinkedIn
            </a>
          )}
          {p.website && (
            <a href={p.website} target="_blank" rel="noreferrer" className="text-slate-900 underline hover:text-blue-700">
              | Portfolio
            </a>
          )}
        </div>
      </header>

      {/* Executive Summary */}
      {data.summary && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b-2 border-slate-300 pb-1 mb-2.5">
            Executive Profile
          </h2>
          <p className="text-slate-800 leading-relaxed text-justify text-xs sm:text-sm">
            {data.summary}
          </p>
        </section>
      )}

      {/* Core Competencies Grid */}
      {data.skills && data.skills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b-2 border-slate-300 pb-1 mb-3">
            Core Competencies & Technologies
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {data.skills.map((sc, index) => (
              <div key={index} className="flex flex-col bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="font-bold text-slate-900 text-xs mb-1">
                  {sc.category}
                </span>
                <span className="text-slate-700 text-xs leading-normal">
                  {sc.items.join(" • ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Professional Experience */}
      {data.experience && data.experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b-2 border-slate-300 pb-1 mb-3">
            Professional Experience
          </h2>
          <div className="space-y-4">
            {data.experience.map((exp, index) => (
              <div key={index}>
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="font-extrabold text-slate-950 text-sm">
                    {exp.position}{" "}
                    <span className="font-semibold text-slate-700">
                      | {exp.company}
                    </span>
                  </h3>
                  <span className="text-xs font-semibold text-slate-600">
                    {exp.startDate} – {exp.endDate}
                  </span>
                </div>
                {exp.location && (
                  <p className="text-xs italic text-slate-500 mb-1">{exp.location}</p>
                )}
                {exp.highlights && exp.highlights.length > 0 && (
                  <ul className="list-disc list-outside ml-4 mt-1.5 space-y-1 text-slate-800 text-xs sm:text-[13px]">
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

      {/* Projects */}
      {data.projects && data.projects.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b-2 border-slate-300 pb-1 mb-3">
            Key Initiatives & Projects
          </h2>
          <div className="space-y-3">
            {data.projects.map((proj, index) => (
              <div key={index}>
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="font-bold text-slate-950 text-sm">
                    {proj.name}
                    {proj.technologies?.length ? (
                      <span className="font-normal text-slate-600 text-xs ml-2">
                        ({proj.technologies.join(", ")})
                      </span>
                    ) : null}
                  </h3>
                  {proj.link && (
                    <a href={proj.link} target="_blank" rel="noreferrer" className="text-xs text-blue-800 underline">
                      Initiative Link
                    </a>
                  )}
                </div>
                {proj.description && (
                  <p className="text-xs text-slate-700 mt-0.5">{proj.description}</p>
                )}
                {proj.highlights && proj.highlights.length > 0 && (
                  <ul className="list-disc list-outside ml-4 mt-1 space-y-1 text-slate-800 text-xs">
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

      {/* Education & Credentials */}
      {data.education && data.education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b-2 border-slate-300 pb-1 mb-3">
            Education
          </h2>
          <div className="space-y-2">
            {data.education.map((edu, index) => (
              <div key={index} className="flex flex-wrap items-baseline justify-between gap-1">
                <div>
                  <span className="font-bold text-slate-900 text-sm">
                    {edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}
                  </span>
                  <span className="text-slate-700 text-xs"> — {edu.institution}</span>
                  {edu.location && <span className="text-slate-500 text-xs"> ({edu.location})</span>}
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  {edu.startDate ? `${edu.startDate} – ` : ""}{edu.endDate}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b-2 border-slate-300 pb-1 mb-2">
            Executive Certifications
          </h2>
          <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-slate-800">
            {data.certifications.map((cert, index) => (
              <li key={index}>
                <span className="font-semibold text-slate-950">{cert.name}</span> — {cert.issuer}
                {cert.date ? ` (${cert.date})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
