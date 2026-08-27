"use client";

import { useEffect, useState } from "react";
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
import { useLazyGetBoardManufacturersQuery } from "@/lib/redux/api";
import type { BoardManufacturerOption } from "../types";

// Was 5 — too small: the dropdown's options box has a fixed 200px max
// height (see mah below — an unrelated number, pixels vs. item count,
// that just happens to also be 200), and 5 rows can fit inside 200px
// without ever overflowing it. A non-overflowing container never fires
// scroll events, so the "load more on scroll" logic below could never
// even trigger — scrolling looked broken because there was nothing to
// scroll yet. 200 means essentially every realistic manufacturer count
// comes back in one fetch, so the box is reliably scrollable from the
// start and barely depends on the load-more mechanism at all; that stays
// in place as a safety net for searches matching more than that.
const PAGE_SIZE = 200;
const SEARCH_DEBOUNCE_MS = 300;
// Load the next page once the user has scrolled within this many pixels of
// the bottom of the dropdown, rather than waiting until they hit the exact
// end (which can feel like scrolling into a wall).
const LOAD_MORE_THRESHOLD_PX = 40;

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

  const [options, setOptions] = useState<BoardManufacturerOption[]>([]);
  const [total, setTotal] = useState(0);
  // 0 = nothing loaded yet for the current search term.
  const [loadedPage, setLoadedPage] = useState(0);

  const [fetchManufacturers, { isFetching }] =
    useLazyGetBoardManufacturersQuery();

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [search]);

  // Fetches page 1 fresh whenever the debounced search term changes,
  // replacing whatever was loaded for the previous term — same "fetch
  // data in an effect" shape react.dev itself documents. The state update
  // happens in the fetch's own .then() callback, not synchronously in the
  // effect body, which is what keeps this off
  // react-hooks/set-state-in-effect (that rule flags setState called
  // directly in an effect's body, not in an async callback it kicks off).
  useEffect(() => {
    let cancelled = false;

    fetchManufacturers({
      search: debouncedSearch || undefined,
      page: 1,
      pageSize: PAGE_SIZE,
    })
      .unwrap()
      .then((data) => {
        if (cancelled) return;
        setOptions(data.items);
        setTotal(data.total);
        setLoadedPage(1);
      })
      .catch(() => {
        // Combobox.Empty's "No board manufacturers found" covers a failed
        // fetch too — nothing further to show here.
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, fetchManufacturers]);

  const selectedIds = new Set(selected.map((s) => s.id));
  const hasMore = options.length < total;

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

  function loadMore() {
    if (isFetching || !hasMore) return;
    const nextPage = loadedPage + 1;

    fetchManufacturers({
      search: debouncedSearch || undefined,
      page: nextPage,
      pageSize: PAGE_SIZE,
    })
      .unwrap()
      .then((data) => {
        setOptions((prev) => [...prev, ...data.items]);
        setTotal(data.total);
        setLoadedPage(nextPage);
      })
      .catch(() => {});
  }

  function handleOptionsScroll(event: React.UIEvent<HTMLDivElement>) {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD_PX) {
      loadMore();
    }
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
          <Combobox.Options
            mah={200}
            style={{ overflowY: "auto" }}
            onScroll={handleOptionsScroll}
          >
            {options.length === 0 ? (
              <Combobox.Empty>
                {isFetching ? <Loader size="xs" /> : "No board manufacturers found"}
              </Combobox.Empty>
            ) : (
              <>
                {options.map((option) => (
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
                ))}
                {/* Reaching this branch at all means options is non-empty,
                    which only happens after page 1 has already resolved —
                    so any isFetching here is necessarily a load-more, not
                    the initial fetch (that one's covered by Combobox.Empty
                    above instead, since there's nothing to show yet). */}
                {isFetching && (
                  <Group justify="center" py="xs">
                    <Loader size="xs" />
                  </Group>
                )}
              </>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Stack>
  );
}
