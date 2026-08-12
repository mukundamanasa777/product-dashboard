"use client";

import { Button, Group, Modal, Text } from "@mantine/core";

interface ConfirmDialogProps {
  opened: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  confirmColor?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shared "are you sure?" gate for actions that aren't reversible from the
 * UI (approving/blocking a product, triggering a scan, changing the
 * schedule) — every caller gets the same look and the same behavior
 * (disabled cancel while the confirmed action is in flight).
 */
export function ConfirmDialog({
  opened,
  title,
  message,
  confirmLabel = "Confirm",
  confirmColor = "blue",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={title}
      // centered
      size="sm"
      zIndex={300}
    >
      <Text size="sm" mb="lg">
        {message}
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button color={confirmColor} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
}
