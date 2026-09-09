import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { formatINR } from "@/lib/money";

export type OrderConfirmationItem = {
  productTitle: string;
  variantLabel: string;
  quantity: number;
  unitPricePaise: number;
};

export function OrderConfirmationEmail({
  orderNumber,
  items,
  subtotalPaise,
  discountPaise,
  shippingPaise,
  totalPaise,
  shippingAddress,
}: {
  orderNumber: string;
  items: OrderConfirmationItem[];
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  shippingAddress: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
  };
}) {
  return (
    <Html>
      <Head />
      <Preview>Your AzureHijabs order {orderNumber} is confirmed</Preview>
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
            Order confirmed
          </Heading>
          <Text style={{ color: "#3b3b3d", fontSize: "14px", lineHeight: "22px" }}>
            Thanks for your order — {orderNumber}. We&apos;ll email you again once it
            ships.
          </Text>

          <Section style={{ marginTop: "16px" }}>
            {items.map((item, i) => (
              <Row key={i} style={{ marginBottom: "8px" }}>
                <Column>
                  <Text style={{ margin: 0, fontSize: "13px", color: "#1f2a44" }}>
                    {item.productTitle} — {item.variantLabel} × {item.quantity}
                  </Text>
                </Column>
                <Column align="right">
                  <Text style={{ margin: 0, fontSize: "13px", color: "#1f2a44" }}>
                    {formatINR(item.unitPricePaise * item.quantity)}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Section
            style={{ marginTop: "8px", borderTop: "1px solid #eee", paddingTop: "12px" }}
          >
            <Row>
              <Column>
                <Text style={{ margin: 0, fontSize: "13px", color: "#6b6b6b" }}>
                  Subtotal
                </Text>
              </Column>
              <Column align="right">
                <Text style={{ margin: 0, fontSize: "13px" }}>
                  {formatINR(subtotalPaise)}
                </Text>
              </Column>
            </Row>
            {discountPaise > 0 && (
              <Row>
                <Column>
                  <Text style={{ margin: 0, fontSize: "13px", color: "#6b6b6b" }}>
                    Discount
                  </Text>
                </Column>
                <Column align="right">
                  <Text style={{ margin: 0, fontSize: "13px" }}>
                    -{formatINR(discountPaise)}
                  </Text>
                </Column>
              </Row>
            )}
            <Row>
              <Column>
                <Text style={{ margin: 0, fontSize: "13px", color: "#6b6b6b" }}>
                  Shipping
                </Text>
              </Column>
              <Column align="right">
                <Text style={{ margin: 0, fontSize: "13px" }}>
                  {shippingPaise === 0 ? "Free" : formatINR(shippingPaise)}
                </Text>
              </Column>
            </Row>
            <Row>
              <Column>
                <Text style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
                  Total
                </Text>
              </Column>
              <Column align="right">
                <Text style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
                  {formatINR(totalPaise)}
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={{ marginTop: "20px" }}>
            <Text
              style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#1f2a44" }}
            >
              Shipping to
            </Text>
            <Text style={{ margin: 0, fontSize: "13px", color: "#6b6b6b" }}>
              {shippingAddress.fullName}
              <br />
              {shippingAddress.line1}
              {shippingAddress.line2 ? `, ${shippingAddress.line2}` : ""}
              <br />
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.pincode}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderConfirmationEmail;
