import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Img,
  Preview,
} from "@react-email/components";
import { APP_LOGO_URL } from "@/lib/app-config";

export interface ProjectAddedEmailProps {
  userName: string;
  projectName: string;
  role?: string;
  addedBy: string;
  projectUrl: string;
}

export function ProjectAddedEmail({
  userName,
  projectName,
  role = "Team Member",
  addedBy,
  projectUrl,
}: ProjectAddedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You have been added to project: {projectName}</Preview>
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
            <Heading style={heading}>Project Invitation</Heading>
            <Text style={paragraph}>
              Hello <strong>{userName}</strong>,
            </Text>
            <Text style={paragraph}>
              You have been added to the project team for{" "}
              <strong style={highlight}>{projectName}</strong> by{" "}
              <strong>{addedBy}</strong>.
            </Text>

            {/* Details Box */}
            <Section style={detailsBox}>
              <Text style={detailRow}>
                <span style={label}>Project Name:</span>{" "}
                <strong style={value}>{projectName}</strong>
              </Text>
              <Text style={detailRow}>
                <span style={label}>Assigned Role:</span>{" "}
                <span style={badge}>{role}</span>
              </Text>
              <Text style={detailRow}>
                <span style={label}>Added By:</span>{" "}
                <span style={value}>{addedBy}</span>
              </Text>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={projectUrl}>
                Open Project Workspace &rarr;
              </Button>
            </Section>

            <Text style={subtext}>
              Or copy and paste this link into your browser:
              <br />
              <a href={projectUrl} style={link}>
                {projectUrl}
              </a>
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Infinity Explorers Enterprise Governance & Warning System.
              <br />
              This is an automated notification. You received this because you are a registered workspace member.
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

const highlight: React.CSSProperties = {
  color: "#09090b",
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

const badge: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#f4f4f5",
  color: "#18181b",
  fontWeight: "600",
  fontSize: "12px",
  padding: "2px 8px",
  borderRadius: "6px",
  border: "1px solid #e4e4e7",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "28px 0 20px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#09090b",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  borderRadius: "10px",
  padding: "12px 28px",
  display: "inline-block",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
};

const subtext: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#a1a1aa",
  textAlign: "center" as const,
  margin: "16px 0 0 0",
};

const link: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
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
