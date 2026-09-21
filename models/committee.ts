import mongoose, { Schema, Document, Model } from "mongoose";

export const COMMITTEE_RESOURCE_TYPES = [
  "Warning",
  "Appeal",
  "Removal",
  "Suspension",
  "ImprovementPlan",
] as const;
export type CommitteeResourceType = (typeof COMMITTEE_RESOURCE_TYPES)[number];

export const COMMITTEE_STATUSES = [
  "ACTIVE",
  "TIED",
  "DECIDED",
  "DISBANDED",
] as const;
export type CommitteeStatus = (typeof COMMITTEE_STATUSES)[number];

export const COMMITTEE_DECISION_OUTCOMES = [
  "APPROVED",
  "REJECTED",
  "NO_DECISION",
] as const;
export type CommitteeDecisionOutcome = (typeof COMMITTEE_DECISION_OUTCOMES)[number];

export interface ICommitteeVote {
  memberId: mongoose.Types.ObjectId;
  role: string;
  vote: "Approve" | "Reject";
  reason: string;
  votedAt: Date;
}

export interface ICommitteeMemberRef {
  memberId: mongoose.Types.ObjectId;
  roleAtFormation: string;
  joinedAt: Date;
}

export interface ICommittee extends Document {
  caseNumber: string;
  resourceType: CommitteeResourceType;
  resourceId: mongoose.Types.ObjectId;
  members: ICommitteeMemberRef[];
  votes: ICommitteeVote[];
  status: CommitteeStatus;
  decisionOutcome?: CommitteeDecisionOutcome | null;
  decisionSummary?: string;
  decidedAt?: Date | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommitteeVoteSchema = new Schema<ICommitteeVote>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    vote: {
      type: String,
      enum: ["Approve", "Reject"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      minlength: 5,
    },
    votedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const CommitteeMemberRefSchema = new Schema<ICommitteeMemberRef>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    roleAtFormation: {
      type: String,
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const CommitteeSchema = new Schema<ICommittee>(
  {
    caseNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: COMMITTEE_RESOURCE_TYPES,
      required: true,
      index: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    members: {
      type: [CommitteeMemberRefSchema],
      required: true,
      validate: [
        (val: ICommitteeMemberRef[]) => val.length >= 3,
        "Committee must have a minimum of 3 eligible members.",
      ],
    },
    votes: {
      type: [CommitteeVoteSchema],
      default: [],
    },
    status: {
      type: String,
      enum: COMMITTEE_STATUSES,
      default: "ACTIVE",
      index: true,
    },
    decisionOutcome: {
      type: String,
      enum: [...COMMITTEE_DECISION_OUTCOMES, null],
      default: null,
    },
    decisionSummary: {
      type: String,
      default: "",
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Committee: Model<ICommittee> =
  mongoose.models.Committee || mongoose.model<ICommittee>("Committee", CommitteeSchema);

export default Committee;
