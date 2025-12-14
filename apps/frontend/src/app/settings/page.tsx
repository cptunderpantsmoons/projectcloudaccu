"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/store/auth-store";
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Save,
  Eye,
  EyeOff,
  Key,
  Mail,
  Phone,
  MapPin,
  Camera,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'team';
    activityStatus: boolean;
  };
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      inApp: true,
      marketing: false,
    },
    privacy: {
      profileVisibility: 'team',
      activityStatus: true,
    },
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: '',
      location: '',
      bio: '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: '',
        location: '',
        bio: '',
      });
    }
  }, [user, profileForm]);

  const handleProfileUpdate = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.patch('/users/me', data);
      
      if (response.success && response.data) {
        updateUser(response.data);
        alert('Profile updated successfully!');
      } else {
        throw new Error(response.error?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (data: PasswordFormData) => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      
      if (response.success) {
        passwordForm.reset();
        alert('Password changed successfully!');
      } else {
        throw new Error(response.error?.message || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Failed to change password:', error);
      if (error.response?.status === 400) {
        alert('Current password is incorrect.');
      } else {
        alert('Failed to change password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceUpdate = async (key: string, value: any) => {
    try {
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);
      
      // Save to backend
      await apiClient.patch('/users/me/preferences', newPreferences);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      alert('Failed to update preferences. Please try again.');
    }
  };

  const handleNotificationUpdate = (key: string, value: boolean) => {
    const newNotifications = { ...preferences.notifications, [key]: value };
    handlePreferenceUpdate('notifications', newNotifications);
  };

  const handlePrivacyUpdate = (key: string, value: any) => {
    const newPrivacy = { ...preferences.privacy, [key]: value };
    handlePreferenceUpdate('privacy', newPrivacy);
  };

  const exportUserData = async () => {
    try {
      const response = await apiClient.get('/users/me/export', {
        responseType: 'blob',
      });
      
      if (response.success) {
        const blob = new Blob([response.data as any], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `accu-platform-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export user data:', error);
      alert('Failed to export user data. Please try again.');
    }
  };

  const deleteAccount = async () => {
    const confirmation = prompt(
      'Type "DELETE" to confirm account deletion. This action cannot be undone.'
    );
    
    if (confirmation === 'DELETE') {
      try {
        await apiClient.delete('/users/me');
        // Redirect to login or home page
        window.location.href = '/login';
      } catch (error) {
        console.error('Failed to delete account:', error);
        alert('Failed to delete account. Please try again.');
      }
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'data', label: 'Data & Export', icon: Download },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="mr-3 h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and profile details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-6">
                    {/* Profile Picture */}
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-2xl font-medium text-primary">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="absolute -bottom-2 -right-2 rounded-full p-1"
                        >
                          <Camera className="h-3 w-3" />
                        </Button>
                      </div>
                      <div>
                        <Button type="button" variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Change Photo
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">
                          JPG, PNG or GIF. Max size 2MB.
                        </p>
                      </div>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First name</Label>
                        <Input
                          id="firstName"
                          {...profileForm.register('firstName')}
                          className={profileForm.formState.errors.firstName ? 'border-red-500' : ''}
                        />
                        {profileForm.formState.errors.firstName && (
                          <p className="text-sm text-red-600">{profileForm.formState.errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last name</Label>
                        <Input
                          id="lastName"
                          {...profileForm.register('lastName')}
                          className={profileForm.formState.errors.lastName ? 'border-red-500' : ''}
                        />
                        {profileForm.formState.errors.lastName && (
                          <p className="text-sm text-red-600">{profileForm.formState.errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        {...profileForm.register('email')}
                        className={profileForm.formState.errors.email ? 'border-red-500' : ''}
                      />
                      {profileForm.formState.errors.email && (
                        <p className="text-sm text-red-600">{profileForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          {...profileForm.register('phone')}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="location"
                          placeholder="City, Country"
                          {...profileForm.register('location')}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <textarea
                        id="bio"
                        rows={4}
                        placeholder="Tell us about yourself..."
                        {...profileForm.register('bio')}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>

                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your password and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Change Password</h4>
                      
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            {...passwordForm.register('currentPassword')}
                            className={passwordForm.formState.errors.currentPassword ? 'border-red-500 pr-10' : 'pr-10'}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        {passwordForm.formState.errors.currentPassword && (
                          <p className="text-sm text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            {...passwordForm.register('newPassword')}
                            className={passwordForm.formState.errors.newPassword ? 'border-red-500 pr-10' : 'pr-10'}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        {passwordForm.formState.errors.newPassword && (
                          <p className="text-sm text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm new password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            {...passwordForm.register('confirmPassword')}
                            className={passwordForm.formState.errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        {passwordForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
                        )}
                      </div>
                    </div>

                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Two-Factor Authentication */}
                  <div className="mt-8 pt-8 border-t">
                    <h4 className="text-sm font-medium mb-4">Two-Factor Authentication</h4>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Shield className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">2FA is enabled</p>
                          <p className="text-xs text-gray-500">Your account is protected with two-factor authentication</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how you want to be notified
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Notification Channels</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">Email notifications</p>
                            <p className="text-xs text-gray-500">Receive notifications via email</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.notifications.email}
                          onChange={(e) => handleNotificationUpdate('email', e.target.checked)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Bell className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">Push notifications</p>
                            <p className="text-xs text-gray-500">Receive push notifications in your browser</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.notifications.push}
                          onChange={(e) => handleNotificationUpdate('push', e.target.checked)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">In-app notifications</p>
                            <p className="text-xs text-gray-500">Show notifications within the application</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.notifications.inApp}
                          onChange={(e) => handleNotificationUpdate('inApp', e.target.checked)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Email Types</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Marketing emails</p>
                          <p className="text-xs text-gray-500">Product updates and promotional content</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.notifications.marketing}
                          onChange={(e) => handleNotificationUpdate('marketing', e.target.checked)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize how ACCU Platform looks and feels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Theme</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'system', label: 'System' },
                      ].map((theme) => (
                        <button
                          key={theme.value}
                          onClick={() => handlePreferenceUpdate('theme', theme.value)}
                          className={`p-3 text-left border rounded-lg transition-colors ${
                            preferences.theme === theme.value
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-sm font-medium capitalize">{theme.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Language & Region</h4>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <select
                        id="language"
                        value={preferences.language}
                        onChange={(e) => handlePreferenceUpdate('language', e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <select
                        id="timezone"
                        value={preferences.timezone}
                        onChange={(e) => handlePreferenceUpdate('timezone', e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy Settings */}
            {activeTab === 'privacy' && (
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Control your privacy and data sharing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Profile Visibility</h4>
                    <div className="space-y-3">
                      {[
                        { value: 'public', label: 'Public', description: 'Anyone can view your profile' },
                        { value: 'team', label: 'Team only', description: 'Only team members can view your profile' },
                        { value: 'private', label: 'Private', description: 'Only you can view your profile' },
                      ].map((visibility) => (
                        <label key={visibility.value} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="profileVisibility"
                            value={visibility.value}
                            checked={preferences.privacy.profileVisibility === visibility.value}
                            onChange={(e) => handlePrivacyUpdate('profileVisibility', e.target.value)}
                            className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300"
                          />
                          <div>
                            <p className="text-sm font-medium">{visibility.label}</p>
                            <p className="text-xs text-gray-500">{visibility.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Activity Status</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Show when you're active</p>
                        <p className="text-xs text-gray-500">Let others see when you're active in the platform</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.privacy.activityStatus}
                        onChange={(e) => handlePrivacyUpdate('activityStatus', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data & Export */}
            {activeTab === 'data' && (
              <Card>
                <CardHeader>
                  <CardTitle>Data & Export</CardTitle>
                  <CardDescription>
                    Manage your data and export options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Export Your Data</h4>
                    <p className="text-sm text-gray-600">
                      Download a copy of your personal data and account information.
                    </p>
                    <Button onClick={exportUserData} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export My Data
                    </Button>
                  </div>

                  <div className="pt-6 border-t">
                    <h4 className="text-sm font-medium text-red-600 mb-4">Danger Zone</h4>
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-red-900">Delete Account</h5>
                          <p className="text-sm text-red-700 mt-1">
                            Permanently delete your account and all associated data. This action cannot be undone.
                          </p>
                          <Button 
                            onClick={deleteAccount}
                            variant="outline"
                            size="sm"
                            className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}