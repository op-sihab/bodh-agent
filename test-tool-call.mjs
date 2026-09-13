const url = "https://api-gateway.merge.dev/v1/responses";
const apiKey = "mg_XKCpgi4dR6M2DmaBFgvjme8uTeGyWWTWGP_XP4zUjN8";

async function testToolCalling() {
  const tools = [
    {
      type: "function",
      function: {
        name: "get_subject_chapters",
        description: "Get chapters and syllabus for an academic subject like general math, physics, etc.",
        parameters: {
          type: "object",
          properties: {
            subject: {
              type: "string",
              description: "Subject name, e.g. 'ssc_general_math', 'ssc_physics'"
            }
          },
          required: ["subject"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_topic_frequency",
        description: "Check how many times a topic appeared in past and recent board exams.",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Topic keyword in Bengali, e.g. 'গতি'"
            }
          },
          required: ["topic"]
        }
      }
    }
  ];

  const payload = {
    input: [
      {
        type: "message",
        role: "user",
        content: "গনিত এ কয়টা অধ্যায় আছে?"
      }
    ],
    tools: tools,
    model: "openai/gpt-5.6-luna"
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  console.log("Status:", res.status);
  const data = await res.text();
  console.log("Response:", data);
}

testToolCalling().catch(console.error);
