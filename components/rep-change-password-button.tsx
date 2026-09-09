"use client";

import { useState } from "react";

import { Button, Input, Modal } from "@/components/ui";
import { api } from "@/lib/api/client";
import { notify } from "@/lib/notifications";
import { validateChangePassword } from "@/lib/validation";

interface RepChangePasswordButtonProps {
  repId: string;
  repName: string;
  repEmail: string;
}

export const RepChangePasswordButton = ({
  repId,
  repName,
  repEmail,
}: RepChangePasswordButtonProps) => {
  const [open, setOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [pending, setPending] = useState(false);

  const resetForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFieldErrors({});
  };

  const handleClose = () => {
    if (pending) return;
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
      oldPassword,
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
      await api.post(`/api/reps/${encodeURIComponent(repId)}/password`, {
        oldPassword,
        newPassword,
      });
      notify.success(`Password updated for ${repName}.`);
      setPending(false);
      handleClose();
    } catch {
      // API client shows a toast for backend errors.
      setPending(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon="mdi:lock-reset"
        title={`Change password for ${repName}`}
        aria-label={`Change password for ${repName}`}
        onClick={() => setOpen(true)}
      >
        Password
      </Button>

      <Modal
        open={open}
        title="Change rep password"
        onClose={handleClose}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-slate-500">
            Enter the old password before setting a new password for {repName}
            {repEmail ? ` (${repEmail})` : ""}.
          </p>

          <Input
            label="Old password"
            name="oldPassword"
            type="password"
            prefixIcon="mdi:lock-outline"
            value={oldPassword}
            onChange={(event) => {
              setOldPassword(event.target.value);
              clearFieldError("currentPassword");
            }}
            placeholder="Enter the rep's old password"
            error={fieldErrors.currentPassword}
            autoComplete="off"
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
            placeholder="Re-enter the new password"
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={pending}
            >
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
