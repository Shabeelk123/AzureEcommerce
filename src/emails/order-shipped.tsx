import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

export function OrderShippedEmail({
  orderNumber,
  trackingNumber,
  carrier,
}: {
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Your AzureHijabs order {orderNumber} has shipped</Preview>
      <Body style={{ backgroundColor: "#f6f5f2", fontFamily: "sans-serif" }}>
        <Container
          style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px", maxWidth: "480px" }}
        >
          <Heading style={{ fontSize: "20px", color: "#1f2a44" }}>Your order has shipped</Heading>
          <Text style={{ color: "#3b3b3d", fontSize: "14px", lineHeight: "22px" }}>
            Order {orderNumber} is on its way via {carrier}.
          </Text>
          <Text style={{ color: "#1f2a44", fontSize: "14px", fontWeight: 600 }}>
            Tracking number: {trackingNumber}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderShippedEmail;
