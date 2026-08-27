"use client";

import { usePathname, useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  AppShell,
  Box,
  Container,
  Group,
  NavLink,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconBolt,
  IconCube,
  IconFileUpload,
  IconLink,
  IconPackage,
  IconTools,
} from "@tabler/icons-react";
import { StoreProvider } from "@/lib/redux/StoreProvider";

interface NavItem {
  value: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Catalog",
    items: [
      {
        value: "products",
        label: "Products",
        href: "/dashboard/products",
        icon: <IconPackage size={18} />,
      },
    ],
  },
  {
    label: "Pipeline",
    items: [
      {
        value: "instant",
        label: "Scan Triggering",
        href: "/dashboard/instant",
        icon: <IconBolt size={18} />,
      },
      {
        value: "link-check",
        label: "Link Check",
        href: "/dashboard/link-check",
        icon: <IconLink size={18} />,
      },
      {
        value: "file-upload",
        label: "File Upload",
        href: "/dashboard/file-upload",
        icon: <IconFileUpload size={18} />,
      },
      {
        value: "tools",
        label: "Tools",
        href: "/dashboard/tools",
        icon: <IconTools size={18} />,
      },
    ],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

function activeItemFor(pathname: string) {
  return (
    ALL_ITEMS.find((item) => pathname.startsWith(item.href))?.value ??
    "products"
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeValue = activeItemFor(pathname);

  return (
    <StoreProvider>
      <AppShell navbar={{ width: 260, breakpoint: 0 }} padding="md">
        <AppShell.Navbar p={0}>
          <Stack h="100%" gap={0} justify="space-between">
            <Box>
              <Group
                p="md"
                gap="sm"
                wrap="nowrap"
                style={{
                  borderBottom: "1px solid var(--mantine-color-gray-3)",
                }}
              >
                <ThemeIcon size={36} radius="md" variant="light">
                  <IconCube size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={700} size="sm" lh={1.2}>
                    Product Dashboard
                  </Text>
                  <Text size="xs" c="dimmed">
                    Scraping control plane
                  </Text>
                </div>
              </Group>

              <Stack gap="lg" p="md">
                {NAV_SECTIONS.map((section) => (
                  <Box key={section.label}>
                    <Text
                      size="xs"
                      fw={700}
                      c="dimmed"
                      tt="uppercase"
                      px={4}
                      mb={6}
                    >
                      {section.label}
                    </Text>
                    <Stack gap={2}>
                      {section.items.map((item) => (
                        <NavLink
                          key={item.value}
                          label={item.label}
                          leftSection={item.icon}
                          active={activeValue === item.value}
                          onClick={() => router.push(item.href)}
                          variant="light"
                          style={{ borderRadius: "var(--mantine-radius-sm)" }}
                        />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box
              p="md"
              style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
            >
              <Group gap="sm">
                <UserButton />
                <Text size="sm" c="dimmed">
                  Account
                </Text>
              </Group>
            </Box>
          </Stack>
        </AppShell.Navbar>

        <AppShell.Main>
          <Container size="xl" px={0}>
            {children}
          </Container>
        </AppShell.Main>
      </AppShell>
    </StoreProvider>
  );
}
