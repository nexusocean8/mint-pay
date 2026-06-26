'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { api } from '@/lib/api';
import axios from 'axios';
import {
  BORDER,
  CARD,
  CARD_BORDER,
  HEADING,
  MUTED,
  PRIMARY,
  TEXT,
} from '@/lib/theme';

type Mode = 'loading' | 'login' | 'register' | 'error';

const terminalLines: { text: string; delay: number; color?: string }[] = [
  { text: '$ mintit status', delay: 0 },
  { text: 'CHAIN    STATUS     HEIGHT', delay: 600, color: MUTED },
  { text: 'firo     synced     1,330,612', delay: 1000, color: PRIMARY },
  { text: 'xmr      synced     3,204,891', delay: 1300, color: PRIMARY },
  { text: '', delay: 1800 },
  { text: '$ mintit invoices --status confirmed', delay: 2200 },
  { text: '✓ 3 confirmed invoices today', delay: 3000, color: PRIMARY },
];

function PanelTerminal() {
  const [visible, setVisible] = useState<number[]>([]);

  useEffect(() => {
    const timers = terminalLines.map((line, i) =>
      setTimeout(() => setVisible((v) => [...v, i]), line.delay + 300),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Box
      style={{
        background: '#080a0d',
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 6,
        fontFamily: HEADING,
        fontSize: 12,
        padding: '14px 18px',
        width: '100%',
        maxWidth: 360,
      }}
    >
      <Group gap={6} mb={10}>
        {['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => (
          <Box
            key={c}
            style={{ width: 9, height: 9, borderRadius: '50%', background: c }}
          />
        ))}
      </Group>
      {terminalLines.map((line, i) => (
        <Box
          key={i}
          style={{
            color: line.color || MUTED,
            opacity: visible.includes(i) ? 1 : 0,
            transition: 'opacity 0.4s ease',
            marginBottom: 3,
            whiteSpace: 'pre',
            minHeight: 18,
          }}
        >
          {line.text}
        </Box>
      ))}
    </Box>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <Box
      style={{
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 6,
        padding: '8px 14px',
        background: CARD,
        textAlign: 'center',
        minWidth: 90,
      }}
    >
      <Text
        style={{
          color: PRIMARY,
          fontFamily: HEADING,
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Box>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/auth/status');
        setMode(data.registered ? 'login' : 'register');
      } catch {
        setMode('error');
      }
    })();
  }, []);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email'),
      password: (v) => (v.length < 1 ? 'Password is required' : null),
    },
  });

  const handleSubmit = form.onSubmit(async ({ email, password }) => {
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      await api.post(endpoint, { email, password });
      router.push('/');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Invalid credentials');
      } else {
        setError('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  });

  if (mode === 'loading') {
    return (
      <Box
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      </Box>
    );
  }

  if (mode === 'error') {
    return (
      <Box
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text size="sm" c="red">
          Service unavailable. Please try again later.
        </Text>
      </Box>
    );
  }

  return (
    <Box style={{ flex: 1, display: 'flex', minHeight: '100vh' }}>
      {/* Left — form */}
      <Box
        style={{
          flex: '1 1 100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        <Box style={{ width: '100%', maxWidth: 420 }}>
          <Stack gap={4} mb="xl">
            <Text
              style={{
                color: PRIMARY,
                fontFamily: HEADING,
                fontSize: 12,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {mode === 'login' ? '// welcome back' : '// first time setup'}
            </Text>
            <Title
              order={2}
              style={{ color: TEXT, fontFamily: HEADING, fontWeight: 700 }}
            >
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Title>
            <Text size="sm" c="dimmed">
              {mode === 'login'
                ? 'Good to see you again.'
                : 'Set up your admin account.'}
            </Text>
          </Stack>

          <Paper
            p="xl"
            radius="sm"
            style={{ background: CARD, border: `1px solid ${CARD_BORDER}` }}
          >
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                {error && (
                  <Alert color="red" radius="sm" p="sm">
                    {error}
                  </Alert>
                )}
                <TextInput
                  label="Email"
                  placeholder="you@example.com"
                  size="md"
                  {...form.getInputProps('email')}
                />
                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  size="md"
                  {...form.getInputProps('password')}
                />
                <Button
                  type="submit"
                  color="brand"
                  fullWidth
                  size="md"
                  mt="xs"
                  loading={loading}
                  style={{ fontFamily: HEADING }}
                >
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                </Button>
              </Stack>
            </form>
          </Paper>
        </Box>
      </Box>

      {/* Divider */}
      <Box
        visibleFrom="md"
        style={{ width: 1, background: BORDER, flexShrink: 0 }}
      />

      {/* Right — visual panel */}
      <Box
        visibleFrom="md"
        style={{
          flex: '0 0 60%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
          padding: '48px 40px',
          background: `radial-gradient(ellipse at 60% 40%, ${PRIMARY}0d 0%, transparent 65%)`,
        }}
      >
        <Stack gap="xs" ta="center" mb={8}>
          <Title order={3} style={{ color: TEXT, fontFamily: HEADING }}>
            Your payments are running
          </Title>
          <Text size="sm" c="dimmed" maw={320}>
            Sign in to manage invoices, monitor chain status, and configure your
            processor.
          </Text>
        </Stack>

        <PanelTerminal />

        <Group gap="md" mt={8}>
          <StatChip label="chains" value="2" />
          <StatChip label="uptime" value="99.9%" />
          <StatChip label="privacy" value="100%" />
        </Group>
      </Box>
    </Box>
  );
}
