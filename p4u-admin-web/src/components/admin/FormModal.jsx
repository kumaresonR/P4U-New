import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react/dist/iconify.js";

const FormModal = ({ onClose, size = "lg", children }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const widths = { sm: 420, md: 640, lg: 880, xl: 1100 };
  const width = widths[size] || widths.lg;

  const modal = (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-start justify-content-center"
      style={{ background: "rgba(0,0,0,0.5)", zIndex: 1080, overflowY: "auto", paddingTop: 32, paddingBottom: 32 }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-base radius-12 shadow-lg position-relative text-primary-light d-flex flex-column"
        style={{
          width: `min(${width}px, 95vw)`,
          maxHeight: "min(92vh, calc(100vh - 64px))",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="position-absolute border-0 bg-base text-secondary-light rounded-circle d-flex align-items-center justify-content-center"
          style={{ top: 12, right: 12, zIndex: 3, width: 40, height: 40 }}
          onClick={onClose}
          aria-label="Close"
        >
          <Icon icon="mdi:close" className="text-2xl" />
        </button>
        <div
          className="flex-grow-1 overflow-auto"
          style={{ padding: "48px 20px 20px", minHeight: 0 }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
};

export default FormModal;
