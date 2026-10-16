import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  Keyboard,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { useAuth } from '../../src/context/AuthContext';
import { useProfile } from '../../src/hooks/useProfile';
import { useMarketplace } from '../../src/context/MarketplaceContext';
import { NIT_BRANCHES, NIT_HOSTELS } from '../../src/constants/campus';
import type { ProfileUpdate } from '../../src/types/profile';

type PickerField = 'branch' | 'hostel';

function validate(name: string, branch: string, hostel: string): string | null {
  if (!name.trim()) return 'Display name cannot be empty.';
  if (name.trim().length < 2) return 'Display name must be at least 2 characters.';
  if (name.trim().length > 60) return 'Display name must be 60 characters or fewer.';
  if (!branch) return 'Please select your academic branch.';
  if (!hostel) return 'Please select your hostel or residence.';
  return null;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile } = useProfile();
  const { refresh: refreshMarketplace } = useMarketplace();

  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [hostel, setHostel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<PickerField>('branch');

  useEffect(() => {
    if (profile) {
      setName(
        profile.name ||
          (user?.user_metadata?.full_name as string | undefined) ||
          (user?.user_metadata?.name as string | undefined) ||
          ''
      );
      setBranch(profile.branch || '');
      setHostel(profile.hostel || '');
    }
  }, [profile?.name, profile?.branch, profile?.hostel]);

  const openPicker = useCallback((field: PickerField) => {
    Keyboard.dismiss();
    setPickerField(field);
    setPickerVisible(true);
  }, []);

  const handlePickerSelect = useCallback(
    (value: string) => {
      if (pickerField === 'branch') setBranch(value);
      else setHostel(value);
      setPickerVisible(false);
      setErrorMsg(null);
    },
    [pickerField]
  );

  const handleSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    Keyboard.dismiss();
    const validationError = validate(name, branch, hostel);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }
    setIsSaving(true);
    try {
      const updates: ProfileUpdate = { name: name.trim(), branch, hostel };
      const err = await updateProfile(updates);
      if (err) {
        setErrorMsg(err);
      } else {
        setSuccessMsg('Profile updated successfully!');
        try {
          await refreshMarketplace();
        } catch (e) {
          console.warn('[EditProfile] Error refreshing marketplace feed:', e);
        }
        setTimeout(() => {
          router.back();
        }, 600);
      }
    } catch (e: any) {
      setErrorMsg(e instanceof Error ? e.message : 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const pickerOptions = pickerField === 'branch' ? NIT_BRANCHES : NIT_HOSTELS;
  const pickerTitle = pickerField === 'branch' ? 'Select Branch' : 'Select Hostel';
  const avatarInitial = (name || 'U').charAt(0).toUpperCase();
  const displayEmail = profile?.email || user?.email || '';

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Profile',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: Colors.light.primary,
          headerTitleStyle: { fontWeight: '700', color: '#0F172A' },
          headerBackTitle: 'Profile',
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              {profileLoading
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={styles.avatarText}>{avatarInitial}</Text>
              }
            </View>
            {profile?.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedCheck}>✓</Text>
                <Text style={styles.verifiedText}>Verified Student</Text>
              </View>
            )}
          </View>

          {successMsg ? (
            <View style={styles.successBanner}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Form card */}
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Display Name</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={(v) => { setName(v); setErrorMsg(null); setSuccessMsg(null); }}
                placeholder="Your full name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={60}
                returnKeyType="done"
                editable={!isSaving}
              />
              <Text style={styles.charCount}>{name.length}/60</Text>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Academic Branch</Text>
              <TouchableOpacity
                style={[styles.pickerButton, !branch && styles.pickerButtonEmpty]}
                onPress={() => openPicker('branch')}
                activeOpacity={0.7}
                disabled={isSaving}
              >
                <Text style={[styles.pickerButtonText, !branch && styles.pickerButtonTextEmpty]} numberOfLines={1}>
                  {branch || 'Select your branch'}
                </Text>
                <Text style={styles.pickerChevron}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hostel / Residence</Text>
              <TouchableOpacity
                style={[styles.pickerButton, !hostel && styles.pickerButtonEmpty]}
                onPress={() => openPicker('hostel')}
                activeOpacity={0.7}
                disabled={isSaving}
              >
                <Text style={[styles.pickerButtonText, !hostel && styles.pickerButtonTextEmpty]} numberOfLines={1}>
                  {hostel || 'Select your hostel'}
                </Text>
                <Text style={styles.pickerChevron}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Read-only identity card */}
          <View style={styles.card}>
            <Text style={styles.readOnlyHeader}>Account Identity</Text>
            <Text style={styles.readOnlyHint}>
              These fields are managed by Supabase Auth and cannot be changed here.
            </Text>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>📧 Email</Text>
              <Text style={styles.readOnlyValue} numberOfLines={1}>{displayEmail}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving || profileLoading}
            activeOpacity={0.85}
          >
            {isSaving
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={styles.saveButtonText}>Save Changes</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPickerVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerOptions as unknown as string[]}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = pickerField === 'branch' ? item === branch : item === hostel;
                return (
                  <TouchableOpacity
                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                    onPress={() => handlePickerSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>{item}</Text>
                    {isSelected && <Text style={styles.pickerCheckmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.background },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, gap: Spacing.md },
  avatarSection: { alignItems: 'center', marginBottom: Spacing.sm },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.light.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#DBEAFE', marginBottom: Spacing.sm,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#A7F3D0',
  },
  verifiedCheck: { fontSize: 11, color: '#047857', fontWeight: '800', marginRight: 4 },
  verifiedText: { fontSize: 12, fontWeight: '700', color: '#047857' },
  successBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: '#A7F3D0',
    paddingHorizontal: Spacing.md, paddingVertical: 12, gap: 8,
  },
  successIcon: { fontSize: 16, color: '#047857', fontWeight: '800' },
  successText: { flex: 1, fontSize: 14, color: '#047857', fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF2F2', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: '#FECACA',
    paddingHorizontal: Spacing.md, paddingVertical: 12, gap: 8,
  },
  errorIcon: { fontSize: 16 },
  errorText: { flex: 1, fontSize: 14, color: '#DC2626', fontWeight: '500' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.light.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  fieldGroup: { paddingVertical: 4 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.light.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  fieldDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  textInput: {
    height: 46, backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.light.border,
    paddingHorizontal: 14, fontSize: 15, color: Colors.light.text,
  },
  charCount: { fontSize: 11, color: Colors.light.textMuted, textAlign: 'right', marginTop: 4 },
  pickerButton: {
    height: 46, backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.light.border,
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerButtonEmpty: { borderColor: '#E2E8F0' },
  pickerButtonText: { flex: 1, fontSize: 15, color: Colors.light.text, fontWeight: '500' },
  pickerButtonTextEmpty: { color: '#94A3B8', fontWeight: '400' },
  pickerChevron: { fontSize: 20, color: '#94A3B8', fontWeight: '300', marginLeft: 4 },
  readOnlyHeader: { fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 4 },
  readOnlyHint: { fontSize: 12, color: Colors.light.textMuted, lineHeight: 17, marginBottom: Spacing.sm },
  readOnlyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: BorderRadius.md,
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
  },
  readOnlyLabel: { fontSize: 13, color: Colors.light.textMuted, fontWeight: '600', minWidth: 70 },
  readOnlyValue: { flex: 1, fontSize: 13, color: Colors.light.text, fontWeight: '500' },
  saveButton: {
    backgroundColor: Colors.light.primary, paddingVertical: 15,
    borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  saveButtonDisabled: { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  cancelButton: {
    backgroundColor: '#F1F5F9', paddingVertical: 14,
    borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center',
  },
  cancelButtonText: { color: Colors.light.textMuted, fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.md, paddingTop: 16, paddingBottom: 36, maxHeight: '70%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  modalCloseButton: { padding: 6 },
  modalCloseIcon: { fontSize: 16, color: '#64748B', fontWeight: '600' },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: '#E2E8F0',
    marginBottom: 8, backgroundColor: '#F8FAFC',
  },
  pickerOptionSelected: { borderColor: Colors.light.primary, backgroundColor: '#EEF2FF' },
  pickerOptionText: { fontSize: 14, color: '#1E293B', fontWeight: '500', flex: 1 },
  pickerOptionTextSelected: { color: Colors.light.primary, fontWeight: '700' },
  pickerCheckmark: { fontSize: 16, color: Colors.light.primary, fontWeight: '700', marginLeft: 8 },
});
