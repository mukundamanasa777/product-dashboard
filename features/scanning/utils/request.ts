import axios from "axios";

export async function request(url: string) {
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
    // Matches the Playwright goto timeout in browserRequest.ts. Without
    // this, a hung server just hangs the worker indefinitely instead of
    // ever surfacing as a countable "timeout" page result.
    timeout: 30_000,
  });

  return response.data;
}