import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { submitReport } from '../services/safetyService';
import { ReportReason, ReportTargetType } from '../types/safety';
import { Colors } from '../constants/colors';
import { BorderRadius, Spacing } from '../constants/layout';

interface ReportModalProps {
  visible: boolean;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
  onClose: () => void;
}

const USER_REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: '😡 Harassment' },
  { value: 'scam_fraud', label: '💸 Scam / Fraud' },
  { value: 'spam', label: '🚫 Spam' },
  { value: 'inappropriate_behaviour', label: '⚠️ Inappropriate Behaviour' },
  { value: 'impersonation', label: '🎭 Impersonation' },
  { value: 'other', label: '📝 Other' },
];

const CONTENT_REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'scam_fraud', label: '💸 Scam / Fraud' },
  { value: 'misleading_information', label: '⚠️ Misleading Information' },
  { value: 'prohibited_item', label: '🚫 Prohibited Item' },
  { value: 'suspicious_listing', label: '🕵️ Suspicious Activity' },
  { value: 'inappropriate_content', label: '🔞 Inappropriate Content' },
  { value: 'spam_duplicate', label: '🔁 Spam / Duplicate' },
  { value: 'other', label: '📝 Other' },
];

export default function ReportModal({
  visible,
  targetType,
  targetId,
  targetLabel,
  onClose,
}: ReportModalProps) {
  const activeReasons =
    targetType === 'user' ? USER_REPORT_REASONS : CONTENT_REPORT_REASONS;
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Mirror the rock-solid keyboard pattern from the chat screen
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select a reason', 'Please select a reason before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await submitReport({
        targetType,
        targetId,
        reason: selectedReason,
        description: description.trim() || undefined,
      });
      Alert.alert('Report submitted', 'Thank you. Our team will review your report.');
      handleClose();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Report {targetLabel ?? targetType}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            {"Why are you reporting this? We'll keep your report confidential."}
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              Platform.OS === 'android' && keyboardHeight > 0 && { paddingBottom: keyboardHeight },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {activeReasons.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.reasonRow,
                  selectedReason === r.value && styles.reasonRowSelected,
                ]}
                onPress={() => setSelectedReason(r.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.reasonLabel}>{r.label}</Text>
                {selectedReason === r.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <TextInput
              style={styles.descriptionInput}
              placeholder="Additional details (optional)"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
              maxLength={500}
            />
          </ScrollView>

          <View
            style={[
              styles.buttonContainer,
              Platform.OS === 'android' && keyboardHeight > 0 && { marginBottom: keyboardHeight },
            ]}
          >
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    padding: 6,
  },
  closeIcon: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  reasonRowSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: '#EEF2FF',
  },
  reasonLabel: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '700',
  },
  descriptionInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
  },
  buttonContainer: {
    gap: 10,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
});
