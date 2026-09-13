const url = "https://mcq-db-primekeeper.aws-ap-south-1.turso.io/v2/pipeline";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxOTE3MjgsImlkIjoiMDFhMDkwMzAtMDgwMS03OGI1LWFjZDUtMzUyNDEzYzgwYzVlIiwia2lkIjoiVXJNT2ZOeG1ERlRQNk5pNS1CSHlTZ0tZYWVrdmVZQi1lTGx6RW92c1picyIsInJpZCI6IjMxNTlkN2YzLTg5NTAtNDc1Yi05OTZhLWE2OWJkODg4ZWViMSJ9.SJMGIVf60N0QNFYaEkgph3BEAblDo0IrvKpyns6uJOUvWccx4xFvexuAgOYo5FSpyaP1RMACzEkg03Q1jNdUCg";

async function query(sql) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql } },
        { type: "close" }
      ]
    })
  });

  const data = await response.json();
  const res = data.results[0];
  if (res.type === "error") {
    throw new Error(res.error.message);
  }
  const result = res.response.result;
  const cols = result.cols.map(c => c.name);
  const rows = result.rows.map(r => {
    const obj = {};
    r.forEach((val, i) => {
      obj[cols[i]] = val.value;
    });
    return obj;
  });
  return rows;
}

async function main() {
  console.log("=== TURSO DATABASE STATUS ===");
  const tables = await query("SELECT name FROM sqlite_master WHERE type='table';");
  console.log("Tables found:", tables.map(t => t.name).join(", "));

  for (const t of tables) {
    const countRes = await query(`SELECT COUNT(*) as count FROM ${t.name};`);
    console.log(`\nTable '${t.name}': Total rows = ${countRes[0].count}`);
    const sample = await query(`SELECT * FROM ${t.name} LIMIT 2;`);
    console.log(`Sample data:`, sample);
  }
}

main().catch(console.error);
