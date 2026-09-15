// Centralized Environment Variables & App Configuration
export const ENV = {
  PORT: process.env.PORT || 3000,
  TURSO_URL: process.env.TURSO_DATABASE_URL || "https://mcq-db-primekeeper.aws-ap-south-1.turso.io/v2/pipeline",
  TURSO_TOKEN: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxOTE3MjgsImlkIjoiMDFhMDkwMzAtMDgwMS03OGI1LWFjZDUtMzUyNDEzYzgwYzVlIiwia2lkIjoiVXJNT2ZOeG1ERlRQNk5pNS1CSHlTZ0tZYWVrdmVZQi1lTGx6RW92c1picyIsInJpZCI6IjMxNTlkN2YzLTg5NTAtNDc1Yi05OTZhLWE2OWJkODg4ZWViMSJ9.SJMGIVf60N0QNFYaEkgph3BEAblDo0IrvKpyns6uJOUvWccx4xFvexuAgOYo5FSpyaP1RMACzEkg03Q1jNdUCg",
  MERGE_API_URL: process.env.MERGE_API_URL || "https://api-gateway.merge.dev/v1/responses",
  MERGE_API_KEY: process.env.MERGE_API_KEY || "mg_XKCpgi4dR6M2DmaBFgvjme8uTeGyWWTWGP_XP4zUjN8",
  MODEL_NAME: process.env.MODEL_NAME || "openai/gpt-5.6-luna",
  APP_NAME: "BODH AI (বোধ)",
  APP_TAGLINE: "না বুঝে মুখস্থ নয়, পড়াশোনায় এবার গভীর বোধ",
  APP_MODE: "Autonomous Academic Intelligence — Understanding over Memorization"
};
