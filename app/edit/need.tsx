import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { ListingCategory } from '../../src/types/listing';
import { useAuth } from '../../src/context/AuthContext';
import { useMarketplace } from '../../src/context/MarketplaceContext';
import { supabase } from '../../src/lib/supabase';
import { NIT_HOSTELS, NITHostel } from '../../src/constants/campus';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = Exclude<ListingCategory, 'All'> | null;
type Duration = 'One-time use' | 'A few days' | 'A few weeks' | 'Long term' | null;
type Hostel = NITHostel | null;

interface FormErrors {
  itemNeeded?: string;
  category?: string;
  description?: string;
  budget?: string;
  hostel?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Exclude<ListingCategory, 'All'>[] = [
  'Books', 'Electronics', 'Clothing', 'Lab Equipment', 'Sports', 'Other',
] as Exclude<ListingCategory, 'All'>[];

const DURATIONS: Exclude<Duration, null>[] = [
  'One-time use', 'A few days', 'A few weeks', 'Long term',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditNeedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { refresh } = useMarketplace();

  const [isLoading, setIsLoading] = useState(true);
  const [itemNeeded, setItemNeeded] = useState('');
  const [category, setCategory] = useState<Category>(null);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState<Duration>(null);
  const [hostel, setHostel] = useState<Hostel>(null);
  const [selectedHostels, setSelectedHostels] = useState<string[]>([]); // [] = Everyone
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Fetch Request Details ──────────────────────────────────────────────────

  useEffect(() => {
    async function fetchRequest() {
      if (!id) {
        Alert.alert('Error', 'Request ID is missing.', [{ text: 'OK', onPress: () => router.back() }]);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('requests')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          Alert.alert('Error', 'Could not find the request.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }

        if (user && data.user_id !== user.id) {
          Alert.alert('Unauthorized', 'You do not have permission to edit this request.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }

        setItemNeeded(data.title || '');
        setCategory((data.category as Category) || null);
        setDescription(data.description || '');
        setBudget(data.budget != null ? String(data.budget) : '');
        setDuration((data.needed_for as Duration) || null);
        setHostel((data.hostel as Hostel) || null);
        setSelectedHostels((data.visibility_hostels as string[]) || []);
      } catch (err) {
        console.error('[EditNeed] Error loading request:', err);
        Alert.alert('Error', 'Failed to load request details.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRequest();
  }, [id, user]);

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!itemNeeded.trim()) newErrors.itemNeeded = 'Please describe what you need.';
    if (!category) newErrors.category = 'Please select a category.';
    if (!description.trim()) newErrors.description = 'Description is required.';
    if (budget.trim() && isNaN(Number(budget))) newErrors.budget = 'Budget must be a valid number.';
    if (!hostel) newErrors.hostel = 'Please select your hostel.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!user?.id) {
      Alert.alert(
        'Authentication Required',
        'You must be signed in to edit this request.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const numericBudget = budget.trim() ? Number(budget.trim()) : null;
      const neededFor = duration || 'One-time use';

      const { error } = await supabase
        .from('requests')
        .update({
          title: itemNeeded.trim(),
          category: category as string,
          description: description.trim(),
          budget: numericBudget,
          needed_for: neededFor,
          hostel: hostel as string,
          visibility: selectedHostels.length === 0 ? 'Everyone' : selectedHostels.join(', '),
          visibility_hostels: selectedHostels,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[EditNeed] Failed to update request in Supabase:', error);
        Alert.alert(
          'Update Failed',
          error.message || 'Could not update your request. Please try again.'
        );
        return;
      }

      await refresh();

      Alert.alert(
        'Request Updated! 🔍',
        'Your changes have been saved.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      console.error('[EditNeed] Unexpected error during request update:', err);
      Alert.alert(
        'Update Error',
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while updating your request.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Stack.Screen
          options={{
            title: 'Edit Request',
            headerBackTitle: 'Back',
            headerTitleStyle: { fontSize: 16, fontWeight: '700' },
          }}
        />
        <ActivityIndicator size="large" color="#D97706" />
        <Text style={styles.loadingText}>Loading request details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Edit Request',
          headerBackTitle: 'Back',
          headerTitleStyle: { fontSize: 16, fontWeight: '700' },
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader title="What do you need?" />

          {/* Item Needed */}
          <View style={styles.fieldGroup}>
            <FieldLabel text="Item Needed" required />
            <TextInput
              style={[styles.textInput, errors.itemNeeded && styles.inputError]}
              placeholder="e.g. Scientific Calculator for exams"
              placeholderTextColor="#94A3B8"
              value={itemNeeded}
              onChangeText={(t) => { setItemNeeded(t); clearError('itemNeeded'); }}
              returnKeyType="next"
              maxLength={80}
            />
            {errors.itemNeeded && <ErrorText text={errors.itemNeeded} />}
          </View>

          {/* Category */}
          <View style={styles.fieldGroup}>
            <FieldLabel text="Category" required />
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => { setCategory(cat); clearError('category'); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.category && <ErrorText text={errors.category} />}
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <FieldLabel text="Description" required />
            <TextInput
              style={[styles.textInput, styles.textArea, errors.description && styles.inputError]}
              placeholder="Describe exactly what you need, any specific requirements..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={(t) => { setDescription(t); clearError('description'); }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={400}
            />
            <Text style={styles.charCount}>{description.length}/400</Text>
            {errors.description && <ErrorText text={errors.description} />}
          </View>

          <SectionHeader title="Budget & Duration" />

          {/* Budget */}
          <View style={styles.fieldGroup}>
            <FieldLabel text="Maximum Budget (₹)" />
            <View style={[styles.priceRow, errors.budget && styles.inputError]}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Leave blank if flexible"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={budget}
                onChangeText={(t) => { setBudget(t); clearError('budget'); }}
                maxLength={6}
              />
            </View>
            {errors.budget && <ErrorText text={errors.budget} />}
            <Text style={styles.hintText}>Optional — helps others match your request</Text>
          </View>

          {/* Needed For */}
          <View style={styles.fieldGroup}>
            <FieldLabel text="Needed For" />
            <View style={styles.chipGrid}>
              {DURATIONS.map((d) => {
                const selected = duration === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, selected && styles.chipAmberSelected]}
                    onPress={() => setDuration(selected ? null : d)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <SectionHeader title="Location" />

          {/* Hostel */}
          <View style={styles.fieldGroup}>
            <FieldLabel text="Your Hostel" required />
            <View style={styles.chipGrid}>
              {NIT_HOSTELS.map((h) => {
                const selected = hostel === h;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => { setHostel(h); clearError('hostel'); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{h}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.hostel && <ErrorText text={errors.hostel} />}
          </View>

          {/* Visibility */}
          <View style={styles.fieldGroup}>
            <FieldLabel text="Visible to" required />
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
              {selectedHostels.length === 0
                ? 'Visible to everyone on campus'
                : `Restricted to ${selectedHostels.length} hostel${selectedHostels.length > 1 ? 's' : ''}`}
            </Text>
            <View style={styles.chipGrid}>
              <TouchableOpacity
                key="Everyone"
                style={[styles.chip, selectedHostels.length === 0 && styles.chipSelected]}
                onPress={() => setSelectedHostels([])}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, selectedHostels.length === 0 && styles.chipTextSelected]}>🌐 Everyone</Text>
              </TouchableOpacity>
              {NIT_HOSTELS.map((h) => {
                const isSelected = selectedHostels.includes(h);
                return (
                  <TouchableOpacity
                    key={h}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedHostels((prev) => prev.filter((item) => item !== h));
                      } else {
                        setSelectedHostels((prev) => [...prev, h]);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {isSelected ? `✓ ${h}` : h}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonText}>Saving Changes...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>💾  Save Changes</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {text}
      {required && <Text style={styles.requiredStar}> *</Text>}
    </Text>
  );
}

function ErrorText({ text }: { text: string }) {
  return <Text style={styles.errorText}>⚠ {text}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F1F5F9' },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  sectionHeader: { backgroundColor: '#F1F5F9', paddingHorizontal: Spacing.md, paddingTop: 20, paddingBottom: 8 },
  sectionHeaderText: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 1, textTransform: 'uppercase' },
  fieldGroup: { backgroundColor: '#FFFFFF', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#0F172A', marginBottom: 10 },
  requiredStar: { color: Colors.light.error },
  hintText: { fontSize: 11, color: '#94A3B8', marginTop: 6 },
  textInput: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', backgroundColor: '#FAFAFA' },
  textArea: { minHeight: 100, paddingTop: 12 },
  inputError: { borderColor: Colors.light.error, backgroundColor: '#FFF5F5' },
  charCount: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  chipSelected: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  chipAmberSelected: { backgroundColor: '#D97706', borderColor: '#D97706' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#475569' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: BorderRadius.md, backgroundColor: '#FAFAFA', paddingHorizontal: 14 },
  currencySymbol: { fontSize: 16, fontWeight: '700', color: '#475569', marginRight: 6 },
  priceInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0F172A', paddingVertical: 12 },
  errorText: { fontSize: 12, color: Colors.light.error, marginTop: 6, fontWeight: '500' },
  submitButton: { marginHorizontal: Spacing.md, marginTop: 24, backgroundColor: '#D97706', paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', shadowColor: '#D97706', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  submitButtonText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  buttonDisabled: { opacity: 0.65 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
