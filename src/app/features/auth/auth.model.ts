export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  data?: {
    token?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
  } | null;
}

export type RegisterResponse = AuthResponse;

export interface AuthSession {
  accessToken: string;
  refreshToken: string | null;
}

export interface VerificationRequest {
  email: string;
  code: string;
}

export interface UserProfileDetails {
  phoneNumber?: string | null;
  address?: string | null;
  pictureUrl?: string | null;
  dob?: string | null;
  dateOfBirth?: string | null;
}

export interface UserProfile {
  id?: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  pictureUrl?: string | null;
  dateOfBirth?: string | null;
  details?: UserProfileDetails | null;
}

export interface ProfileUpdateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  pictureUrl: string | null;
  dateOfBirth: string | null;
}

export type UserProfileResponse = UserProfile | { data: UserProfile | null };

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}
