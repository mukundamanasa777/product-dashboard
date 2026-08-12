"use client";

import { Badge, Breadcrumbs, CloseButton, Group, Text } from "@mantine/core";
import type {
  BoardManufacturerOption,
  ChangeType,
  ProductStatus,
  SemiSupplierOption,
} from "../types";
import { humanizeChangeType } from "../utils/humanize";

interface FilterBreadcrumbsProps {
  searchTerm?: string;
  selectedSemiSuppliers: SemiSupplierOption[];
  selectedBoardManufacturers: BoardManufacturerOption[];
  selectedStatuses: ProductStatus[];
  selectedChangeTypes: ChangeType[];
  onRemoveSearch?: () => void;
  onRemoveSemiSupplier: (id: number) => void;
  onRemoveBoardManufacturer: (id: number) => void;
  onRemoveStatus: (status: ProductStatus) => void;
  onRemoveChangeType: (changeType: ChangeType) => void;
  onClearAll: () => void;
}

export function FilterBreadcrumbs({
  searchTerm,
  selectedSemiSuppliers,
  selectedBoardManufacturers,
  selectedStatuses,
  selectedChangeTypes,
  onRemoveSearch,
  onRemoveSemiSupplier,
  onRemoveBoardManufacturer,
  onRemoveStatus,
  onRemoveChangeType,
  onClearAll,
}: FilterBreadcrumbsProps) {
  const hasFilters =
    !!searchTerm ||
    selectedSemiSuppliers.length > 0 ||
    selectedBoardManufacturers.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedChangeTypes.length > 0;

  if (!hasFilters) {
    return (
      <Text size="sm" c="dimmed">
        No filters applied — showing all products
      </Text>
    );
  }

  const crumbs = [
    ...(searchTerm
      ? [
          <Badge
            key="search"
            variant="light"
            color="indigo"
            rightSection={
              onRemoveSearch && (
                <CloseButton
                  size="xs"
                  variant="transparent"
                  onClick={onRemoveSearch}
                  aria-label="Remove search filter"
                />
              )
            }
          >
            &quot;{searchTerm}&quot;
          </Badge>,
        ]
      : []),
    ...selectedSemiSuppliers.map((supplier) => (
      <Badge
        key={`semi-${supplier.id}`}
        variant="light"
        rightSection={
          <CloseButton
            size="xs"
            variant="transparent"
            onClick={() => onRemoveSemiSupplier(supplier.id)}
            aria-label={`Remove ${supplier.name} filter`}
          />
        }
      >
        {supplier.name}
      </Badge>
    )),
    ...selectedBoardManufacturers.map((manufacturer) => (
      <Badge
        key={`board-${manufacturer.id}`}
        variant="light"
        color="grape"
        rightSection={
          <CloseButton
            size="xs"
            variant="transparent"
            onClick={() => onRemoveBoardManufacturer(manufacturer.id)}
            aria-label={`Remove ${manufacturer.name} filter`}
          />
        }
      >
        {manufacturer.name}
      </Badge>
    )),
    ...selectedStatuses.map((status) => (
      <Badge
        key={`status-${status}`}
        variant="light"
        color="teal"
        rightSection={
          <CloseButton
            size="xs"
            variant="transparent"
            onClick={() => onRemoveStatus(status)}
            aria-label={`Remove ${status} filter`}
          />
        }
      >
        {status}
      </Badge>
    )),
    ...selectedChangeTypes.map((changeType) => (
      <Badge
        key={`change-${changeType}`}
        variant="light"
        color="orange"
        rightSection={
          <CloseButton
            size="xs"
            variant="transparent"
            onClick={() => onRemoveChangeType(changeType)}
            aria-label={`Remove ${changeType} filter`}
          />
        }
      >
        {humanizeChangeType(changeType)}
      </Badge>
    )),
  ];

  return (
    <Group justify="space-between" align="center">
      <Breadcrumbs separator="/">{crumbs}</Breadcrumbs>
      <Text
        size="xs"
        c="blue"
        onClick={onClearAll}
        style={{ cursor: "pointer" }}
      >
        Clear all
      </Text>
    </Group>
  );
}
