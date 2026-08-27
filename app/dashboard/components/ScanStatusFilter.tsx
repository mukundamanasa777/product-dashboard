"use client";

import { Chip, Group, Text, Tooltip } from "@mantine/core";
import { SCAN_STATUSES, type ScanStatus } from "../types";
import { SCAN_STATUS_DESCRIPTIONS } from "../utils/humanize";

interface ScanStatusFilterProps {
  selected: ScanStatus[];
  onChange: (selected: ScanStatus[]) => void;
}

/** Same chip-row pattern as StatusFilter, over ScanStatus. */
export function ScanStatusFilter({ selected, onChange }: ScanStatusFilterProps) {
  function toggle(status: ScanStatus, checked: boolean) {
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
        {SCAN_STATUSES.map((status) => (
          <Tooltip
            key={status}
            label={SCAN_STATUS_DESCRIPTIONS[status]}
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
