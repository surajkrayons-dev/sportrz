// src/types/user.ts
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified?: boolean;
  avatar?: string;
  isAdmin?: boolean;
  accountRole?: 'user' | 'super_admin' | 'subadmin' | 'affiliate';
  isAffiliate?: boolean;
  hasReceivedWelcomeNotification?: boolean;
}

export interface RecentlyPlayedGame {
  gameId: string;
  gameName: string;
  playedAt: Date;
  categories: string[];
  thumbnail?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatar: string;
  recentlyPlayed: RecentlyPlayedGame[];
  createdAt: Date;
  updatedAt: Date;
}