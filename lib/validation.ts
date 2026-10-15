export const MIN_PASSWORD_LENGTH = 8;

export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const validateLogin = (email: string, password: string) => {
  const errors: { email?: string; password?: string } = {};

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  }

  return errors;
};

export const validateChangePassword = (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
) => {
  const errors: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  } = {};

  if (!currentPassword) {
    errors.currentPassword = "Current password is required.";
  }

  if (!newPassword) {
    errors.newPassword = "New password is required.";
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (newPassword === currentPassword) {
    errors.newPassword = "New password must be different from your current password.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your new password.";
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
};

export const MAX_EMAIL_LIST_LENGTH = 25;

/** Splits a comma/newline separated list (or an array) into unique addresses. */
export const parseEmailList = (value: unknown): { emails: string[]; invalid: string[] } => {
  const parts = Array.isArray(value) ? value.map(String) : String(value ?? "").split(/[\s,;]+/);
  const emails: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const email = part.trim();
    if (!email) continue;
    if (!isValidEmail(email)) {
      invalid.push(email);
      continue;
    }
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }
  return { emails, invalid };
};

export const emailListError = (value: unknown): string | undefined => {
  const { emails, invalid } = parseEmailList(value);
  if (invalid.length > 0) {
    return `Not a valid email address: ${invalid.join(", ")}`;
  }
  if (emails.length > MAX_EMAIL_LIST_LENGTH) {
    return `Enter at most ${MAX_EMAIL_LIST_LENGTH} addresses.`;
  }
  return undefined;
};
