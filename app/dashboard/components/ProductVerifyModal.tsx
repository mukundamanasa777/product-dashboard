"use client";

import { useState } from "react";
import {
  Anchor,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import type { ProductDTO } from "../types";
import { ChangeType, ProductStatus } from "@/app/generated/prisma/wasm";
import { ConfirmDialog } from "./ConfirmDialog";
import { useApproveProductMutation, useRejectProductMutation } from "@/lib/redux/api";
import { humanizeChangeType } from "../utils/humanize";

interface ProductVerifyModalProps {
  product: ProductDTO | null;
  onClose: () => void;
}

type PendingAction = "approve" | "reject" | null;

export function ProductVerifyModal({
  product,
  onClose,
}: ProductVerifyModalProps) {
  const [approve, { isLoading: approving }] = useApproveProductMutation();
  const [reject, { isLoading: rejecting }] = useRejectProductMutation();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  async function handleApprove() {
    if (!product) return;

    setError(null);
    try {
      await approve(product.id).unwrap();
      onClose();
    } catch {
      setError("Could not approve this product. Please try again.");
    }
  }

  async function handleReject() {
    if (!product) return;

    setError(null);
    try {
      await reject(product.id).unwrap();
      onClose();
    } catch (err) {
      const message =
        err && typeof err === "object" && "data" in err
          ? (err.data as { error?: string } | undefined)?.error
          : undefined;
      setError(message ?? "Could not reject this product. Please try again.");
    }
  }

  const isNew = product?.changeType === ChangeType.NEW;
  const isExpired = product?.changeType === ChangeType.EXPIRED;
  const isNotFound = product?.changeType === ChangeType.NOT_FOUND;
  // EXPIRED (vanished from a scan) and NOT_FOUND (a direct link check came
  // back dead) mean different things to a reviewer, but resolve identically
  // — product.repository.approve() treats them the same way (-> BLOCKED),
  // so the UI has to agree with that or the confirm dialog below would
  // promise one outcome ("Approved") while the backend does another
  // ("Blocked").
  const isConfirmedGone = isExpired || isNotFound;
  const hasRemark = !!product?.remark;
  const hasFieldDiff = !!(
    product?.remark?.name ||
    product?.remark?.description ||
    product?.remark?.url
  );
  const isPending = product?.status === ProductStatus.PENDING;

  // "Approve"/"Reject" say the wrong thing for an EXPIRED/NOT_FOUND product
  // — the underlying outcome (confirm it's gone -> Blocked; don't believe
  // it -> roll back to what it was) is intentional, but calling that
  // "Approve" reads as if it keeps the product active. Label by outcome
  // instead.
  const approveLabel = isConfirmedGone
    ? "Confirm Removed"
    : product?.status === ProductStatus.APPROVED
      ? "Already Approved"
      : "Approve";
  const rejectLabel = isNew ? "Block" : isConfirmedGone ? "Restore" : "Reject";

  return (
    <Modal
      opened={!!product}
      onClose={onClose}
      title="Verify Product"
      size="lg"
    >
      {product && (
        <Stack gap="md">
          <div>
            <Text fw={700} size="lg">
              {product.name}
            </Text>
            <Anchor
              href={product.productUrl}
              target="_blank"
              rel="noreferrer"
              size="sm"
            >
              {product.productUrl}
            </Anchor>
          </div>

          <Group gap="xs">
            <Badge variant="light">{product.semiSupplierName}</Badge>
            <Badge variant="light" color="grape">
              {product.boardManufacturerName}
            </Badge>
            <Badge variant="light" color="teal">
              {product.status}
            </Badge>
            <Badge variant="light" color="orange">
              {humanizeChangeType(product.changeType)}
            </Badge>
          </Group>

          <Divider />

          {isNew || !hasRemark ? (
            <Stack gap={4}>
              <Text size="sm" fw={600} c="dimmed">
                Description
              </Text>
              <Text size="sm">
                {product.description ?? "No description available"}
              </Text>
            </Stack>
          ) : hasFieldDiff && product.status ? (
            <Stack gap="sm">
              <Text size="sm" fw={600} c="dimmed">
                Changes
              </Text>

              {product.remark?.name && (
                <Stack gap={4}>
                  <Text size="sm" fw={500}>
                    Name
                  </Text>
                  <Text size="sm" c="red" td="line-through">
                    {product.remark.name.old}
                  </Text>
                  <Text size="sm" c="green">
                    {product.remark.name.new}
                  </Text>
                </Stack>
              )}

              {product.remark?.description && (
                <Stack gap={4}>
                  <Text size="sm" fw={500}>
                    Description
                  </Text>
                  <Text size="sm" c="red" td="line-through">
                    {product.remark.description.old ?? "—"}
                  </Text>
                  <Text size="sm" c="green">
                    {product.remark.description.new}
                  </Text>
                </Stack>
              )}

              {product.remark?.url && (
                <Stack gap={4}>
                  <Text size="sm" fw={500}>
                    URL
                  </Text>
                  <Text size="sm" c="red" td="line-through">
                    {product.remark.url.old}
                  </Text>
                  <Text size="sm" c="green">
                    {product.remark.url.new}
                  </Text>
                </Stack>
              )}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              {product.changeType === "EXPIRED"
                ? "This product was not found in the latest scan."
                : product.changeType === "NOT_FOUND"
                  ? "This product's link was checked directly and came back broken (e.g. a 404 or an unreachable site)."
                  : product.changeType === "RESTORED"
                    ? "This product reappeared in the latest scan with no other changes."
                    : "No changes to display."}
            </Text>
          )}

          {error && (
            <Text size="sm" c="red">
              {error}
            </Text>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
            <Button
              color="red"
              variant="light"
              onClick={() => setPendingAction("reject")}
              loading={rejecting}
              disabled={!isPending}
            >
              {rejectLabel}
            </Button>
            <Button
              onClick={() => setPendingAction("approve")}
              loading={approving}
              disabled={!isPending}
            >
              {approveLabel}
            </Button>
          </Group>
        </Stack>
      )}

      <ConfirmDialog
        opened={pendingAction !== null}
        title={
          pendingAction === "approve"
            ? isConfirmedGone
              ? "Confirm this product is really gone?"
              : "Approve this product?"
            : isNew
              ? "Block this product?"
              : isConfirmedGone
                ? "Restore this product?"
                : "Reject this change?"
        }
        message={
          pendingAction === "approve"
            ? isConfirmedGone
              ? "This product will be marked Blocked and excluded from the active catalog. This isn't reversible from here."
              : "This product will be marked Approved. This isn't reversible from here."
            : isNew
              ? "This product will be excluded from the catalog and won't be re-flagged as new by future scans. This isn't reversible from here."
              : "This will revert the product back to its previous data and undo this pending change. This isn't reversible from here."
        }
        confirmLabel={pendingAction === "approve" ? approveLabel : rejectLabel}
        confirmColor={pendingAction === "approve" ? "blue" : "red"}
        loading={pendingAction === "approve" ? approving : rejecting}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          if (action === "approve") handleApprove();
          if (action === "reject") handleReject();
        }}
      />
    </Modal>
  );
}
