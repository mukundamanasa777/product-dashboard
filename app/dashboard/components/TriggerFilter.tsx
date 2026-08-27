"use client";

import {
  CheckIcon,
  Combobox,
  Group,
  Pill,
  PillsInput,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { TRIGGER_SOURCES, type TriggerSource } from "../types";

interface TriggerFilterProps {
  selected: TriggerSource[];
  onChange: (selected: TriggerSource[]) => void;
}

/**
 * Same dropdown pattern as ChangeTypeFilter — options are a fixed local
 * list here (just MANUAL/SCHEDULED) rather than fetched from the API, so
 * there's no loading state to handle. Shared by Scan Triggering and Link
 * Check — both filter runs by the same MANUAL/SCHEDULED distinction.
 */
export function TriggerFilter({ selected, onChange }: TriggerFilterProps) {
  const combobox = useCombobox();

  const selectedSet = new Set(selected);

  function toggleOption(option: TriggerSource) {
    if (selectedSet.has(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  function removeSelected(option: TriggerSource) {
    onChange(selected.filter((s) => s !== option));
  }

  return (
    <Stack gap="xs">
      <Text size="sm" fw={600} c="dimmed">
        Trigger
      </Text>
      <Combobox
        store={combobox}
        onOptionSubmit={(value) => toggleOption(value as TriggerSource)}
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
                  {item}
                </Pill>
              ))}
              <Combobox.EventsTarget>
                <PillsInput.Field
                  placeholder={selected.length ? "" : "Any trigger..."}
                  onFocus={() => combobox.openDropdown()}
                  onClick={() => combobox.openDropdown()}
                  readOnly
                />
              </Combobox.EventsTarget>
            </Pill.Group>
          </PillsInput>
        </Combobox.DropdownTarget>

        <Combobox.Dropdown>
          <Combobox.Options>
            {TRIGGER_SOURCES.map((option) => (
              <Combobox.Option
                value={option}
                key={option}
                active={selectedSet.has(option)}
              >
                <Group gap="xs" wrap="nowrap">
                  {selectedSet.has(option) && <CheckIcon size={12} />}
                  <span>{option}</span>
                </Group>
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Stack>
  );
}
