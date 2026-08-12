"use client";

import { Chip, Group, Text, Tooltip } from "@mantine/core";
import { PRODUCT_STATUSES, type ProductStatus } from "../types";
import { STATUS_DESCRIPTIONS } from "../utils/humanize";

interface StatusFilterProps {
  selected: ProductStatus[];
  onChange: (selected: ProductStatus[]) => void;
}

export function StatusFilter({ selected, onChange }: StatusFilterProps) {
  function toggle(status: ProductStatus, checked: boolean) {
    if (checked) {
      onChange([...selected, status]);
    } else {
      onChange(selected.filter((s) => s !== status));
    }
  }

  return (
    <Group gap="sm" align="center">
      <Text size="sm" fw={600} c="dimmed">
        Status
      </Text>
      <Group gap="xs">
        {PRODUCT_STATUSES.map((status) => (
          <Tooltip
            key={status}
            label={STATUS_DESCRIPTIONS[status]}
            openDelay={200}
          >
            {/* Wrapper span, not the Chip itself, is what the Tooltip
                attaches its ref/hover handlers to — Chip forwards any
                extra props it doesn't recognize onto its hidden internal
                <input>, not the visible label you actually hover over, so
                the Tooltip would otherwise never see the hover. */}
            <span>
              <Chip
                size="xs"
                checked={selected.includes(status)}
                onChange={(checked) => toggle(status, checked)}
              >
                {status}
              </Chip>
            </span>
          </Tooltip>
        ))}
      </Group>
    </Group>
  );
}
