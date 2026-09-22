import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Img,
  Preview,
} from "@react-email/components";
import { APP_LOGO_URL } from "@/lib/app-config";

export interface ProjectRemovedEmailProps {
  userName: string;
  projectName: string;
  removedBy: string;
}

export function ProjectRemovedEmail({
  userName,
  projectName,
  removedBy,
}: ProjectRemovedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Update regarding project: {projectName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header & Logo */}
          <Section style={header}>
            <Img
              src={APP_LOGO_URL}
              width="44"
              height="44"
              alt="Infinity Explorers"
              style={logo}
            />
            <Text style={brandName}>Infinity Explorers</Text>
          </Section>

          {/* Main Card */}
          <Section style={card}>
            <Heading style={heading}>Project Membership Update</Heading>
            <Text style={paragraph}>
              Hello <strong>{userName}</strong>,
            </Text>
            <Text style={paragraph}>
              This is to inform you that your membership on the project team for{" "}
              <strong>{projectName}</strong> has ended.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailRow}>
                <span style={label}>Project:</span>{" "}
                <strong style={value}>{projectName}</strong>
              </Text>
              <Text style={detailRow}>
                <span style={label}>Updated By:</span>{" "}
                <span style={value}>{removedBy}</span>
              </Text>
            </Section>

            <Text style={paragraph}>
              If you believe this change was made in error or have any questions, please reach out to your project lead or workspace administrator.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Infinity Explorers Enterprise Governance & Warning System.
              <br />
              This is an automated notification.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const main: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  padding: "24px 0",
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "0 16px",
};

const header: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

const logo: React.CSSProperties = {
  margin: "0 auto 8px auto",
  borderRadius: "8px",
};

const brandName: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: "700",
  color: "#09090b",
  letterSpacing: "-0.2px",
  margin: 0,
};

const card: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  border: "1px solid #e4e4e7",
  padding: "32px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
};

const heading: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#09090b",
  margin: "0 0 16px 0",
};

const paragraph: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#3f3f46",
  margin: "0 0 14px 0",
};

const detailsBox: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #f4f4f5",
  borderRadius: "12px",
  padding: "16px 20px",
  margin: "20px 0",
};

const detailRow: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "24px",
  color: "#52525b",
  margin: 0,
};

const label: React.CSSProperties = {
  color: "#71717a",
  fontWeight: "500",
};

const value: React.CSSProperties = {
  color: "#09090b",
};

const divider: React.CSSProperties = {
  borderColor: "#e4e4e7",
  margin: "24px 0 16px 0",
};

const footer: React.CSSProperties = {
  textAlign: "center" as const,
};

const footerText: React.CSSProperties = {
  fontSize: "11px",
  lineHeight: "18px",
  color: "#a1a1aa",
  margin: 0,
};
