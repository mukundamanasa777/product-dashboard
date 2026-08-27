"use client";

import { useState } from "react";
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
import { useGetSemiSuppliersQuery } from "@/lib/redux/api";
import type { SemiSupplierOption } from "../types";
import { humanizeSemiSupplierName } from "../utils/humanize";

interface SemiSupplierFilterProps {
  selected: SemiSupplierOption[];
  onChange: (selected: SemiSupplierOption[]) => void;
}

export function SemiSupplierFilter({
  selected,
  onChange,
}: SemiSupplierFilterProps) {
  const combobox = useCombobox();

  const [search, setSearch] = useState("");

  // The full active list comes from the DB in one shot (it's small enough
  // not to need the search/pagination BoardManufacturerFilter uses) — any
  // narrowing from typing here is just a client-side filter over it.
  const { data, isLoading } = useGetSemiSuppliersQuery();
  const allOptions = data?.items ?? [];
  const options = allOptions.filter((option) =>
    humanizeSemiSupplierName(option.name)
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const selectedIds = new Set(selected.map((s) => s.id));

  function toggleOption(option: SemiSupplierOption) {
    if (selectedIds.has(option.id)) {
      onChange(selected.filter((s) => s.id !== option.id));
    } else {
      onChange([...selected, option]);
    }
  }

  function removeSelected(id: number) {
    onChange(selected.filter((s) => s.id !== id));
  }

  return (
    <Stack gap="xs">
      <Text size="sm" fw={600} c="dimmed">
        Semi Suppliers
      </Text>
      <Combobox
        store={combobox}
        onOptionSubmit={(value) => {
          const option = allOptions.find((o) => String(o.id) === value);
          if (option) toggleOption(option);
        }}
      >
        <Combobox.DropdownTarget>
          <PillsInput onClick={() => combobox.openDropdown()}>
            <Pill.Group>
              {selected.map((item) => (
                <Pill
                  key={item.id}
                  withRemoveButton
                  onRemove={() => removeSelected(item.id)}
                >
                  {humanizeSemiSupplierName(item.name)}
                </Pill>
              ))}
              <Combobox.EventsTarget>
                <PillsInput.Field
                  placeholder="Search semi suppliers..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.currentTarget.value);
                    combobox.openDropdown();
                  }}
                  onFocus={() => combobox.openDropdown()}
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
              <Combobox.Empty>No semi suppliers found</Combobox.Empty>
            ) : (
              options.map((option) => (
                <Combobox.Option
                  value={String(option.id)}
                  key={option.id}
                  active={selectedIds.has(option.id)}
                >
                  <Group gap="xs">
                    {selectedIds.has(option.id) && <CheckIcon size={12} />}
                    <span>{humanizeSemiSupplierName(option.name)}</span>
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
