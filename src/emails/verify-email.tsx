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

export function VerifyEmail({ verifyUrl }: { verifyUrl: string }) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email for AzureHijabs</Preview>
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
            Verify your email
          </Heading>
          <Text style={{ color: "#3b3b3d", fontSize: "14px", lineHeight: "22px" }}>
            Thanks for creating an AzureHijabs account. Confirm your email address to
            finish setting up your account.
          </Text>
          <Button
            href={verifyUrl}
            style={{
              backgroundColor: "#1f2a44",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "6px",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            Verify email
          </Button>
          <Text style={{ color: "#8a8a8d", fontSize: "12px", marginTop: "24px" }}>
            This link expires in 24 hours. If you didn&apos;t create an AzureHijabs
            account, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default VerifyEmail;
