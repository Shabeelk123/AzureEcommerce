import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

export function ResetPasswordEmail({ resetUrl }: { resetUrl: string }) {
  return (
    <Html>
      <Head />
      <Preview>Reset your AzureHijabs password</Preview>
      <Body style={{ backgroundColor: "#f6f5f2", fontFamily: "sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "32px",
            borderRadius: "8px",
            maxWidth: "480px",
          }}
        >
          <Heading style={{ fontSize: "20px", color: "#1f2a44" }}>
            Reset your password
          </Heading>
          <Text style={{ color: "#3b3b3d", fontSize: "14px", lineHeight: "22px" }}>
            We received a request to reset the password for your AzureHijabs account.
            Click below to choose a new one.
          </Text>
          <Button
            href={resetUrl}
            style={{
              backgroundColor: "#1f2a44",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "6px",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            Reset password
          </Button>
          <Text style={{ color: "#8a8a8d", fontSize: "12px", marginTop: "24px" }}>
            This link expires in 1 hour. If you didn&apos;t request a password reset, you
            can safely ignore this email — your password won&apos;t change.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ResetPasswordEmail;
