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
