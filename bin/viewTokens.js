#!/usr/bin/env node

/**
 * CLI tool to view Gemini token usage
 * Usage: gemini-tokens [all|today|week|month]
 */

const fs = require("fs");
const path = require("path");

function viewGeminiTokens(filter = "all") {
  try {
    const logFile = path.join(process.cwd(), "gemini_tokens.json");

    if (!fs.existsSync(logFile)) {
      console.log("❌ No token usage log found in current directory.");
      console.log(
        "💡 Token usage will be saved automatically when using gemini helper.",
      );
      return;
    }

    const data = JSON.parse(fs.readFileSync(logFile, "utf8"));

    console.log("\n" + "=".repeat(70));
    console.log("📊 GEMINI TOKEN USAGE");
    console.log("=".repeat(70));

    if (data.requests.length === 0) {
      console.log("No requests found.");
      return;
    }

    // Overall statistics
    console.log("\n📈 OVERALL STATISTICS");
    console.log("-".repeat(70));
    console.log(`Total Requests: ${data.requests.length}`);
    console.log(`Total Tokens: ${data.totalTokens.toLocaleString()}`);
    console.log(`Total Cost: $${data.totalCost.toFixed(6)}`);
    console.log(`Last Updated: ${new Date(data.lastUpdated).toLocaleString()}`);
    console.log(
      `Avg Tokens/Request: ${Math.round(data.totalTokens / data.requests.length).toLocaleString()}`,
    );

    // Filter requests by date
    let requests = data.requests;
    const now = new Date();

    if (filter === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      requests = requests.filter((r) => new Date(r.timestamp) >= today);
      console.log(`\n📅 Showing requests from TODAY`);
    } else if (filter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      requests = requests.filter((r) => new Date(r.timestamp) >= weekAgo);
      console.log(`\n📅 Showing requests from LAST 7 DAYS`);
    } else if (filter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      requests = requests.filter((r) => new Date(r.timestamp) >= monthAgo);
      console.log(`\n📅 Showing requests from LAST 30 DAYS`);
    }

    if (requests.length === 0) {
      console.log(`\n⚠️  No requests found for filter: ${filter}`);
      return;
    }

    // Request details (show last 20)
    console.log("\n📋 RECENT REQUESTS (Last 20)");
    console.log("-".repeat(70));

    const recentRequests = requests.slice(-20);
    recentRequests.forEach((req, index) => {
      const time = new Date(req.timestamp);
      console.log(
        `\n[${index + 1}] ${time.toLocaleString()} | Model: ${req.model}`,
      );
      console.log(
        `    Tokens: ${req.totalTokens.toLocaleString()} (In: ${req.inputTokens.toLocaleString()}, Out: ${req.outputTokens.toLocaleString()})`,
      );
      console.log(`    Cost: $${req.cost.toFixed(6)}`);
    });

    // Daily summary
    console.log("\n📅 DAILY SUMMARY");
    console.log("-".repeat(70));

    const dailyStats = {};
    requests.forEach((req) => {
      const date = new Date(req.timestamp).toLocaleString("en-GB", {
        timeZone: "Asia/Jakarta",
      });
      if (!dailyStats[date]) {
        dailyStats[date] = {
          requests: 0,
          tokens: 0,
          cost: 0,
        };
      }
      dailyStats[date].requests++;
      dailyStats[date].tokens += req.totalTokens;
      dailyStats[date].cost += req.cost;
    });

    Object.entries(dailyStats)
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .forEach(([date, stats]) => {
        console.log(`\n${date}:`);
        console.log(`  Requests: ${stats.requests}`);
        console.log(`  Tokens: ${stats.tokens.toLocaleString()}`);
        console.log(`  Cost: $${stats.cost.toFixed(6)}`);
        console.log(
          `  Avg/Request: ${Math.round(stats.tokens / stats.requests).toLocaleString()}`,
        );
      });

    console.log("\n" + "=".repeat(70) + "\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const filter = args[0] || "all";

if (!["all", "today", "week", "month"].includes(filter)) {
  console.log("Usage: gemini-tokens [all|today|week|month]");
  console.log("\nExamples:");
  console.log("  gemini-tokens          # Show all requests");
  console.log("  gemini-tokens today    # Show today's requests");
  console.log("  gemini-tokens week     # Show last 7 days");
  console.log("  gemini-tokens month    # Show last 30 days");
  process.exit(1);
}

viewGeminiTokens(filter);
