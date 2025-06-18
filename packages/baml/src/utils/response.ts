/**
 * Creates a standardized success response object containing the provided data.
 *
 * @param data - The payload to include in the response.
 * @returns An object with `success: true` and the given {@link data}.
 */
export function success(data: unknown) {
	return { success: true, data };
}

/**
 * Creates a standardized failure response object with an error message.
 *
 * @param message - The error message to include in the response.
 * @returns An object with `success` set to `false` and the provided error message.
 */
export function failure(message: string) {
	return { success: false, error: message };
}
