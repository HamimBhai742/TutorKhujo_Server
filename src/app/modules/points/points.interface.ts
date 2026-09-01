export interface IBuyPackagePayload {
  packagePrice: number; // 99, 199, 299, 399, 499
  method: "bKash" | "Nagad" | "Card" | "Bank Transfer";
  trxId?: string;
}

export interface IUnlockTutorPayload {
  tutorId: string;
}

export interface IUnlockTuitionPayload {
  tuitionPostId: string;
}
