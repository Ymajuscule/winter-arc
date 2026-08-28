/** Every Edge Function's failure shape (docs/api-specifications.md's convention: `{ error: string }` plus an HTTP status). */
export interface ApiError {
  error: string;
}
