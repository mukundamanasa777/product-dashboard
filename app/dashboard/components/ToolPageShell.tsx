"use client";

import { Anchor, Card, Center, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

interface ToolPageShellProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

/**
 * Compact, centered shell every standalone tool page shares — a small
 * icon-led header over a narrow card, instead of a full dashboard-width
 * page. New tools (see /dashboard/tools) just drop their own controls in
 * as children; this is what keeps them all looking like one small, focused
 * utility rather than a stretched-out dashboard screen.
 */
export function ToolPageShell({
  icon,
  title,
  description,
  children,
}: ToolPageShellProps) {
  return (
    <Center>
      <Stack gap="md" maw={420} w="100%">
        <Anchor href="/dashboard/tools" size="xs" c="dimmed" underline="hover">
          <Group gap={4} wrap="nowrap">
            <IconArrowLeft size={14} />
            <span>All tools</span>
          </Group>
        </Anchor>

        <Stack gap={4} align="center" ta="center">
          <ThemeIcon size={44} radius="md" variant="light">
            {icon}
          </ThemeIcon>
          <Title order={4}>{title}</Title>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </Stack>

        <Card withBorder padding="md">
          {children}
        </Card>
      </Stack>
    </Center>
  );
}
