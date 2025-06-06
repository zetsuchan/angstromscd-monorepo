export function success(data: unknown) {
  return { success: true, data };
}

export function failure(message: string) {
  return { success: false, error: message };
}
