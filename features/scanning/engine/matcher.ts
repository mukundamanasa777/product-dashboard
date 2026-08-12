export function findSemiSupplier(
  description: string,
  keywords: string[],
) {
  const lower = description.toLowerCase();

  return (
    keywords.find((keyword) =>
      lower.includes(keyword.toLowerCase()),
    ) || null
  );
}