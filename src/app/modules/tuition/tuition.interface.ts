export type TTuitionMode = "Home" | "Online" | "Both";
export type TPostStatus = "Active" | "Paused" | "Closed";

export interface ICreateTuitionPost {
  title?: string;
  classLevel: string;
  subjects: string[];
  budget: number;
  mode?: TTuitionMode;
  frequency?: string;
  location: string;
  genderPreference?: string;
  extraNotes?: string;
}

export interface IUpdateTuitionPost {
  title?: string;
  classLevel?: string;
  subjects?: string[];
  budget?: number;
  mode?: TTuitionMode;
  frequency?: string;
  location?: string;
  status?: TPostStatus;
  genderPreference?: string;
  extraNotes?: string;
}

export interface ITuitionQueryFilters {
  searchTerm?: string;
  classLevel?: string;
  subject?: string;
  mode?: string;
  location?: string;
  status?: string;
  minBudget?: number;
  maxBudget?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
