// Railway preDeployCommand: apply committed Prisma migrations.
//
// The production database was originally created with `prisma db push`, which
// leaves no `_prisma_migrations` history, and `prisma migrate deploy` refuses
// to run against such a non-empty schema (P3005). On that first run only, this
// script checks that the live schema matches the 0_init baseline and marks the
// baseline as applied. From then on it is a plain `prisma migrate deploy`.
//
// Fresh (empty) databases skip the baseline and get 0_init applied normally.
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

const BASELINE = '0_init';
// Invoke the CLI through node directly: no shell, so DATABASE_URL is never
// shell-parsed, and it behaves the same on Linux (Railway) and Windows.
const PRISMA_CLI = require.resolve('prisma/build/index.js');

function prisma(args, stdio = 'inherit') {
  console.log(`> prisma ${args[0]} ${args[1] ?? ''}`);
  const { status, error } = spawnSync(process.execPath, [PRISMA_CLI, ...args], { stdio });
  if (error) throw error;
  return status;
}

async function needsBaseline() {
  const client = new PrismaClient();
  try {
    const [row] = await client.$queryRaw`
      SELECT to_regclass('public."User"') IS NOT NULL AS "hasTables",
             to_regclass('public."_prisma_migrations"') IS NOT NULL AS "hasHistory"`;
    return row.hasTables && !row.hasHistory;
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  if (await needsBaseline()) {
    console.log(`Existing schema without migration history — baselining ${BASELINE}.`);

    // Compares against schema.prisma, which equals 0_init as long as no later
    // migration changes the schema — true for the one production DB this exists
    // for. (Comparing against prisma/migrations would require a shadow database.)
    // --exit-code: 0 = identical, 2 = different, anything else = the diff failed.
    const status = prisma(
      ['migrate', 'diff', '--from-url', process.env.DATABASE_URL, '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code'],
      ['ignore', 'ignore', 'inherit'],
    );
    if (status === 2) {
      throw new Error(
        `Live schema does not match migration ${BASELINE}; refusing to baseline. ` +
          'Reconcile manually (see README → Database migrations).',
      );
    }
    if (status !== 0) throw new Error(`prisma migrate diff failed (exit ${status}); see output above.`);

    if (prisma(['migrate', 'resolve', '--applied', BASELINE]) !== 0) throw new Error('prisma migrate resolve failed');
  }

  if (prisma(['migrate', 'deploy']) !== 0) throw new Error('prisma migrate deploy failed');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
