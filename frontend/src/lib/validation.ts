/** Player answer validation, extracted from the game controller. */
import type { ValidationResult } from "./types";

export function validateAnswer(answer: string): ValidationResult {
  const validation: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!answer || answer.trim().length === 0) {
    validation.isValid = false;
    validation.errors.push("No answer provided");
    return validation;
  }

  if (answer.trim().length < 10) {
    validation.isValid = false;
    validation.errors.push("Answer too short - provide more detail");
    return validation;
  }

  if (answer.trim().length < 20) {
    validation.warnings.push("Very brief answer - consider adding more detail");
  }

  const lowEffortPatterns = [
    /^(run|hide|scream|panic|die|quit|give up)\.?$/i,
    /^(i don't know|idk|nothing|whatever)\.?$/i,
    /^.{1,15}$/,
    /^(ok|okay|yes|no|maybe|sure)\.?$/i,
  ];

  const isLowEffort = lowEffortPatterns.some((pattern) => pattern.test(answer.trim()));
  if (isLowEffort) {
    validation.isValid = false;
    validation.errors.push("Answer appears to be low-effort or insufficient for survival analysis");
    return validation;
  }

  const hasSpam = /(.)\1{4,}/.test(answer);
  if (hasSpam) {
    validation.isValid = false;
    validation.errors.push("Answer contains spam or repeated characters");
    return validation;
  }

  return validation;
}
