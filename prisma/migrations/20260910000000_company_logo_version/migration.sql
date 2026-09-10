-- An opaque content stamp for `logoDataUrl`. It versions the GET /api/logo URL
-- so the browser caches the logo bytes immutably, instead of receiving them
-- inline in the payload of every page load.
ALTER TABLE "Company" ADD COLUMN "logoVersion" TEXT;

-- Backfill so a logo uploaded before this column still renders. The value is
-- only ever compared for equality, so it does not matter that the backfill uses
-- md5 while the application writes sha-256.
UPDATE "Company"
   SET "logoVersion" = md5("logoDataUrl")
 WHERE "logoDataUrl" IS NOT NULL;
