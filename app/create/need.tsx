import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { useMarketplace } from '../../src/context/MarketplaceContext';
import { RequestItem, ListingCategory } from '../../src/types/listing';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = Exclude<ListingCategory, 'All'> | null;
type Duration = 'One-time use' | 'A few days' | 'A few weeks' | 'Long term' | null;
type Hostel = 'Hostel 1' | 'Hostel 2' | 'Hostel 3' | 'Hostel 4' | 'Hostel 5' | 'Other' | null;
type Visibility = 'My Hostel' | 'Girls Hostel' | 'Boys Hostel' | 'Everyone' | null;

interface FormErrors {
  itemNeeded?: string;
  category?: string;
  description?: string;
  budget?: string;
  hostel?: string;
  visibility?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Exclude<ListingCategory, 'All'>[] = [
  'Books', 'Electronics', 'Clothing', 'Lab Equipment', 'Sports', 'Other',
] as Exclude<ListingCategory, 'All'>[];

const DURATIONS: Exclude<Duration, null>[] = [
  'One-time use', 'A few days', 'A few weeks', 'Long term',
];

const HOSTELS: Exclude<Hostel, null>[] = [
  'Hostel 1', 'Hostel 2', 'Hostel 3', 'Hostel 4', 'Hostel 5', 'Other',
];

const VISIBILITY_OPTIONS: Exclude<Visibility, null>[] = [
  'My Hostel', 'Girls Hostel', 'Boys Hostel', 'Everyone',
];

const CATEGORY_ICONS: Record<string, string> = {
  Books: '\uD83D\uDCDA',
  Electronics: '\uD83D\uDCF1',
  Clothing: '\uD83D\uDC55',
  'Lab Equipment': '\uD83E\uDD7C',
  Sports: '\u26BD',
  Other: '\uD83D\uDCE6',
};

let uidCounter = 1;
function generateId() {
  return `user_r_${Date.now()}_${uidCounter++}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateNeedScreen() {
  const router = useRouter();
  const { addRequest } = useMarketplace();

  const [itemNeeded, setItemNeeded] = useState('');
  const [category, setCategory] = useState<Category>(null);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState<Duration>(null);
  const [hostel, setHostel] = useState<Hostel>(null);
  const [visibility, setVisibility] = useState<Visibility>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!itemNeeded.trim()) newErrors.itemNeeded = 'Please describe what you need.';
    if (!category) newErrors.category = 'Please select a category.';
    if (!description.trim()) newErrors.description = 'Description is required.';
    if (budget.trim() && isNaN(Number(budget))) newErrors.budget = 'Budget must be a valid number.';
    if (!hostel) newErrors.hostel = 'Please select your hostel.';
    if (!visibility) newErrors.visibility = 'Please choose who can see this request.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!validate()) return;

    const budgetDisplay = budget.trim() ? `\u20B9${budget}` : 'Flexible';

    const newRequest: RequestItem = {
      id: generateId(),
      title: itemNeeded.trim(),
      category: category as Exclude<ListingCategory, 'All'>,
      urgency: 'Needed',
      budget: budgetDisplay,
      hostel: hostel as string,
      description: description.trim(),
      icon: CATEGORY_ICONS[category as string] ?? '\uD83D\uDCE6',
      timeAgo: 'Just now',
      requesterName: 'You',
      requesterBranch: 'NIT Kurukshetra',
    };

    addRequest(newRequest);

    Alert.alert(
      'Request Posted! \uD83D\uDD0D',
      'Your request is live on the I NEED feed.',
      [
        {
          text: 'View Feed',
          style: 'default',
          onPress: () => router.push('/(tabs)'),
        },
      ]
    );
  };

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Post a Request',
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
          {/* Banner */}
          <View style={styles.banner}>
            <Text style={styles.bannerIcon}>🔍</Text>
            <View style={styles.bannerTextGroup}>
              <Text style={styles.bannerTitle}>I NEED Something</Text>
              <Text style={styles.bannerSubtitle}>Let other students know what you're looking for.</Text>
            </View>
          </View>

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
                  <TouchableOpacity key={cat} style={[styles.chip, selected && styles.chipSelected]} onPress={() => { setCategory(cat); clearError('category'); }} activeOpacity={0.75}>
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
                  <TouchableOpacity key={d} style={[styles.chip, selected && styles.chipAmberSelected]} onPress={() => setDuration(selected ? null : d)} activeOpacity={0.75}>
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
              {HOSTELS.map((h) => {
                const selected = hostel === h;
                return (
                  <TouchableOpacity key={h} style={[styles.chip, selected && styles.chipSelected]} onPress={() => { setHostel(h); clearError('hostel'); }} activeOpacity={0.75}>
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
            <View style={styles.chipGrid}>
              {VISIBILITY_OPTIONS.map((v) => {
                const selected = visibility === v;
                return (
                  <TouchableOpacity key={v} style={[styles.chip, selected && styles.chipSelected]} onPress={() => { setVisibility(v); clearError('visibility'); }} activeOpacity={0.75}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{v}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.visibility && <ErrorText text={errors.visibility} />}
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={styles.submitButtonText}>📢  Post Request</Text>
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#FDE68A', paddingHorizontal: Spacing.md, paddingVertical: 14, gap: 12 },
  bannerIcon: { fontSize: 28 },
  bannerTextGroup: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: '#92400E', letterSpacing: 0.3 },
  bannerSubtitle: { fontSize: 12, color: '#B45309', marginTop: 2 },
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
});