// Centralized Environment Variables & App Configuration
export const ENV = {
  PORT: process.env.PORT || 3000,
  
  // Database Configuration (Turso LibSQL with 306,678 HSC questions + 306,678 vectors)
  TURSO_URL: process.env.TURSO_DATABASE_URL || "https://all-qus-opsihab444.aws-ap-south-1.turso.io/v2/pipeline",
  TURSO_TOKEN: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTAwOTQzMjMsImlkIjoiMDFhMGM5ZWYtOTgwMS03N2QzLWI4N2EtNmE4YjBmOGIxZGJlIiwia2lkIjoiQ05VaGI4M1NTNjBuM2ZyLUhvR1YtVGJfLXdydHRHODZ3X0RoQTlNMENKYyIsInJpZCI6IjlhOGJkM2MyLTkxYzktNGY0Zi1iOWI2LTc4MWM4N2I1ZWNiYSJ9.X66JUWaUZWUHb2hWaZT-ln49UtKgAuEHdsbk5wO-2Y5sTwE1sSqsPpcP6br6aRvGN8yP5VUsOXdmuj2F5zpfBQ",
  
  // AI Gateway Switching System ("xkiro" or "merge")
  AI_GATEWAY: process.env.AI_GATEWAY || "merge",

  // xkiro Configuration (Frontier model standby)
  XKIRO_API_URL: process.env.XKIRO_API_URL || "https://api.xkiro.com/v1/chat/completions",
  XKIRO_API_KEY: process.env.XKIRO_API_KEY || "sk-xt-711eb1cf17525edff0720aac39d7732bc83d2608e92104b7",
  XKIRO_MODEL: process.env.XKIRO_MODEL || "qwen/qwen3.8-max:free",

  // Merge Gateway Configuration (Active Primary)
  MERGE_API_URL: process.env.MERGE_API_URL || "https://api-gateway.merge.dev/v1/responses",
  MERGE_API_KEY: process.env.MERGE_API_KEY || "mg_HFahKt_qaHMfdy_hCZP_aGQWLXkyW5CZFyBhU85CRkc",
  MERGE_MODEL: process.env.MERGE_MODEL || "openai/gpt-6-luna",

  // Resolved active AI endpoint dynamically
  get AI_API_URL() {
    return this.AI_GATEWAY === "merge" ? this.MERGE_API_URL : this.XKIRO_API_URL;
  },
  get AI_API_KEY() {
    return this.AI_GATEWAY === "merge" ? this.MERGE_API_KEY : this.XKIRO_API_KEY;
  },
  get MODEL_NAME() {
    return this.AI_GATEWAY === "merge" ? this.MERGE_MODEL : this.XKIRO_MODEL;
  },

  APP_NAME: "BODH AI (বোধ)",
  APP_TAGLINE: "না বুঝে মুখস্থ নয়, পড়াশোনায় এবার গভীর বোধ",
  APP_MODE: "Autonomous Academic Intelligence — HSC Board & Admissions Mastery"
};
