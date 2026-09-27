import { Transform } from 'class-transformer';

// Treats a blank string as "no value" so @IsOptional() skips the remaining
// validators (e.g. @IsUrl) — forms commonly send "" for an empty field.
// Requires ValidationPipe `transform: true`.
export const EmptyToNull = () =>
  Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value));
