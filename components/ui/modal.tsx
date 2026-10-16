"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/ui/icon";

export interface ModalProps {
  open?: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
} as const;

export const Modal = ({
  open = true,
  title,
  onClose,
  children,
  size = "md",
}: ModalProps) => {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`animate-pop-in max-h-[90vh] w-full ${sizeClasses[size]} cursor-default overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-float`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg text-fg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-muted transition hover:bg-subtle hover:text-fg"
          >
            <Icon icon="mdi:close" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
};
