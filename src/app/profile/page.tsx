// src/app/profile/page.tsx
'use client';
import RecentlyPlayedGames from '@/components/RecentlyPlayedGames';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { User, Edit2, Save, X, Camera } from 'lucide-react';
import SubscriptionStatus from '@/components/SubscriptionStatus';


const AVATAR_OPTIONS = [
  { id: 'avatar1', emoji: '🎮', name: 'Gamer' },
  { id: 'avatar2', emoji: '🚀', name: 'Rocket' },
  { id: 'avatar3', emoji: '⚡', name: 'Lightning' },
  { id: 'avatar4', emoji: '🎯', name: 'Target' },
  { id: 'avatar5', emoji: '🌟', name: 'Star' },
];

export default function ProfilePage() {
  const { currentUser, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  
  // Profile data
  const [profileData, setProfileData] = useState({
    displayName: '',
    email: '',
    avatar: 'avatar1', // default avatar
  });

  // Form data for editing
  const [formData, setFormData] = useState({
    displayName: '',
    avatar: 'avatar1',
  });

  // Load user profile data from MySQL
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentUser) return;
      
      setIsLoadingProfile(true);
      try {
        const response = await fetch('/api/profile', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load profile.');
        const serverProfile = result.profile;
        const userData = {
          displayName: serverProfile.displayName || currentUser.displayName || '',
          email: serverProfile.email || currentUser.email || '',
          avatar: serverProfile.avatar || 'avatar1',
        };

        setProfileData(userData);
        setFormData({
          displayName: userData.displayName,
          avatar: userData.avatar,
        });
      } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Failed to load profile data. Please try again.', 'error');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, [currentUser, showToast]);

  const handleEdit = () => {
    setIsEditing(true);
    setFormData({
      displayName: profileData.displayName,
      avatar: profileData.avatar,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowAvatarSelector(false);
    setFormData({
      displayName: profileData.displayName,
      avatar: profileData.avatar,
    });
  };

  const handleSave = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save your profile.');
      await refreshUser();

      // Update local state
      setProfileData({
        ...profileData,
        displayName: formData.displayName,
        avatar: formData.avatar,
      });

      setIsEditing(false);
      setShowAvatarSelector(false);
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Profile update failed:', error);
      showToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarEmoji = (avatarId: string) => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
    return avatar ? avatar.emoji : '🎮';
  };

  const getAvatarName = (avatarId: string) => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
    return avatar ? avatar.name : 'Gamer';
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8">
            <div className="animate-pulse">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-20 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
                <div className="h-20 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl backdrop-blur-sm">
                  {getAvatarEmoji(profileData.avatar)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {profileData.displayName || 'User Profile'}
                  </h1>
                  <p className="text-indigo-100">
                    {getAvatarName(profileData.avatar)} Avatar
                  </p>
                </div>
              </div>
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 backdrop-blur-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-8">
            {!isEditing ? (
              // View Mode
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Display Name
                    </label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {profileData.displayName || 'Not set'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {profileData.email}
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Current Avatar
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center text-2xl">
                      {getAvatarEmoji(profileData.avatar)}
                    </div>
                    <span className="text-lg font-medium text-gray-900 dark:text-white">
                      {getAvatarName(profileData.avatar)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Edit Mode
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter your display name"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Choose Avatar
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {AVATAR_OPTIONS.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => setFormData({ ...formData, avatar: avatar.id })}
                        className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-200 ${
                          formData.avatar === avatar.id
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white scale-110 shadow-lg'
                            : 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 hover:scale-105'
                        }`}
                      >
                        {avatar.emoji}
                        {formData.avatar === avatar.id && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Selected: {getAvatarName(formData.avatar)}
                  </p>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Add this after the existing profile content, before the closing </div> */}
<div className="mt-8">
  <RecentlyPlayedGames />
</div>
<div className="mt-8">
  <SubscriptionStatus />
</div>
        </div>
      </div>
    </div>
  );
}