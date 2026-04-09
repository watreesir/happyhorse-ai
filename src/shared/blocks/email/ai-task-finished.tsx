import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

type AITaskFinishedEmailProps = {
  appName: string;
  logoUrl?: string;
  previewText: string;
  title: string;
  summary: string;
  detailLine?: string;
  promptLine?: string;
  retentionLine?: string;
  actionLabel: string;
  actionUrl: string;
  footer: string;
};

export function AITaskFinishedEmail({
  appName,
  logoUrl,
  previewText,
  title,
  summary,
  detailLine,
  promptLine,
  retentionLine,
  actionLabel,
  actionUrl,
  footer,
}: AITaskFinishedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            {(logoUrl || appName) && (
              <Section style={styles.brandRow}>
                {logoUrl ? (
                  <Img
                    src={logoUrl}
                    width="32"
                    height="32"
                    alt={appName}
                    style={styles.logo}
                  />
                ) : null}
                <Text style={styles.brand}>{appName}</Text>
              </Section>
            )}

            <Heading style={styles.h1}>{title}</Heading>
            <Text style={styles.p}>{summary}</Text>
            {detailLine ? <Text style={styles.p}>{detailLine}</Text> : null}
            {promptLine ? <Text style={styles.p}>{promptLine}</Text> : null}
            {retentionLine ? <Text style={styles.p}>{retentionLine}</Text> : null}

            <Section style={styles.buttonWrap}>
              <Button href={actionUrl} style={styles.button}>
                {actionLabel}
              </Button>
            </Section>

            <Text style={styles.footer}>{footer}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: '#f6f7fb',
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Helvetica,Arial,sans-serif',
    color: '#0f172a',
  },
  container: {
    maxWidth: 560,
    margin: '0 auto',
    padding: '28px 16px 36px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    border: '1px solid rgba(15, 23, 42, 0.10)',
    padding: '24px 22px',
    boxShadow:
      '0 16px 38px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  logo: {
    borderRadius: 8,
    border: '1px solid rgba(15, 23, 42, 0.10)',
  },
  brand: {
    margin: 0,
    fontSize: 14,
    lineHeight: '20px',
    fontWeight: 600,
  },
  h1: {
    margin: '0 0 10px',
    fontSize: 24,
    lineHeight: '30px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  p: {
    margin: '0 0 10px',
    fontSize: 14,
    lineHeight: '22px',
    color: '#334155',
  },
  buttonWrap: {
    marginTop: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: 10,
    padding: '11px 16px',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
    display: 'inline-block',
  },
  footer: {
    margin: '12px 0 0',
    fontSize: 12,
    lineHeight: '18px',
    color: '#64748b',
  },
};
