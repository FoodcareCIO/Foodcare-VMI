"use client";

import { useState } from "react";

import { Button, Input, Modal } from "@/components/ui";
import { api } from "@/lib/api/client";
import { notify } from "@/lib/notifications";
import { validateChangePassword } from "@/lib/validation";

export const ChangePasswordButton = () => {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [pending, setPending] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFieldErrors({});
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const clearFieldError = (field: keyof typeof fieldErrors) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateChangePassword(
      currentPassword,
      newPassword,
      confirmPassword,
    );
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({});
    setPending(true);

    try {
      await api.post("/api/auth/password", {
        currentPassword,
        newPassword,
      });
      notify.success("Password updated.");
      handleClose();
    } catch {
      // API client shows a toast for backend errors.
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        fullWidth
        icon="mdi:lock-reset"
        className="justify-start px-3! py-2! font-normal! text-base! text-slate-300 hover:bg-slate-800! hover:text-white!"
        onClick={() => setOpen(true)}
      >
        Change password
      </Button>

      <Modal open={open} title="Change password" onClose={handleClose} size="sm">
        <form
          onSubmit={handleSubmit}
          onInput={() => setFieldErrors({})}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label="Current password"
            name="currentPassword"
            type="password"
            prefixIcon="mdi:lock-outline"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              clearFieldError("currentPassword");
            }}
            placeholder="Enter your current password"
            error={fieldErrors.currentPassword}
            autoComplete="current-password"
          />
          <Input
            label="New password"
            name="newPassword"
            type="password"
            prefixIcon="mdi:lock-plus-outline"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              clearFieldError("newPassword");
            }}
            placeholder="At least 8 characters"
            help="Use at least 8 characters."
            error={fieldErrors.newPassword}
            autoComplete="new-password"
          />
          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            prefixIcon="mdi:lock-check-outline"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearFieldError("confirmPassword");
            }}
            placeholder="Re-enter your new password"
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" loading={pending}>
              Update password
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
