"use client";

import { Card, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconLink } from "@tabler/icons-react";

interface ToolItem {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

// Each tool is its own standalone page, opened in a new tab as a small
// tile below — none of these are wired into the main dashboard nav.
// URL Validator is the first; more just get appended here as they're built.
const TOOLS: ToolItem[] = [
  {
    key: "url-validator",
    title: "URL Validator",
    description:
      "Check every URL in an Excel column and get the file back with a result column added.",
    href: "/dashboard/tools/url-validator",
    icon: <IconLink size={22} />,
  },
];

export default function ToolsPage() {
  return (
    <Stack gap="lg">
      <div>
        <Title order={4}>Tools</Title>
        <Text size="sm" c="dimmed">
          Standalone utilities that aren&apos;t part of the main catalog
          workflow.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="md">
        {TOOLS.map((tool) => (
          <Card
            key={tool.key}
            component="a"
            href={tool.href}
            target="_blank"
            rel="noreferrer"
            withBorder
            padding="md"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Stack gap="xs">
              <ThemeIcon size={36} radius="md" variant="light">
                {tool.icon}
              </ThemeIcon>
              <Text fw={600}>{tool.title}</Text>
              <Text size="xs" c="dimmed">
                {tool.description}
              </Text>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
