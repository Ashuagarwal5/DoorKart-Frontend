"use client";

import { toast as hotToast, Toaster } from "react-hot-toast";

const LIFETIME_MS = { success: 4000, error: 8000 };

const api = {
  success: (message) => hotToast.success(message, { duration: LIFETIME_MS.success }),
  error: (message) => hotToast.error(message, { duration: LIFETIME_MS.error }),
};

/**
 * Brief confirmations ("Order packed.") and errors, drawn by react-hot-toast. Pages keep
 * calling `useToast().success / .error`, so the library stays behind this one file.
 */
export function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          className: "!rounded-xl !border !border-line !bg-surface !px-4 !py-3 !text-sm !text-fg !shadow-lg",
          success: { iconTheme: { primary: "var(--color-success)", secondary: "#fff" } },
          error: { iconTheme: { primary: "var(--color-danger)", secondary: "#fff" } },
        }}
      />
    </>
  );
}

export function useToast() {
  return api;
}

export { api as toast };
