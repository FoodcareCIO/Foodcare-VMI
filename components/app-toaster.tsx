"use client";

import { Toaster } from "sonner";

export const AppToaster = () => (
  <Toaster closeButton position="top-right" richColors toastOptions={{ duration: 5000 }} />
);
