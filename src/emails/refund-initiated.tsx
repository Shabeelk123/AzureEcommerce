import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import { formatINR } from "@/lib/money";

export function RefundInitiatedEmail({
  orderNumber,
  amountPaise,
}: {
  orderNumber: string;
  amountPaise: number;
}) {
  return (
    <Html>
      <Head />
      <Preview>A refund has been initiated for order {orderNumber}</Preview>
      <Body style={{ backgroundColor: "#f6f5f2", fontFamily: "sans-serif" }}>
        <Container
          style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px", maxWidth: "480px" }}
        >
          <Heading style={{ fontSize: "20px", color: "#1f2a44" }}>Refund initiated</Heading>
          <Text style={{ color: "#3b3b3d", fontSize: "14px", lineHeight: "22px" }}>
            A refund of {formatINR(amountPaise)} has been initiated for order {orderNumber}.
            It will reflect in your original payment method within a few business days.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default RefundInitiatedEmail;
