export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function isPendingApprovalError(error: Error): boolean {
  return /^403: .*Account pending approval/.test(error.message);
}