import { Transform } from 'class-transformer';

// Trims and lowercases an email before validation, so `Alice@X.com ` and
// `alice@x.com` resolve to the same account. Requires ValidationPipe `transform: true`.
export const NormalizeEmail = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
