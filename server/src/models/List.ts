import { Schema, Types, model } from 'mongoose';

export interface IList {
  project: Types.ObjectId;
  title: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const listSchema = new Schema<IList>(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    // Sparse float ordering - see utils/position.ts.
    position: { type: Number, required: true },
  },
  { timestamps: true },
);

listSchema.index({ project: 1, position: 1 });

export const List = model<IList>('List', listSchema);
