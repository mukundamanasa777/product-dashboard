import { Group, Text } from "@mantine/core";

interface ProductsSummaryProps {
  allCount: number;
  filteredCount: number;
  hasFilters: boolean;
}

export function ProductsSummary({
  allCount,
  filteredCount,
  hasFilters,
}: ProductsSummaryProps) {
  return (
    <Group gap="lg">
      <Text size="sm">
        All products:{" "}
        <Text span fw={700}>
          {allCount}
        </Text>
      </Text>
      {hasFilters && (
        <Text size="sm">
          Matching selected filters:{" "}
          <Text span fw={700}>
            {filteredCount}
          </Text>
        </Text>
      )}
    </Group>
  );
}
