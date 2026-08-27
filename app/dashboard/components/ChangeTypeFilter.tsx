"use client";

import {
  CheckIcon,
  Combobox,
  Group,
  Loader,
  Pill,
  PillsInput,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { useGetChangeTypesQuery } from "@/lib/redux/api";
import type { ChangeType } from "../types";
import { humanizeChangeType } from "../utils/humanize";

interface ChangeTypeFilterProps {
  selected: ChangeType[];
  onChange: (selected: ChangeType[]) => void;
}

export function ChangeTypeFilter({
  selected,
  onChange,
}: ChangeTypeFilterProps) {
  const combobox = useCombobox();

  // Options are whatever change types actually exist on products right now
  // (see the change-types API / findDistinctChangeTypes) rather than the
  // full static enum, so there's never a choice that returns zero results.
  const { data, isLoading } = useGetChangeTypesQuery();
  const options = data?.items ?? [];

  const selectedSet = new Set(selected);

  function toggleOption(option: ChangeType) {
    if (selectedSet.has(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  function removeSelected(option: ChangeType) {
    onChange(selected.filter((s) => s !== option));
  }

  return (
    <Stack gap="xs">
      <Text size="sm" fw={600} c="dimmed">
        Change Type
      </Text>
      <Combobox
        store={combobox}
        onOptionSubmit={(value) => toggleOption(value as ChangeType)}
      >
        <Combobox.DropdownTarget>
          <PillsInput onClick={() => combobox.openDropdown()}>
            <Pill.Group>
              {selected.map((item) => (
                <Pill
                  key={item}
                  withRemoveButton
                  onRemove={() => removeSelected(item)}
                >
                  {humanizeChangeType(item)}
                </Pill>
              ))}
              <Combobox.EventsTarget>
                <PillsInput.Field
                  placeholder={selected.length ? "" : "Any change type..."}
                  onFocus={() => combobox.openDropdown()}
                  onClick={() => combobox.openDropdown()}
                  readOnly
                />
              </Combobox.EventsTarget>
            </Pill.Group>
          </PillsInput>
        </Combobox.DropdownTarget>

        <Combobox.Dropdown>
          <Combobox.Options mah={200} style={{ overflowY: "auto" }}>
            {isLoading ? (
              <Combobox.Empty>
                <Loader size="xs" />
              </Combobox.Empty>
            ) : options.length === 0 ? (
              <Combobox.Empty>No change types found</Combobox.Empty>
            ) : (
              options.map((option) => (
                <Combobox.Option
                  value={option}
                  key={option}
                  active={selectedSet.has(option)}
                >
                  <Group gap="xs" wrap="nowrap">
                    {selectedSet.has(option) && <CheckIcon size={12} />}
                    <span>{humanizeChangeType(option)}</span>
                  </Group>
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Stack>
  );
}
