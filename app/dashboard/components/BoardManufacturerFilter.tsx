"use client";

import { useEffect, useState } from "react";
import {
  CheckIcon,
  Combobox,
  Group,
  Loader,
  Pagination,
  Pill,
  PillsInput,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { useGetBoardManufacturersQuery } from "@/lib/redux/api";
import type { BoardManufacturerOption } from "../types";

const PAGE_SIZE = 5;
const SEARCH_DEBOUNCE_MS = 300;

interface BoardManufacturerFilterProps {
  selected: BoardManufacturerOption[];
  onChange: (selected: BoardManufacturerOption[]) => void;
}

export function BoardManufacturerFilter({
  selected,
  onChange,
}: BoardManufacturerFilterProps) {
  const combobox = useCombobox();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isFetching } = useGetBoardManufacturersQuery({
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const options = data?.items ?? [];
  const total = data?.total ?? 0;

  const selectedIds = new Set(selected.map((s) => s.id));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function toggleOption(option: BoardManufacturerOption) {
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
        Board Manufacturer
      </Text>
      <Combobox
        store={combobox}
        onOptionSubmit={(value) => {
          const option = options.find((o) => String(o.id) === value);
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
                  {item.name}
                </Pill>
              ))}
              <Combobox.EventsTarget>
                <PillsInput.Field
                  placeholder="Search board manufacturers..."
                  value={search}
                  onChange={(event) => {
                    setPage(1);
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
          <Combobox.Options>
            {isFetching ? (
              <Combobox.Empty>
                <Loader size="xs" />
              </Combobox.Empty>
            ) : options.length === 0 ? (
              <Combobox.Empty>No board manufacturers found</Combobox.Empty>
            ) : (
              options.map((option) => (
                <Combobox.Option
                  value={String(option.id)}
                  key={option.id}
                  active={selectedIds.has(option.id)}
                >
                  <Group gap="xs">
                    {selectedIds.has(option.id) && <CheckIcon size={12} />}
                    <span>{option.name}</span>
                  </Group>
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
          {totalPages > 1 && (
            <Combobox.Footer>
              <Pagination
                total={totalPages}
                value={page}
                onChange={setPage}
                size="xs"
                withEdges
              />
            </Combobox.Footer>
          )}
        </Combobox.Dropdown>
      </Combobox>
    </Stack>
  );
}
