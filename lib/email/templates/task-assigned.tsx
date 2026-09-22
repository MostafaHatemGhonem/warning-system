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

export interface TaskAssignedEmailProps {
  userName: string;
  taskTitle: string;
  projectName: string;
  assignedBy: string;
  dueDate?: string | null;
  priority?: string | null;
  taskUrl: string;
  isReassigned?: boolean;
}

export function TaskAssignedEmail({
  userName,
  taskTitle,
  projectName,
  assignedBy,
  dueDate,
  priority = "Medium",
  taskUrl,
  isReassigned = false,
}: TaskAssignedEmailProps) {
  const priorityColor =
    priority?.toLowerCase() === "high" || priority?.toLowerCase() === "urgent"
      ? "#ef4444"
      : priority?.toLowerCase() === "low"
        ? "#10b981"
        : "#f59e0b";

  return (
    <Html>
      <Head />
      <Preview>
        {isReassigned ? "Task reassigned to you: " : "New task assigned to you: "}
        {taskTitle}
      </Preview>
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
            <Heading style={heading}>
              {isReassigned ? "Task Reassigned To You" : "New Task Assigned"}
            </Heading>
            <Text style={paragraph}>
              Hello <strong>{userName}</strong>,
            </Text>
            <Text style={paragraph}>
              {isReassigned
                ? "A task has been reassigned to you by "
                : "You have been assigned a new task by "}
              <strong>{assignedBy}</strong> in project{" "}
              <strong>{projectName}</strong>.
            </Text>

            {/* Details Box */}
            <Section style={detailsBox}>
              <Text style={detailRow}>
                <span style={label}>Task:</span>{" "}
                <strong style={value}>{taskTitle}</strong>
              </Text>
              <Text style={detailRow}>
                <span style={label}>Project:</span>{" "}
                <strong style={value}>{projectName}</strong>
              </Text>
              <Text style={detailRow}>
                <span style={label}>Priority:</span>{" "}
                <span
                  style={{
                    ...badge,
                    color: priorityColor,
                    borderColor: `${priorityColor}40`,
                    backgroundColor: `${priorityColor}10`,
                  }}
                >
                  {priority || "Normal"}
                </span>
              </Text>
              {dueDate && (
                <Text style={detailRow}>
                  <span style={label}>Due Date:</span>{" "}
                  <strong style={value}>
                    {new Date(dueDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </strong>
                </Text>
              )}
              <Text style={detailRow}>
                <span style={label}>Assigned By:</span>{" "}
                <span style={value}>{assignedBy}</span>
              </Text>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={taskUrl}>
                View Task &rarr;
              </Button>
            </Section>

            <Text style={subtext}>
              Or copy and paste this link into your browser:
              <br />
              <a href={taskUrl} style={link}>
                {taskUrl}
              </a>
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

const badge: React.CSSProperties = {
  display: "inline-block",
  fontWeight: "600",
  fontSize: "12px",
  padding: "2px 8px",
  borderRadius: "6px",
  border: "1px solid",
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
