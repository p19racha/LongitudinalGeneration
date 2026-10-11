"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-[13px] min-w-0">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-[#98A2B3] shrink-0 stroke-[1.75]" />
            )}
            {item.onClick && !isLast ? (
              <button
                onClick={item.onClick}
                className="text-[#667085] hover:text-[#17191C] font-medium truncate transition-colors max-w-[160px] sm:max-w-[200px]"
              >
                {item.label}
              </button>
            ) : (
              <span
                className={`truncate max-w-[180px] sm:max-w-[260px] ${
                  isLast || item.active
                    ? "text-[#17191C] font-semibold"
                    : "text-[#667085] font-medium"
                }`}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
