import {
  getResendClient,
  CANONICAL_APP_URL,
  DEFAULT_EMAIL_FROM,
} from "./resend";
import {
  renderTaskAssignedHtml,
  renderProjectAddedHtml,
  renderProjectRemovedHtml,
  renderWarningIssuedHtml,
} from "./templates/html-templates";

export interface SendEmailResult {
  attempted: boolean;
  delivered: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Sends an email notification when a member is added to a project.
 * Completely non-blocking and safe against missing API keys.
 */
export async function sendProjectAddedEmail(params: {
  email: string;
  userName: string;
  projectName: string;
  role?: string;
  addedBy: string;
  projectId: string;
}): Promise<SendEmailResult> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Resend Email] Skipped project added email: RESEND_API_KEY is not configured.");
    return { attempted: false, delivered: false, skipped: true };
  }

  if (!params.email || !params.email.includes("@")) {
    return { attempted: false, delivered: false, error: "Invalid recipient email" };
  }

  try {
    const projectUrl = `${CANONICAL_APP_URL}/dashboard/projects/${params.projectId}`;
    const subject = `You've been added to project: ${params.projectName}`;
    const html = renderProjectAddedHtml({
      userName: params.userName,
      projectName: params.projectName,
      role: params.role,
      addedBy: params.addedBy,
      projectUrl,
    });

    let { data, error } = await resend.emails.send({
      from: DEFAULT_EMAIL_FROM,
      to: params.email,
      subject,
      html,
    });

    // Fallback if custom domain has temporary issue
    if (
      error &&
      (error.message.toLowerCase().includes("domain") ||
        error.message.toLowerCase().includes("verify") ||
        error.message.toLowerCase().includes("verified"))
    ) {
      console.warn(
        `[Resend Email] Custom sender '${DEFAULT_EMAIL_FROM}' domain error. Retrying via onboarding@resend.dev...`,
      );
      const fallbackResult = await resend.emails.send({
        from: "Infinity Explorers <onboarding@resend.dev>",
        to: params.email,
        subject,
        html,
      });

      if (!fallbackResult.error) {
        data = fallbackResult.data;
        error = null;
      } else {
        error = fallbackResult.error;
      }
    }

    if (error) {
      console.warn("[Resend Email] Delivery error (Project Added):", error.message);
      return { attempted: true, delivered: false, error: error.message };
    }

    console.log(`[Resend Email] Project added email sent successfully to ${params.email} (ID: ${data?.id})`);
    return { attempted: true, delivered: true, id: data?.id };
  } catch (err: any) {
    console.error("[Resend Email] Unexpected error sending project added email:", err?.message || err);
    return { attempted: true, delivered: false, error: err?.message || "Internal error" };
  }
}

/**
 * Sends an email notification when a member is removed from a project.
 */
export async function sendProjectRemovedEmail(params: {
  email: string;
  userName: string;
  projectName: string;
  removedBy: string;
  projectId: string;
}): Promise<SendEmailResult> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Resend Email] Skipped project removed email: RESEND_API_KEY is not configured.");
    return { attempted: false, delivered: false, skipped: true };
  }

  if (!params.email || !params.email.includes("@")) {
    return { attempted: false, delivered: false, error: "Invalid recipient email" };
  }

  try {
    const subject = `Project membership update: ${params.projectName}`;
    const html = renderProjectRemovedHtml({
      userName: params.userName,
      projectName: params.projectName,
      removedBy: params.removedBy,
    });

    let { data, error } = await resend.emails.send({
      from: DEFAULT_EMAIL_FROM,
      to: params.email,
      subject,
      html,
    });

    if (error) {
      console.warn("[Resend Email] Delivery error (Project Removed):", error.message);
      return { attempted: true, delivered: false, error: error.message };
    }

    console.log(`[Resend Email] Project removed email sent successfully to ${params.email} (ID: ${data?.id})`);
    return { attempted: true, delivered: true, id: data?.id };
  } catch (err: any) {
    console.error("[Resend Email] Unexpected error sending project removed email:", err?.message || err);
    return { attempted: true, delivered: false, error: err?.message || "Internal error" };
  }
}

/**
 * Sends an email notification when a task is assigned or reassigned to a member.
 */
