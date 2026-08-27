"use client";

import { Chip, Group, Text, Tooltip } from "@mantine/core";
import { LINK_CHECK_STATUSES, type LinkCheckStatus } from "../types";
import { LINK_CHECK_STATUS_DESCRIPTIONS } from "../utils/humanize";

interface LinkCheckStatusFilterProps {
  selected: LinkCheckStatus[];
  onChange: (selected: LinkCheckStatus[]) => void;
}

/** Same chip-row pattern as StatusFilter, over LinkCheckStatus. */
export function LinkCheckStatusFilter({
  selected,
  onChange,
}: LinkCheckStatusFilterProps) {
  function toggle(status: LinkCheckStatus, checked: boolean) {
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
        {LINK_CHECK_STATUSES.map((status) => (
          <Tooltip
            key={status}
            label={LINK_CHECK_STATUS_DESCRIPTIONS[status]}
            openDelay={200}
          >
            {/* Wrapper span, not the Chip itself — see StatusFilter for why. */}
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
