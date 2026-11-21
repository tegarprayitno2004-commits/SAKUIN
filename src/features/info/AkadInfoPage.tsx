import React from 'react';
import { CheckCircle2, HelpCircle, Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { AKAD_CONTENT } from '@/src/constants/akadContent';

export function AkadInfoPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Akad &amp; Informasi Layanan</h1>
        <p className="text-xs text-slate-500">
          Pembaruan terakhir: {AKAD_CONTENT.lastUpdated}
        </p>
      </div>

      {/* Legal Review Disclaimer */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3 text-xs text-amber-950">
        <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">{AKAD_CONTENT.disclaimerBanner}</p>
      </div>

      {/* Akad Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AKAD_CONTENT.akadSections.map((sec) => (
          <section
            key={sec.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-3"
          >
            <div>
              <h2 className="text-base font-bold text-slate-900">{sec.title}</h2>
              <p className="text-xs text-slate-500">{sec.subtitle}</p>
            </div>
            <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
              {sec.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
            <ul className="pt-2 border-t border-slate-100 space-y-2">
              {sec.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Privacy Policy Summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          <h2 className="text-base font-bold text-slate-900">
            {AKAD_CONTENT.privacySummary.title}
          </h2>
        </div>
        <ul className="space-y-2 text-sm text-slate-700 leading-relaxed list-disc pl-5">
          {AKAD_CONTENT.privacySummary.points.map((pt, i) => (
            <li key={i}>{pt}</li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-emerald-700" />
          <h2 className="text-base font-bold text-slate-900">Pertanyaan Umum (FAQ)</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {AKAD_CONTENT.faq.map((item) => (
            <div key={item.question} className="py-3 first:pt-0 last:pb-0">
              <h3 className="text-sm font-bold text-slate-900">{item.question}</h3>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{AKAD_CONTENT.contact.title}</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            {AKAD_CONTENT.contact.description}
          </p>
          <p className="mt-1 text-xs text-slate-500">{AKAD_CONTENT.contact.hours}</p>
        </div>
        <a
          href={`mailto:${AKAD_CONTENT.contact.email}`}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
        >
          <Mail className="h-4 w-4" />
          {AKAD_CONTENT.contact.email}
        </a>
      </section>
    </div>
  );
}
