import { trafficAnalysisService } from "./services/ai/trafficAnalysisService";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  try {
    console.log("Starting...");
    const result = await trafficAnalysisService.performTrafficCheck("amazon.com", "Global", "en");
    console.log("SUCCESS:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("ERROR:", err);
  }
}

run();
