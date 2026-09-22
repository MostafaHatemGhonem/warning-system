import { APP_LOGO_URL } from "@/lib/app-config";

export interface TaskAssignedEmailHtmlProps {
  userName: string;
  taskTitle: string;
  projectName: string;
  assignedBy: string;
  dueDate?: string | null;
  priority?: string | null;
  taskUrl: string;
  isReassigned?: boolean;
}

export function renderTaskAssignedHtml(params: TaskAssignedEmailHtmlProps): string {
  const {
    userName,
    taskTitle,
    projectName,
    assignedBy,
    dueDate,
    priority = "Medium",
    taskUrl,
    isReassigned = false,
  } = params;

  const priorityColor =
    priority?.toLowerCase() === "high" || priority?.toLowerCase() === "urgent"
      ? "#dc2626"
      : priority?.toLowerCase() === "low"
        ? "#16a34a"
        : "#d97706";

  const priorityBg =
    priority?.toLowerCase() === "high" || priority?.toLowerCase() === "urgent"
      ? "#fef2f2"
      : priority?.toLowerCase() === "low"
        ? "#f0fdf4"
        : "#fffbeb";

  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isReassigned ? "Task Reassigned" : "New Task Assigned"}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 560px; margin: 0 auto;" border="0" cellspacing="0" cellpadding="0">
          <!-- Logo & Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <img src="${APP_LOGO_URL}" width="48" height="48" alt="Infinity Explorers" style="border-radius: 10px; display: block; margin-bottom: 8px;" />
              <div style="font-size: 16px; font-weight: 700; color: #09090b; letter-spacing: -0.2px;">Infinity Explorers</div>
            </td>
          </tr>

          <!-- Card Content -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
              <h1 style="font-size: 20px; font-weight: 700; color: #09090b; margin: 0 0 16px 0;">
                ${isReassigned ? "Task Reassigned To You" : "New Task Assigned"}
              </h1>
              <p style="font-size: 14px; line-height: 22px; color: #3f3f46; margin: 0 0 14px 0;">
                Hello <strong>${userName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 22px; color: #3f3f46; margin: 0 0 20px 0;">
                ${
                  isReassigned
                    ? `A task has been reassigned to you by <strong>${assignedBy}</strong> in project <strong>${projectName}</strong>.`
                    : `You have been assigned a new task by <strong>${assignedBy}</strong> in project <strong>${projectName}</strong>.`
                }
              </p>

              <!-- Details Box -->
              <table width="100%" style="background-color: #fafafa; border: 1px solid #f4f4f5; border-radius: 12px; padding: 16px; margin-bottom: 24px;" border="0" cellspacing="0" cellpadding="6">
                <tr>
                  <td width="30%" style="font-size: 13px; color: #71717a; font-weight: 500;">Task:</td>
                  <td style="font-size: 13px; color: #09090b; font-weight: 700;">${taskTitle}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #71717a; font-weight: 500;">Project:</td>
                  <td style="font-size: 13px; color: #09090b; font-weight: 600;">${projectName}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #71717a; font-weight: 500;">Priority:</td>
                  <td>
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; color: ${priorityColor}; background-color: ${priorityBg}; border: 1px solid ${priorityColor}30; padding: 2px 8px; border-radius: 6px; text-transform: uppercase;">
                      ${priority}
                    </span>
                  </td>
                </tr>
                ${
                  formattedDueDate
                    ? `
                <tr>
                  <td style="font-size: 13px; color: #71717a; font-weight: 500;">Due Date:</td>
                  <td style="font-size: 13px; color: #09090b; font-weight: 600;">${formattedDueDate}</td>
                </tr>
                `
                    : ""
                }
                <tr>
                  <td style="font-size: 13px; color: #71717a; font-weight: 500;">Assigned By:</td>
                  <td style="font-size: 13px; color: #3f3f46;">${assignedBy}</td>
                </tr>
              </table>

              <!-- Action Button -->
              <div style="text-align: center; margin: 28px 0 20px 0;">
                <a href="${taskUrl}" style="background-color: #09090b; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; padding: 12px 32px; display: inline-block; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                  View Task in Workspace &rarr;
                </a>
              </div>

              <div style="font-size: 12px; line-height: 18px; color: #a1a1aa; text-align: center; margin-top: 16px;">
                Direct Link: <a href="${taskUrl}" style="color: #2563eb; text-decoration: underline;">${taskUrl}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px; font-size: 11px; line-height: 18px; color: #a1a1aa;">
              Infinity Explorers Enterprise Governance & Warning System.<br/>
              This is an automated system notification.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export interface ProjectAddedEmailHtmlProps {
  userName: string;
  projectName: string;
  role?: string;
  addedBy: string;
  projectUrl: string;
}

export function renderProjectAddedHtml(params: ProjectAddedEmailHtmlProps): string {
  const { userName, projectName, role = "Team Member", addedBy, projectUrl } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Added to Project Team</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 560px; margin: 0 auto;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <img src="${APP_LOGO_URL}" width="48" height="48" alt="Infinity Explorers" style="border-radius: 10px; display: block; margin-bottom: 8px;" />
              <div style="font-size: 16px; font-weight: 700; color: #09090b;">Infinity Explorers</div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
              <h1 style="font-size: 20px; font-weight: 700; color: #09090b; margin: 0 0 16px 0;">Project Invitation</h1>
              <p style="font-size: 14px; line-height: 22px; color: #3f3f46; margin: 0 0 14px 0;">
                Hello <strong>${userName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 22px; color: #3f3f46; margin: 0 0 20px 0;">
                You have been added to the project team for <strong>${projectName}</strong> by <strong>${addedBy}</strong>.
              </p>
              <table width="100%" style="background-color: #fafafa; border: 1px solid #f4f4f5; border-radius: 12px; padding: 16px; margin-bottom: 24px;" border="0" cellspacing="0" cellpadding="6">
                <tr>
                  <td width="30%" style="font-size: 13px; color: #71717a; font-weight: 500;">Project:</td>
                  <td style="font-size: 13px; color: #09090b; font-weight: 700;">${projectName}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #71717a; font-weight: 500;">Assigned Role:</td>
                  <td style="font-size: 13px; color: #4f46e5; font-weight: 600;">${role}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #71717a; font-weight: 500;">Added By:</td>
                  <td style="font-size: 13px; color: #3f3f46;">${addedBy}</td>
                </tr>
              </table>
              <div style="text-align: center; margin: 28px 0 20px 0;">
                <a href="${projectUrl}" style="background-color: #09090b; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; padding: 12px 32px; display: inline-block;">
                  Open Project Workspace &rarr;
                </a>
              </div>
              <div style="font-size: 12px; line-height: 18px; color: #a1a1aa; text-align: center; margin-top: 16px;">
                Direct Link: <a href="${projectUrl}" style="color: #2563eb; text-decoration: underline;">${projectUrl}</a>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 24px; font-size: 11px; line-height: 18px; color: #a1a1aa;">
              Infinity Explorers Enterprise Governance & Warning System.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export interface ProjectRemovedEmailHtmlProps {
  userName: string;
  projectName: string;
  removedBy: string;
}

export function renderProjectRemovedHtml(params: ProjectRemovedEmailHtmlProps): string {
  const { userName, projectName, removedBy } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Membership Update</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 560px; margin: 0 auto;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <img src="${APP_LOGO_URL}" width="48" height="48" alt="Infinity Explorers" style="border-radius: 10px; display: block; margin-bottom: 8px;" />
              <div style="font-size: 16px; font-weight: 700; color: #09090b;">Infinity Explorers</div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
              <h1 style="font-size: 20px; font-weight: 700; color: #09090b; margin: 0 0 16px 0;">Membership Update</h1>
              <p style="font-size: 14px; line-height: 22px; color: #3f3f46; margin: 0 0 14px 0;">
                Hello <strong>${userName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 22px; color: #3f3f46; margin: 0 0 20px 0;">
                You have been removed from the team for project <strong>${projectName}</strong> by <strong>${removedBy}</strong>.
              </p>
              <p style="font-size: 13px; line-height: 20px; color: #71717a;">
                If you believe this was made in error, please contact your project lead or workspace administrator.
              </p>
            </td>
          </tr>
          <tr>
             <td align="center" style="padding-top: 24px; font-size: 11px; line-height: 18px; color: #a1a1aa;">
              Infinity Explorers Enterprise Governance & Warning System.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export interface WarningIssuedEmailHtmlProps {
  userName: string;
  warningLevel: string;
  warningType: string;
  projectName: string;
  severity: number;
  points: number;
  description: string;
  incidentDate?: string | Date | null;
  issuedBy: string;
  status?: string;
  warningUrl: string;
}

export function renderWarningIssuedHtml(params: WarningIssuedEmailHtmlProps): string {
  const {
    userName,
    warningLevel,
    warningType,
    projectName,
    severity,
    points,
    description,
    incidentDate,
    issuedBy,
    status = "Active",
    warningUrl,
  } = params;

  const isFinal = warningLevel.toLowerCase().includes("final");
  const isSecond = warningLevel.toLowerCase().includes("second");

  const badgeColor = isFinal ? "#dc2626" : isSecond ? "#ea580c" : "#d97706";
  const badgeBg = isFinal ? "#fef2f2" : isSecond ? "#fff7ed" : "#fffbeb";
  const badgeBorder = isFinal ? "#fecaca" : isSecond ? "#ffedd5" : "#fef3c7";
  const headerAccent = isFinal ? "#b91c1c" : isSecond ? "#c2410c" : "#b45309";

  const formattedDate = incidentDate
    ? new Date(incidentDate).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  const displayStatus = status === "Active" ? "Active" : "Pending Committee Review";
  const statusBg = status === "Active" ? "#f0fdf4" : "#fef3c7";
  const statusColor = status === "Active" ? "#16a34a" : "#b45309";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Disciplinary Notice - ${warningLevel}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 580px; margin: 0 auto;" border="0" cellspacing="0" cellpadding="0">
          <!-- Logo & Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <img src="${APP_LOGO_URL}" width="48" height="48" alt="Infinity Explorers" style="border-radius: 10px; display: block; margin-bottom: 8px;" />
              <div style="font-size: 16px; font-weight: 700; color: #09090b; letter-spacing: -0.2px;">Infinity Explorers</div>
              <div style="font-size: 12px; color: #71717a; margin-top: 2px;">Governance & Disciplinary System</div>
            </td>
          </tr>

          <!-- Main Warning Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
              <!-- Alert Header Bar -->
              <div style="border-left: 4px solid ${badgeColor}; padding-left: 14px; margin-bottom: 20px;">
                <span style="display: inline-block; font-size: 11px; font-weight: 800; color: ${badgeColor}; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 3px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                  Official Notice &bull; ${warningLevel}
                </span>
                <h1 style="font-size: 21px; font-weight: 800; color: ${headerAccent}; margin: 6px 0 0 0; line-height: 1.3;">
                  Disciplinary Warning Issued
                </h1>
              </div>

              <p style="font-size: 14px; line-height: 22px; color: #3f3f46; margin: 0 0 14px 0;">
                Hello <strong>${userName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 22px; color: #3f3f46; margin: 0 0 20px 0;">
                An official regulatory warning has been issued to your profile regarding an incident recorded under the Infinity Explorers Governance Framework.
              </p>

              <!-- Warning Overview Metadata Table -->
              <table width="100%" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;" border="0" cellspacing="0" cellpadding="6">
                <tr>
                  <td width="34%" style="font-size: 13px; color: #71717a; font-weight: 500;">Warning Level:</td>
                  <td style="font-size: 13px; color: ${badgeColor}; font-weight: 700;">${warningLevel}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #71717a; font-weight: 500;">Scope / Project:</td>
                  <td style="font-size: 13px; color: #09090b; font-weight: 600;">
                    ${warningType === "Global" ? "🌐 Global (Organization-wide)" : projectName}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #71717a; font-weight: 500;">Severity & Points:</td>
                  <td style="font-size: 13px; color: #09090b;">
                    <strong>Level ${severity}</strong> (${points} point${points === 1 ? "" : "s"} deducted)
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #71717a; font-weight: 500;">Incident Date:</td>
                  <td style="font-size: 13px; color: #09090b;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #71717a; font-weight: 500;">Issued By:</td>
                  <td style="font-size: 13px; color: #3f3f46; font-weight: 600;">${issuedBy}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #71717a; font-weight: 500;">Status:</td>
                  <td>
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; color: ${statusColor}; background-color: ${statusBg}; border: 1px solid ${statusColor}30; padding: 2px 8px; border-radius: 6px;">
                      ${displayStatus}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Incident Description Box -->
              <div style="background-color: #fcfcfc; border: 1px solid #e4e4e7; border-left: 3px solid #71717a; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                  Incident Rationale & Details
                </div>
                <div style="font-size: 13px; line-height: 20px; color: #18181b; white-space: pre-wrap;">
                  ${description}
                </div>
              </div>

              <!-- Right of Appeal Notice -->
              <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 12px 16px; margin-bottom: 26px;">
                <p style="font-size: 12px; line-height: 18px; color: #475569; margin: 0;">
                  🛡️ <strong>Right of Appeal:</strong> Under the team governance regulations, you may review this record, inspect all associated evidence, or submit a formal appeal through your member dashboard.
                </p>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 24px 0 16px 0;">
                <a href="${warningUrl}" style="background-color: #09090b; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; padding: 12px 32px; display: inline-block; letter-spacing: 0.2px;">
                  View Warning Details in Dashboard &rarr;
                </a>
              </div>

              <div style="font-size: 12px; line-height: 18px; color: #a1a1aa; text-align: center; margin-top: 14px;">
                Direct Link: <a href="${warningUrl}" style="color: #2563eb; text-decoration: underline;">${warningUrl}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px; font-size: 11px; line-height: 18px; color: #a1a1aa;">
              Infinity Explorers Enterprise Governance & Warning System.<br/>
              This is an automated administrative notification. Please do not reply directly to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

