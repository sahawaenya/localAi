const geminiAi = require("./gemini.js");

async function examples() {
  // Example 1: Simple prompt
  console.log("Example 1: Simple prompt");
  const result1 = await geminiAi("What is the capital of France?");
  console.log(result1);
  console.log("\n---\n");

  // Example 2: With system instruction
  console.log("Example 2: With system instruction");
  const result2 = await geminiAi("Write a haiku about coding", {
    systemInstruction:
      "You are a professional poet. Write in a contemplative style.",
  });
  console.log(result2);
  console.log("\n---\n");

  // Example 3: With custom model
  console.log("Example 3: With custom model");
  const result3 = await geminiAi("Explain quantum entanglement", {
    model: "gemini-2.5-pro",
    systemInstruction:
      "You are a physics professor. Explain concepts simply for high school students.",
  });
  console.log(result3);
  console.log("\n---\n");

  // Example 4: Using systemMessage (alias)
  console.log("Example 4: Using systemMessage alias");
  const result4 = await geminiAi(
    "Create a REST API endpoint for user registration",
    {
      systemMessage:
        "You are an expert JavaScript developer specializing in Node.js and Express.",
    },
  );
  console.log(result4);
  console.log("\n---\n");

  // Example 5: Complex prompt with all options
  console.log("Example 5: Complex configuration");
  const result5 = await geminiAi("Generate 5 creative startup ideas", {
    model: "gemini-3-flash-preview",
    systemInstruction:
      "You are a successful entrepreneur and venture capitalist. Focus on innovative, scalable ideas.",
    retries: 10,
  });
  console.log(result5);
}

// Run examples
examples().catch(console.error);
