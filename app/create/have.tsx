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
import { Listing, ListingCategory, ItemMode } from '../../src/types/listing';

// ─── Types ───────────────────────────────────────────────────────────────────

type Mode = 'RENT' | 'SELL' | 'FREE' | null;
type Category = Exclude<ListingCategory, 'All'> | null;
type Hostel = 'Hostel 1' | 'Hostel 2' | 'Hostel 3' | 'Hostel 4' | 'Hostel 5' | 'Other' | null;
type Visibility = 'My Hostel' | 'Girls Hostel' | 'Boys Hostel' | 'Everyone' | null;

interface FormErrors {
  itemName?: string;
  category?: string;
  mode?: string;
  price?: string;
  description?: string;
  hostel?: string;
  visibility?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: Exclude<ListingCategory, 'All'>[] = [
  'Books', 'Electronics', 'Clothing', 'Lab Equipment', 'Sports', 'Other',
] as Exclude<ListingCategory, 'All'>[];

const HOSTELS: Exclude<Hostel, null>[] = [
  'Hostel 1', 'Hostel 2', 'Hostel 3', 'Hostel 4', 'Hostel 5', 'Other',
];

const VISIBILITY_OPTIONS: Exclude<Visibility, null>[] = [
  'My Hostel', 'Girls Hostel', 'Boys Hostel', 'Everyone',
];

const CATEGORY_ICONS: Record<string, string> = {
  Books: '📚',
  Electronics: '📱',
  Clothing: '👕',
  'Lab Equipment': '🥼',
  Sports: '⚽',
  Other: '📦',
};

let uidCounter = 1;
function generateId() { return `user_l_${Date.now()}_${uidCounter++}`; }

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateHaveScreen() {
  const router = useRouter();
  const { addListing } = useMarketplace();

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<Category>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [hostel, setHostel] = useState<Hostel>(null);
  const [visibility, setVisibility] = useState<Visibility>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!itemName.trim()) newErrors.itemName = 'Item name is required.';
    if (!category) newErrors.category = 'Please select a category.';
    if (!mode) newErrors.mode = 'Please choose what you want to do with this item.';
    if ((mode === 'RENT' || mode === 'SELL') && !price.trim()) {
      newErrors.price = mode === 'RENT' ? 'Price per day is required for rental items.' : 'Selling price is required.';
    }
    if (price.trim() && isNaN(Number(price))) newErrors.price = 'Price must be a valid number.';
    if (!description.trim()) newErrors.description = 'Description is required.';
    if (!hostel) newErrors.hostel = 'Please select your hostel.';
    if (!visibility) newErrors.visibility = 'Please choose who can see this post.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const priceDisplay = mode === 'FREE' ? 'Free' : mode === 'RENT' ? `₹${price} / day` : `₹${price}`;
    const newListing: Listing = {
      id: generateId(),
      title: itemName.trim(),
      category: category as Exclude<ListingCategory, 'All'>,
      mode: mode as ItemMode,
      price: priceDisplay,
      hostel: hostel as string,
      description: description.trim(),
      icon: CATEGORY_ICONS[category as string] ?? '📦',
      timeAgo: 'Just now',
      ownerName: 'You',
      ownerBranch: 'NIT Kurukshetra',
    };
    addListing(newListing);
    Alert.alert('Item Posted! 🎉', 'Your item is live on the I HAVE feed.', [{ text: 'View Feed', onPress: () => router.push('/(tabs)') }]);
  };

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ title: 'Post an Item', headerBackTitle: 'Back', headerTitleStyle: { fontSize: 16, fontWeight: '700' } }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <SectionHeader title="Item Details" />
          <View style={styles.fieldGroup}>
            <FieldLabel text="Item Name" required />
            <TextInput style={[styles.textInput, errors.itemName && styles.inputError]} placeholder="e.g. Casio fx-991EX Calculator" placeholderTextColor="#94A3B8" value={itemName} onChangeText={(t) => { setItemName(t); clearError('itemName'); }} returnKeyType="next" maxLength={80} />
            {errors.itemName && <ErrorText text={errors.itemName} />}
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel text="Category" required />
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (<TouchableOpacity key={cat} style={[styles.chip, selected && styles.chipSelected]} onPress={() => { setCategory(cat); clearError('category'); }} activeOpacity={0.75}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat}</Text></TouchableOpacity>);
              })}
            </View>
            {errors.category && <ErrorText text={errors.category} />}
          </View>

          <SectionHeader title="What do you want to do?" />
          <View style={styles.fieldGroup}>
            <View style={styles.modeRow}>
              <ModeCard icon="🔁" label="Rent" sublabel="Lend temporarily" selected={mode === 'RENT'} onPress={() => { setMode('RENT'); clearError('mode'); clearError('price'); }} />
              <ModeCard icon="🏷️" label="Sell" sublabel="Transfer ownership" selected={mode === 'SELL'} onPress={() => { setMode('SELL'); clearError('mode'); clearError('price'); }} />
              <ModeCard icon="🎁" label="Give Away" sublabel="It's free!" selected={mode === 'FREE'} onPress={() => { setMode('FREE'); setPrice(''); clearError('mode'); clearError('price'); }} />
            </View>
            {errors.mode && <ErrorText text={errors.mode} />}
          </View>

          {mode !== null && mode !== 'FREE' && (
            <View style={styles.fieldGroup}>
              <FieldLabel text={mode === 'RENT' ? 'Price per day' : 'Selling Price'} required />
              <View style={[styles.priceRow, errors.price && styles.inputError]}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput style={styles.priceInput} placeholder="0" placeholderTextColor="#94A3B8" keyboardType="numeric" value={price} onChangeText={(t) => { setPrice(t); clearError('price'); }} returnKeyType="next" maxLength={6} />
                {mode === 'RENT' && <Text style={styles.priceSuffix}>/ day</Text>}
              </View>
              {errors.price && <ErrorText text={errors.price} />}
            </View>
          )}

          <SectionHeader title="More Details" />
          <View style={styles.fieldGroup}>
            <FieldLabel text="Description" required />
            <TextInput style={[styles.textInput, styles.textArea, errors.description && styles.inputError]} placeholder="Describe the item — condition, size, any extra details..." placeholderTextColor="#94A3B8" value={description} onChangeText={(t) => { setDescription(t); clearError('description'); }} multiline numberOfLines={4} textAlignVertical="top" maxLength={400} />
            <Text style={styles.charCount}>{description.length}/400</Text>
            {errors.description && <ErrorText text={errors.description} />}
          </View>

          <SectionHeader title="Location" />
          <View style={styles.fieldGroup}>
            <FieldLabel text="Your Hostel" required />
            <View style={styles.chipGrid}>
              {HOSTELS.map((h) => { const selected = hostel === h; return (<TouchableOpacity key={h} style={[styles.chip, selected && styles.chipSelected]} onPress={() => { setHostel(h); clearError('hostel'); }} activeOpacity={0.75}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{h}</Text></TouchableOpacity>); })}
            </View>
            {errors.hostel && <ErrorText text={errors.hostel} />}
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel text="Visible to" required />
            <View style={styles.chipGrid}>
              {VISIBILITY_OPTIONS.map((v) => { const selected = visibility === v; return (<TouchableOpacity key={v} style={[styles.chip, selected && styles.chipSelected]} onPress={() => { setVisibility(v); clearError('visibility'); }} activeOpacity={0.75}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{v}</Text></TouchableOpacity>); })}
            </View>
            {errors.visibility && <ErrorText text={errors.visibility} />}
          </View>

          <SectionHeader title="Photo" />
          <View style={styles.fieldGroup}>
            <TouchableOpacity style={styles.photoPlaceholder} activeOpacity={0.7} disabled>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoLabel}>Add Photo</Text>
              <Text style={styles.photoSublabel}>Photo upload coming soon</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={styles.submitButtonText}>📤  Post Item</Text>
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (<View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{title}</Text></View>);
}

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (<Text style={styles.fieldLabel}>{text}{required && <Text style={styles.requiredStar}> *</Text>}</Text>);
}

