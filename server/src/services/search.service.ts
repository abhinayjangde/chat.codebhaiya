import { Ollama } from "ollama";

const client = new Ollama();

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

// Extended interface based on actual Ollama API response
interface OllamaWebSearchResult {
  title: string;
  url: string;
  content: string;
}

export async function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  try {
    const response = await client.webSearch({ 
      query, 
      maxResults 
    });

    // Cast to extended interface based on actual API response structure
    const results = response.results as OllamaWebSearchResult[];

    return results.map((result, index) => ({
      title: result.title,
      link: result.url,
      snippet: result.content,
      position: index + 1,
    }));
  } catch (error) {
    console.error("Web search error:", error);
    throw new Error("Failed to perform web search");
  }
}

export function formatSearchResultsForLLM(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No search results found.";
  }

  return results
    .map(
      (r) =>
        `[${r.position}] ${r.title}\n${r.snippet}\nURL: ${r.link}`
    )
    .join("\n\n");
}

// Also export web fetch for fetching specific URLs
export async function webFetch(url: string): Promise<{ title: string; content: string; links: string[] }> {
  try {
    const response = await client.webFetch({ url });
    return {
      title: response.title,
      content: response.content,
      links: response.links,
    };
  } catch (error) {
    console.error("Web fetch error:", error);
    throw new Error("Failed to fetch web page");
  }
}
