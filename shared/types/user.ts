export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  emailNotificationsEnabled: boolean;
  phone: string | null;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
