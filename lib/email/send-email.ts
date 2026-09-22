import {
  getResendClient,
  CANONICAL_APP_URL,
  DEFAULT_EMAIL_FROM,
} from "./resend";
import { ProjectAddedEmail } from "./templates/project-added";
import { ProjectRemovedEmail } from "./templates/project-removed";
import { TaskAssignedEmail } from "./templates/task-assigned";

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
    return { attempted: false, delivered: false, skipped: true };
  }

  if (!params.email || !params.email.includes("@")) {
    return { attempted: false, delivered: false, error: "Invalid recipient email" };
  }

  try {
    const projectUrl = `${CANONICAL_APP_URL}/dashboard/projects/${params.projectId}`;

    const { data, error } = await resend.emails.send({
      from: DEFAULT_EMAIL_FROM,
      to: params.email,
      subject: `You've been added to project: ${params.projectName}`,
      react: ProjectAddedEmail({
        userName: params.userName,
        projectName: params.projectName,
        role: params.role,
        addedBy: params.addedBy,
        projectUrl,
      }),
    });

    if (error) {
      console.warn("[Resend Email] Delivery error (Project Added):", error.message);
      return { attempted: true, delivered: false, error: error.message };
    }

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
    return { attempted: false, delivered: false, skipped: true };
  }

  if (!params.email || !params.email.includes("@")) {
    return { attempted: false, delivered: false, error: "Invalid recipient email" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_EMAIL_FROM,
      to: params.email,
      subject: `Project membership update: ${params.projectName}`,
      react: ProjectRemovedEmail({
        userName: params.userName,
        projectName: params.projectName,
        removedBy: params.removedBy,
      }),
    });

    if (error) {
      console.warn("[Resend Email] Delivery error (Project Removed):", error.message);
      return { attempted: true, delivered: false, error: error.message };
    }

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
    return { attempted: false, delivered: false, skipped: true };
  }

  if (!params.email || !params.email.includes("@")) {
    return { attempted: false, delivered: false, error: "Invalid recipient email" };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey && apiKey.includes("xxxx")) {
    console.warn(
      `[Resend Email] Notice: RESEND_API_KEY is currently set to placeholder '${apiKey}'. Please add your active Resend API key to deliver real emails to ${params.email}.`,
    );
  }

  try {
    const taskUrl = `${CANONICAL_APP_URL}/dashboard/projects/${params.projectId}`;

    const subject = params.isReassigned
      ? `Task reassigned to you: ${params.taskTitle}`
      : `New task assigned: ${params.taskTitle} (${params.projectName})`;

    let { data, error } = await resend.emails.send({
      from: DEFAULT_EMAIL_FROM,
      to: params.email,
      subject,
      react: TaskAssignedEmail({
        userName: params.userName,
        taskTitle: params.taskTitle,
        projectName: params.projectName,
        assignedBy: params.assignedBy,
        dueDate: params.dueDate,
        priority: params.priority,
        taskUrl,
        isReassigned: params.isReassigned,
      }),
    });

    // Fallback if custom domain is not yet verified on Resend
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
        react: TaskAssignedEmail({
          userName: params.userName,
          taskTitle: params.taskTitle,
          projectName: params.projectName,
          assignedBy: params.assignedBy,
          dueDate: params.dueDate,
          priority: params.priority,
          taskUrl,
          isReassigned: params.isReassigned,
        }),
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
