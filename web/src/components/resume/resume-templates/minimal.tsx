"use client";

import React from "react";
import type { IResumeData } from "@/lib/types";

interface TemplateProps {
  data: IResumeData;
}

export function MinimalTemplate({ data }: TemplateProps) {
  const p = data.personalInfo || {};

  return (
    <div className="mx-auto w-full max-w-[800px] bg-white text-zinc-900 p-8 sm:p-12 shadow-sm rounded-lg font-mono text-xs leading-relaxed border border-zinc-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none">
      {/* Header */}
      <header className="pb-4 mb-5 border-b border-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-black">
            {p.fullName || "Your Full Name"}
          </h1>
          {p.headline && (
            <span className="text-zinc-600 font-medium">{p.headline}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-zinc-600">
          {p.email && <span>{p.email}</span>}
          {p.phone && <span>/ {p.phone}</span>}
          {p.location && <span>/ {p.location}</span>}
          {p.github && (
            <a href={p.github} target="_blank" rel="noreferrer" className="text-zinc-900 underline">
              / github
            </a>
          )}
          {p.linkedin && (
            <a href={p.linkedin} target="_blank" rel="noreferrer" className="text-zinc-900 underline">
              / linkedin
            </a>
          )}
          {p.website && (
            <a href={p.website} target="_blank" rel="noreferrer" className="text-zinc-900 underline">
              / portfolio
            </a>
          )}
        </div>
      </header>

      {/* Summary */}
      {data.summary && (
        <section className="mb-5">
          <div className="font-bold text-zinc-900 uppercase text-[11px] mb-1">
            {"// summary"}
          </div>
          <p className="font-sans text-xs text-zinc-800 leading-normal">
            {data.summary}
          </p>
        </section>
      )}

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <section className="mb-5">
          <div className="font-bold text-zinc-900 uppercase text-[11px] mb-2">
            {"// experience"}
          </div>
          <div className="space-y-4">
            {data.experience.map((exp, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline font-bold text-zinc-900 text-xs">
                  <span>{exp.position} @ {exp.company}</span>
                  <span className="text-[11px] font-normal text-zinc-500">
                    {exp.startDate} - {exp.endDate}
                  </span>
                </div>
                {exp.location && (
                  <div className="text-[10px] text-zinc-500">{exp.location}</div>
                )}
                {exp.highlights && exp.highlights.length > 0 && (
                  <ul className="font-sans list-none mt-1 space-y-1 text-xs text-zinc-700">
                    {exp.highlights.map((hl, hlIdx) => (
                      <li key={hlIdx} className="flex gap-2 items-start">
                        <span className="text-zinc-400 font-mono text-[10px] select-none">&gt;</span>
                        <span>{hl}</span>
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
        <section className="mb-5">
          <div className="font-bold text-zinc-900 uppercase text-[11px] mb-1.5">
            {"// skills"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {data.skills.map((sc, index) => (
              <div key={index} className="border border-zinc-200 p-2 rounded bg-zinc-50">
                <span className="font-bold text-zinc-900 block text-[11px] mb-0.5">
                  {sc.category}
                </span>
                <span className="font-sans text-xs text-zinc-700">
                  {sc.items.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {data.projects && data.projects.length > 0 && (
        <section className="mb-5">
          <div className="font-bold text-zinc-900 uppercase text-[11px] mb-2">
            {"// projects"}
          </div>
          <div className="space-y-3">
            {data.projects.map((proj, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline font-bold text-xs">
                  <span>
                    {proj.name}
                    {proj.technologies?.length ? (
                      <span className="font-normal text-zinc-500 ml-2">
                        [{proj.technologies.join(", ")}]
                      </span>
                    ) : null}
                  </span>
                  {proj.link && (
                    <a href={proj.link} target="_blank" rel="noreferrer" className="text-zinc-900 underline text-[10px]">
                      [link]
                    </a>
                  )}
                </div>
                {proj.description && (
                  <p className="font-sans text-xs text-zinc-700 mt-0.5">{proj.description}</p>
                )}
                {proj.highlights && proj.highlights.length > 0 && (
                  <ul className="font-sans list-none mt-1 space-y-1 text-xs text-zinc-700">
                    {proj.highlights.map((hl, hlIdx) => (
                      <li key={hlIdx} className="flex gap-2 items-start">
                        <span className="text-zinc-400 font-mono text-[10px] select-none">&gt;</span>
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <section className="mb-5">
          <div className="font-bold text-zinc-900 uppercase text-[11px] mb-2">
            {"// education"}
          </div>
          <div className="space-y-2">
            {data.education.map((edu, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline font-bold text-xs">
                  <span>{edu.degree} — {edu.institution}</span>
                  <span className="text-[11px] font-normal text-zinc-500">
                    {edu.startDate ? `${edu.startDate} - ` : ""}{edu.endDate}
                  </span>
                </div>
                {edu.gpa && (
                  <div className="text-[10px] text-zinc-500">GPA: {edu.gpa}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <section className="mb-5">
          <div className="font-bold text-zinc-900 uppercase text-[11px] mb-1">
            {"// certifications"}
          </div>
          <ul className="space-y-1 text-xs">
            {data.certifications.map((cert, index) => (
              <li key={index}>
                • {cert.name} ({cert.issuer}) {cert.date ? `[${cert.date}]` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
