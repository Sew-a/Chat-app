-- Emails are now normalized (trim + lowercase) by the API, and lookups are exact.
-- Normalize rows created before that. A row whose normalized email would collide
-- with another account is left untouched rather than failing the unique index;
-- such accounts need manual resolution.
UPDATE "User" AS u
SET "email" = lower(trim(u."email"))
WHERE u."email" <> lower(trim(u."email"))
  AND NOT EXISTS (
    SELECT 1 FROM "User" AS o
    WHERE o."id" <> u."id"
      AND lower(trim(o."email")) = lower(trim(u."email"))
  );
