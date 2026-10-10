import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { Spacing, BorderRadius } from '../src/constants/layout';
import { useAuth } from '../src/context/AuthContext';
import { useProfile } from '../src/hooks/useProfile';
import { NIT_BRANCHES, NIT_HOSTELS } from '../src/constants/campus';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile, updateProfile, isLoading: isProfileLoading, error: profileError } = useProfile();

  const [selectedBranch, setSelectedBranch] = useState<string>(
    profile?.branch || ''
  );
  const [selectedHostel, setSelectedHostel] = useState<string>(
    profile?.hostel || ''
  );

  React.useEffect(() => {
    if (profile?.branch && !selectedBranch) {
      setSelectedBranch(profile.branch);
    }
    if (profile?.hostel && !selectedHostel) {
      setSelectedHostel(profile.hostel);
    }
  }, [profile?.branch, profile?.hostel]);

  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [hostelModalVisible, setHostelModalVisible] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived user details from Supabase user / profile
  const displayName =
    profile?.name ||
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    'NIT Kurukshetra Student';
  const displayEmail = profile?.email || user?.email || '';
  const avatarUrl =
    profile?.avatar_url || (user?.user_metadata?.avatar_url as string) || null;

  const handleSaveProfile = async () => {
    setErrorMessage(null);

    // Validation: ensure both branch and hostel are selected
    if (!selectedBranch) {
      setErrorMessage('Please select your academic branch.');
      return;
    }

    if (!selectedHostel) {
      setErrorMessage('Please select your hostel or residence.');
      return;
    }

    setIsSubmitting(true);

    try {
      const updateError = await updateProfile({
        branch: selectedBranch,
        hostel: selectedHostel,
      });

      if (updateError) {
        setErrorMessage(
          `Unable to save profile: ${updateError}. Please try again.`
        );
        setIsSubmitting(false);
        return;
      }

      // Successfully saved profile row -> navigate to main app home tabs
      setIsSubmitting(false);
      router.replace('/(tabs)');
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while saving your profile.'
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.warn('[Onboarding] Sign out error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand & Welcome Header ── */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>🏛️</Text>
            </View>
            <Text style={styles.heading}>Complete Your Profile</Text>
            <Text style={styles.subheading}>
              Set up your campus details to start buying, selling, and renting with
              peers at NIT Kurukshetra.
            </Text>
          </View>

          {/* ── Read-Only Google Account Info Card ── */}
          <View style={styles.accountCard}>
            <View style={styles.accountCardRow}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.accountInfoText}>
                <View style={styles.verifiedRow}>
                  <Text style={styles.accountName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓</Text>
                  </View>
                </View>
                <Text style={styles.accountEmail} numberOfLines={1}>
                  {displayEmail}
                </Text>
              </View>
            </View>

            <View style={styles.readOnlyNote}>
              <Text style={styles.readOnlyIcon}>🔒</Text>
              <Text style={styles.readOnlyText}>
                Verified via official NIT Kurukshetra Google Account
              </Text>
            </View>
          </View>

          {/* ── Form Card ── */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Campus Information</Text>
            <Text style={styles.formSubtitle}>
              Required to coordinate item handoffs and verify student community access.
            </Text>

            {/* Error Banner */}
            {(errorMessage || profileError) && (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errorMessage || profileError}</Text>
              </View>
            )}

            {/* Branch Selector Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Academic Branch <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  !selectedBranch && styles.selectButtonEmpty,
                ]}
                onPress={() => setBranchModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.selectButtonLeft}>
                  <Text style={styles.fieldIcon}>🎓</Text>
                  <Text
                    style={[
                      styles.selectButtonText,
                      !selectedBranch && styles.selectPlaceholderText,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedBranch || 'Select your branch...'}
                  </Text>
                </View>
                <Text style={styles.selectChevron}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Hostel Selector Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Hostel / Residence <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  !selectedHostel && styles.selectButtonEmpty,
                ]}
                onPress={() => setHostelModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.selectButtonLeft}>
                  <Text style={styles.fieldIcon}>🏠</Text>
                  <Text
                    style={[
                      styles.selectButtonText,
                      !selectedHostel && styles.selectPlaceholderText,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedHostel || 'Select your hostel / residence...'}
                  </Text>
                </View>
                <Text style={styles.selectChevron}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || isProfileLoading) && styles.buttonDisabled,
              ]}
              onPress={handleSaveProfile}
              disabled={isSubmitting || isProfileLoading}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.submitButtonText}>Saving Profile...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Continue to CampusShare</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Switch Account Option ── */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.signOutButton}
              activeOpacity={0.7}
            >
              <Text style={styles.signOutText}>
                Wrong account? <Text style={styles.signOutHighlight}>Sign Out</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Branch Selection Modal ── */}
      <Modal
        visible={branchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBranchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Academic Branch</Text>
                <Text style={styles.modalSubtitle}>NIT Kurukshetra Departments</Text>
              </View>
              <TouchableOpacity
                onPress={() => setBranchModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={NIT_BRANCHES}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedBranch === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedBranch(item);
                      setBranchModalVisible(false);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.modalOptionTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Hostel Selection Modal ── */}
      <Modal
        visible={hostelModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHostelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Hostel / Residence</Text>
                <Text style={styles.modalSubtitle}>NIT Kurukshetra Campus</Text>
              </View>
              <TouchableOpacity
                onPress={() => setHostelModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={NIT_HOSTELS}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedHostel === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedHostel(item);
                      setHostelModalVisible(false);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.modalOptionTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    marginBottom: Spacing.sm,
  },
  logoIcon: {
    fontSize: 28,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.sm,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  accountCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accountInfoText: {
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginRight: 6,
  },
  verifiedBadge: {
    backgroundColor: '#10B981',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  accountEmail: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  readOnlyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  readOnlyIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  readOnlyText: {
    fontSize: 11,
    color: Colors.light.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: Spacing.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: Spacing.md,
  },
  errorIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 16,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: Colors.light.error,
    fontWeight: '700',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectButtonEmpty: {
    borderColor: '#E2E8F0',
  },
  selectButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  fieldIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  selectButtonText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '600',
    flex: 1,
  },
  selectPlaceholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  selectChevron: {
    fontSize: 11,
    color: '#94A3B8',
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    height: 50,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  signOutHighlight: {
    color: Colors.light.error,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '75%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: Colors.light.textMuted,
    fontWeight: '700',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 4,
  },
  modalOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  modalOptionText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
    flex: 1,
  },
  modalOptionTextSelected: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
