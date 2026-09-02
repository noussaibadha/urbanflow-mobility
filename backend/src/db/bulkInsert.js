// Multi-row INSERT helper: turns N single-row round trips into N/batchSize
// batched round trips, which matters a lot when the DB is reached over a
// public proxy (Railway) instead of the low-latency private network — a
// GTFS import doing one row per query there can take many minutes just in
// round-trip latency alone.
export async function insertRowsInBatches(client, { table, columns, conflictClause = '', rows, batchSize = 500 }) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = [];
    const placeholders = batch.map((row, rowIdx) => {
      const offset = rowIdx * columns.length;
      values.push(...row);
      return `(${columns.map((_, colIdx) => `$${offset + colIdx + 1}`).join(',')})`;
    });

    await client.query(
      `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders.join(',')} ${conflictClause}`,
      values
    );
  }
}
