export function isUnauthorizedError(error: Error): boolean {
  return error.message.includes("401");
}

export function isPendingApprovalError(error: Error): boolean {
  return error.message.includes("PENDING_APPROVAL") || error.message.includes("Account pending approval") || error.message.includes("INVITED");
}