import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Warning from "@/models/warning";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import {
  validateImprovementPlanInput,
  initiateImprovementPlan,
} from "@/lib/warning-rules";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid warning id" },
        { status: 400 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const overrideReason = typeof body.overrideReason === "string" ? body.overrideReason.trim() : null;
    const problemSummary = typeof body.problemSummary === "string" ? body.problemSummary.trim() : "";
    const desiredBehavior = typeof body.desiredBehavior === "string" ? body.desiredBehavior.trim() : "";
    const actionSteps = Array.isArray(body.actionSteps) ? (body.actionSteps as string[]) : [];
    const durationDays = body.durationDays !== undefined ? Number(body.durationDays) : 30;
    const measurableSuccessCriteria =
      typeof body.measurableSuccessCriteria === "string" ? body.measurableSuccessCriteria.trim() : "";
    const supervisorId =
      body.supervisorId && mongoose.isValidObjectId(body.supervisorId as string)
        ? (body.supervisorId as string)
        : currentMember._id;

    await connectToDatabase();
    const requestId = getOrCreateRequestId(req);

    const warning = await Warning.findById(id);
    if (!warning) {
      return NextResponse.json(
        { success: false, message: "Warning not found" },
        { status: 404 },
      );
    }

    // Contextual Authorization via can()
    const authCheck = can(currentMember, "improvement_plans.manage", warning, { overrideReason });
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    // Conflict of interest: member cannot create improvement plan for themselves
    const memberIdStr = (
      warning.member && typeof warning.member === "object" && "_id" in warning.member
        ? (warning.member as { _id: unknown })._id
        : warning.member
    )?.toString();

    if (memberIdStr === currentMember._id.toString() && !authCheck.isOverride) {
      return NextResponse.json(
        { success: false, message: "Conflict of interest: Cannot establish an improvement plan for yourself." },
        { status: 403 },
      );
    }

    const validation = validateImprovementPlanInput({
      problemSummary,
      desiredBehavior,
      actionSteps,
      durationDays,
      measurableSuccessCriteria,
      supervisor: supervisorId,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: validation.status || 400 },
      );
    }

    const previousState = warning.toObject();

    initiateImprovementPlan(
      warning,
      {
        problemSummary,
        desiredBehavior,
        actionSteps,
        durationDays,
        measurableSuccessCriteria,
        supervisor: supervisorId,
      },
      new Date(),
    );

    await warning.save();

    const newState = warning.toObject();

    // Record immutable audit log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "improvement_plans.initiate",
      resource: {
        type: "Warning",
        id: warning._id,
        identifier: `${warning.type} - ${warning.level}`,
      },
      previousState,
      newState,
      decisionReason: problemSummary || "Initiated improvement plan",
      authorizationResult: authCheck.authorizationResult,
      overrideReason: authCheck.isOverride ? overrideReason : null,
    });

    await warning.populate([
      { path: "member", select: "name email role avatar" },
      { path: "improvementPlan.supervisor", select: "name email role" },
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Improvement plan initiated successfully",
        data: warning,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/warnings/[id]/improvement-plan error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to initiate improvement plan" },
      { status: 500 },
    );
  }
}
