"use client";

import { useState } from "react";
import {
  Anchor,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Pagination,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { ProductVerifyModal } from "./ProductVerifyModal";
import {
  humanizeChangeType,
  humanizeSemiSupplierName,
} from "../utils/humanize";
import type { ProductDTO, ProductSource, ProductStatus } from "../types";

const STATUS_COLORS: Record<ProductStatus, string> = {
  PENDING: "yellow",
  APPROVED: "green",
  BLOCKED: "red",
};

const SOURCE_COLORS: Record<ProductSource, string> = {
  SCRAPED: "blue",
  UPLOADED: "grape",
};

const SOURCE_LABELS: Record<ProductSource, string> = {
  SCRAPED: "Scraped",
  UPLOADED: "Uploaded",
};

interface ProductsListProps {
  products: ProductDTO[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}

export function ProductsList({
  products,
  page,
  totalPages,
  onPageChange,
  loading,
}: ProductsListProps) {
  const [verifyingProduct, setVerifyingProduct] = useState<ProductDTO | null>(
    null,
  );

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  if (products.length === 0) {
    return (
      <Card withBorder padding="lg">
        <Text c="dimmed" ta="center">
          No products match the selected filters
        </Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Table.ScrollContainer minWidth={800}>
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Semi Supplier</Table.Th>
              <Table.Th>Board Manufacturer</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Change</Table.Th>
              <Table.Th>Source</Table.Th>
              <Table.Th>URL</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {products.map((product) => (
              <Table.Tr key={product.id}>
                <Table.Td>
                  <Text size="sm">{product.name}</Text>
                </Table.Td>
                <Table.Td>
                  {humanizeSemiSupplierName(product.semiSupplierName)}
                </Table.Td>
                <Table.Td>{product.boardManufacturerName}</Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLORS[product.status]} variant="light">
                    {product.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {humanizeChangeType(product.changeType)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={SOURCE_COLORS[product.source]} variant="dot">
                    {SOURCE_LABELS[product.source]}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Anchor
                    href={product.productUrl}
                    target="_blank"
                    rel="noreferrer"
                    size="sm"
                  >
                    <Group gap={4} wrap="nowrap" align="center">
                      <span>Open</span>
                      <IconExternalLink size={14} />
                    </Group>
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => setVerifyingProduct(product)}
                  >
                    Verify
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {totalPages > 1 && (
        <Pagination total={totalPages} value={page} onChange={onPageChange} />
      )}

      <ProductVerifyModal
        product={verifyingProduct}
        onClose={() => setVerifyingProduct(null)}
      />
    </Stack>
  );
}
