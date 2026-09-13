const url = "https://mcq-db-primekeeper.aws-ap-south-1.turso.io/v2/pipeline";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxOTE3MjgsImlkIjoiMDFhMDkwMzAtMDgwMS03OGI1LWFjZDUtMzUyNDEzYzgwYzVlIiwia2lkIjoiVXJNT2ZOeG1ERlRQNk5pNS1CSHlTZ0tZYWVrdmVZQi1lTGx6RW92c1picyIsInJpZCI6IjMxNTlkN2YzLTg5NTAtNDc1Yi05OTZhLWE2OWJkODg4ZWViMSJ9.SJMGIVf60N0QNFYaEkgph3BEAblDo0IrvKpyns6uJOUvWccx4xFvexuAgOYo5FSpyaP1RMACzEkg03Q1jNdUCg";

async function runQuery(sql) {
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

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP Error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data;
}

async function main() {
  console.log("Connecting to Turso database...");
  try {
    const data = await runQuery("SELECT name, sql FROM sqlite_master WHERE type='table';");
    console.log("Connection successful!\n");
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error accessing Turso:", error.message);
  }
}

main();
