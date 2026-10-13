import React, { useEffect } from "react";
import { X } from "lucide-react";

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  bodyClassName?: string;
};

const sizeClasses = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  bodyClassName,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card (Slide-up Bottom Sheet on mobile, centered card on desktop) */}
      <div
        className={`relative w-full ${sizeClasses[size]} rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 overflow-hidden z-10 flex flex-col max-h-[88vh] sm:max-h-[90vh] animate-slideUp sm:animate-scaleIn`}
      >
        {/* Mobile Drag Handle */}
        <div className="flex sm:hidden justify-center pt-2.5 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        {/* Header */}
        <div
          className={`flex ${
            description ? "items-start" : "items-center"
          } justify-between border-b border-slate-100 px-5 sm:px-6 py-3 sm:py-3.5`}
        >
          <div>
            <h2 id="modal-title" className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs text-slate-500 leading-normal">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center -mr-1"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className={`px-5 sm:px-6 ${bodyClassName ?? "py-4 sm:py-5"} overflow-y-auto overscroll-contain`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100 bg-slate-50/70 px-5 sm:px-6 py-3 sm:py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