export async function sendTaskAssignedEmail(params: {
  email: string;
  userName: string;
  taskTitle: string;
  projectName: string;
  assignedBy: string;
  dueDate?: string | null;
  priority?: string | null;
  taskId: string;
  projectId: string;
  isReassigned?: boolean;
}): Promise<SendEmailResult> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Resend Email] Skipped task assigned email: RESEND_API_KEY is not configured in process.env.");
    return { attempted: false, delivered: false, skipped: true };
  }

  if (!params.email || !params.email.includes("@")) {
    console.warn(`[Resend Email] Invalid recipient email: "${params.email}"`);
    return { attempted: false, delivered: false, error: "Invalid recipient email" };
  }

  try {
    const taskUrl = `${CANONICAL_APP_URL}/dashboard/projects/${params.projectId}`;
    const subject = params.isReassigned
      ? `Task reassigned to you: ${params.taskTitle}`
      : `New task assigned: ${params.taskTitle} (${params.projectName})`;

    const html = renderTaskAssignedHtml({
      userName: params.userName,
      taskTitle: params.taskTitle,
      projectName: params.projectName,
      assignedBy: params.assignedBy,
      dueDate: params.dueDate,
      priority: params.priority,
      taskUrl,
      isReassigned: params.isReassigned,
    });

    let { data, error } = await resend.emails.send({
      from: DEFAULT_EMAIL_FROM,
      to: params.email,
      subject,
      html,
    });

    // Fallback if custom sender domain has an issue
    if (
      error &&
      (error.message.toLowerCase().includes("domain") ||
        error.message.toLowerCase().includes("verify") ||
        error.message.toLowerCase().includes("verified"))
    ) {
      console.warn(
        `[Resend Email] Custom sender '${DEFAULT_EMAIL_FROM}' domain is not verified yet. Retrying via onboarding@resend.dev...`,
      );
      const fallbackResult = await resend.emails.send({
        from: "Infinity Explorers <onboarding@resend.dev>",
        to: params.email,
        subject,
        html,
      });

      if (!fallbackResult.error) {
        data = fallbackResult.data;
        error = null;
      } else {
        error = fallbackResult.error;
      }
    }

    if (error) {
      console.warn("[Resend Email] Delivery error (Task Assigned):", error.message);
      return { attempted: true, delivered: false, error: error.message };
    }

    console.log(
      `[Resend Email] Task notification email sent successfully to ${params.email} (Email ID: ${data?.id})`,
    );
    return { attempted: true, delivered: true, id: data?.id };
  } catch (err: any) {
    console.error("[Resend Email] Unexpected error sending task assigned email:", err?.message || err);
    return { attempted: true, delivered: false, error: err?.message || "Internal error" };
  }
}

/**
 * Sends an email notification to a member when an official disciplinary warning is issued or activated.
 */
export async function sendWarningIssuedEmail(params: {
  email: string;
  userName: string;
  warningLevel: string;
  warningType: string;
  projectName?: string;
  severity: number;
  points: number;
  description: string;
  incidentDate?: string | Date | null;
  issuedBy: string;
  warningId?: string;
  status?: string;
}): Promise<SendEmailResult> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Resend Email] Skipped warning email: RESEND_API_KEY is not configured.");
    return { attempted: false, delivered: false, skipped: true };
  }

  if (!params.email || !params.email.includes("@")) {
    console.warn(`[Resend Email] Invalid recipient email for warning: "${params.email}"`);
    return { attempted: false, delivered: false, error: "Invalid recipient email" };
  }

  try {
    const warningUrl = `${CANONICAL_APP_URL}/dashboard/warnings`;
    const subject = `[Disciplinary Notice] ${params.warningLevel} Issued - Infinity Explorers`;

    const html = renderWarningIssuedHtml({
      userName: params.userName,
      warningLevel: params.warningLevel,
      warningType: params.warningType,
      projectName: params.projectName || "Global / Organization-wide",
      severity: params.severity,
      points: params.points,
      description: params.description,
      incidentDate: params.incidentDate,
      issuedBy: params.issuedBy,
      status: params.status || "Active",
      warningUrl,
    });

    let { data, error } = await resend.emails.send({
      from: DEFAULT_EMAIL_FROM,
      to: params.email,
      subject,
      html,
    });

    // Fallback if custom domain has temporary issue
    if (
      error &&
      (error.message.toLowerCase().includes("domain") ||
        error.message.toLowerCase().includes("verify") ||
        error.message.toLowerCase().includes("verified"))
    ) {
      console.warn(
        `[Resend Email] Custom sender '${DEFAULT_EMAIL_FROM}' domain error. Retrying warning notice via onboarding@resend.dev...`,
      );
      const fallbackResult = await resend.emails.send({
        from: "Infinity Explorers <onboarding@resend.dev>",
        to: params.email,
        subject,
        html,
      });

      if (!fallbackResult.error) {
        data = fallbackResult.data;
        error = null;
      } else {
        error = fallbackResult.error;
      }
    }

    if (error) {
      console.warn("[Resend Email] Delivery error (Warning Notice):", error.message);
      return { attempted: true, delivered: false, error: error.message };
    }

    console.log(
      `[Resend Email] Warning notification email sent successfully to ${params.email} (Email ID: ${data?.id})`,
    );
    return { attempted: true, delivered: true, id: data?.id };
  } catch (err: any) {
    console.error("[Resend Email] Unexpected error sending warning email:", err?.message || err);
    return { attempted: true, delivered: false, error: err?.message || "Internal error" };
  }
}

