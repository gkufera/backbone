export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  emailNotificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
