import React, { useState } from 'react';
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
  Keyboard,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { useAuth } from '../../src/context/AuthContext';
import { submitFeedback } from '../../src/services/settingsService';
import type { FeedbackType } from '../../src/types/settings';

const FEEDBACK_TYPES: FeedbackType[] = ['Report a Problem', 'Send Feedback'];

export default function HelpFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [type, setType] = useState<FeedbackType>('Report a Problem');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!user?.id) {
      setErrorMessage('You must be signed in to submit feedback.');
      return;
    }

    const clean = message.trim();
    if (clean.length < 5) {
      setErrorMessage('Please describe your issue or suggestion in at least 5 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await submitFeedback(user.id, type, clean);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage(
          type === 'Report a Problem'
            ? 'Thank you! Your issue report has been recorded.'
            : 'Thank you! Your feedback has been shared with the student development team.'
        );
        setMessage('');
      }
    } catch (err: any) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Help & Feedback',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: Colors.light.primary,
          headerTitleStyle: { fontWeight: '700', color: '#0F172A' },
          headerBackTitle: 'Settings',
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 24, 40) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.screenIntro}>
            Have an issue with the app, found a bug, or want to suggest an improvement? We would love to hear from you.
          </Text>

          {/* Type selector */}
          <View style={styles.typeSelectorRow}>
            {FEEDBACK_TYPES.map((t) => {
              const isSelected = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeButton, isSelected && styles.typeButtonSelected]}
                  onPress={() => {
                    setType(t);
                    setSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                  activeOpacity={0.7}
                  disabled={submitting}
                >
                  <Text style={[styles.typeButtonIcon]}>
                    {t === 'Report a Problem' ? '🐛' : '💡'}
                  </Text>
                  <Text
                    style={[styles.typeButtonText, isSelected && styles.typeButtonTextSelected]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Success / Error banners */}
          {successMessage ? (
            <View style={styles.successBanner}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>
              {type === 'Report a Problem' ? 'Describe the issue' : 'Your feedback or suggestion'}
            </Text>

            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={(val) => {
                setMessage(val);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              placeholder={
                type === 'Report a Problem'
                  ? 'Tell us what happened and steps to reproduce...'
                  : 'Share your ideas to improve CampusShare...'
              }
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={1000}
              editable={!submitting}
            />

            <Text style={styles.charCount}>{message.trim().length} / 1000</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Need to report a listing or user?</Text>
            <Text style={styles.noteText}>
              For urgent safety, fraud, or harassment concerns, please use the 3-dots menu on the specific item or user card to submit a Moderation Report.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  screenIntro: {
    fontSize: 14,
    color: Colors.light.textMuted,
    lineHeight: 20,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  typeButtonSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: '#EFF6FF',
  },
  typeButtonIcon: {
    fontSize: 16,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  typeButtonTextSelected: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  textInput: {
    minHeight: 120,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: Colors.light.textMuted,
    textAlign: 'right',
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  submitButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: Spacing.md,
    gap: 8,
  },
  successIcon: {
    fontSize: 16,
    color: '#047857',
    fontWeight: '800',
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: '#047857',
    fontWeight: '600',
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: Spacing.md,
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
    lineHeight: 18,
  },
  noteCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.md,
    gap: 4,
    marginTop: 4,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  noteText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    lineHeight: 17,
  },
});