function ErrorText({ text }: { text: string }) {
  return <Text style={styles.errorText}>⚠ {text}</Text>;
}

function ModeCard({ icon, label, sublabel, selected, onPress }: { icon: string; label: string; sublabel: string; selected: boolean; onPress: () => void; }) {
  return (
    <TouchableOpacity style={[styles.modeCard, selected && styles.modeCardSelected]} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.modeCardIcon}>{icon}</Text>
      <Text style={[styles.modeCardLabel, selected && styles.modeCardLabelSelected]}>{label}</Text>
      <Text style={[styles.modeCardSublabel, selected && styles.modeCardSublabelSelected]}>{sublabel}</Text>
      {selected && (<View style={styles.modeCardCheck}><Text style={styles.modeCardCheckText}>✓</Text></View>)}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  sectionHeader: { backgroundColor: '#F1F5F9', paddingHorizontal: Spacing.md, paddingTop: 20, paddingBottom: 8 },
  sectionHeaderText: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 1, textTransform: 'uppercase' },
  fieldGroup: { backgroundColor: '#FFFFFF', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#0F172A', marginBottom: 10 },
  requiredStar: { color: Colors.light.error },
  textInput: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', backgroundColor: '#FAFAFA' },
  textArea: { minHeight: 100, paddingTop: 12 },
  inputError: { borderColor: Colors.light.error, backgroundColor: '#FFF5F5' },
  charCount: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  chipSelected: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: '#475569' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', position: 'relative', minHeight: 100 },
  modeCardSelected: { borderColor: Colors.light.primary, backgroundColor: '#EFF6FF' },
  modeCardIcon: { fontSize: 24, marginBottom: 6 },
  modeCardLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 2 },
  modeCardLabelSelected: { color: Colors.light.primary },
  modeCardSublabel: { fontSize: 10, color: '#94A3B8', textAlign: 'center' },
  modeCardSublabelSelected: { color: '#3B82F6' },
  modeCardCheck: { position: 'absolute', top: 6, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  modeCardCheckText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  priceRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: BorderRadius.md, backgroundColor: '#FAFAFA', paddingHorizontal: 14 },
  currencySymbol: { fontSize: 16, fontWeight: '700', color: '#475569', marginRight: 6 },
  priceInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0F172A', paddingVertical: 12 },
  priceSuffix: { fontSize: 13, color: '#94A3B8', fontWeight: '500', marginLeft: 4 },
  photoPlaceholder: { borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: BorderRadius.lg, paddingVertical: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  photoIcon: { fontSize: 32, marginBottom: 8 },
  photoLabel: { fontSize: 15, fontWeight: '700', color: '#475569', marginBottom: 4 },
  photoSublabel: { fontSize: 12, color: '#94A3B8' },
  errorText: { fontSize: 12, color: Colors.light.error, marginTop: 6, fontWeight: '500' },
  submitButton: { marginHorizontal: Spacing.md, marginTop: 24, backgroundColor: Colors.light.primary, paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  submitButtonText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
});
