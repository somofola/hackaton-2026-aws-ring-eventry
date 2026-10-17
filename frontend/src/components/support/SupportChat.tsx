import React from "react";
import { SUPPORT_EMAIL } from "@/lib/brand";

const SupportChat: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-colors group"
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
             style={{ background: "#e8f0fe" }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#0060D4" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 leading-none mb-0.5">Email</p>
          <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700">
            {SUPPORT_EMAIL}
          </p>
        </div>
      </a>

      <a
        href="tel:+447877170279"
        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-colors group"
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
             style={{ background: "#e8f0fe" }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#0060D4" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 leading-none mb-0.5">Phone</p>
          <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700">
            +44 7877 170279
          </p>
        </div>
      </a>
    </div>
  );
};

export default SupportChat;
