import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

export function OrderCancelledEmail({ orderNumber }: { orderNumber: string }) {
  return (
    <Html>
      <Head />
      <Preview>Your AzureHijabs order {orderNumber} has been cancelled</Preview>
      <Body style={{ backgroundColor: "#f6f5f2", fontFamily: "sans-serif" }}>
        <Container
          style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px", maxWidth: "480px" }}
        >
          <Heading style={{ fontSize: "20px", color: "#1f2a44" }}>Order cancelled</Heading>
          <Text style={{ color: "#3b3b3d", fontSize: "14px", lineHeight: "22px" }}>
            Order {orderNumber} has been cancelled. If you were charged, a refund has been
            initiated and will reflect in your original payment method within a few business
            days.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderCancelledEmail;
