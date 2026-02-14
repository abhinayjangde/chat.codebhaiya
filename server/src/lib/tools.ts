import { tool } from "langchain";
import * as z from "zod";
import { webSearch, formatSearchResultsForLLM } from "../services/search.service.js";

const webSearchTool = tool(
  async ({ query }) => {
    console.log(`🔍 Performing web search: ${query}`);
    const results = await webSearch(query);
    const formatted = formatSearchResultsForLLM(results);
    console.log(`✅ Found ${results.length} results`);
    return formatted;
  },
  {
    name: "web_search",
    description:
      "Search the web for current information, news, facts, or any up-to-date data. Use this when the user asks about recent events, current news, or information that may have changed after your training cutoff. Returns search results with citations.",
    schema: z.object({
      query: z.string().describe("The search query to find relevant information"),
    }),
  }
);

export { webSearchTool };
