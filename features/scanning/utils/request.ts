import axios from "axios";

export async function request(url: string) {
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  return response.data;
}