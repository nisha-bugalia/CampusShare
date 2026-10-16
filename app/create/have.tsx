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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { ListingCategory, ItemMode } from '../../src/types/listing';
import { useAuth } from '../../src/context/AuthContext';
import { useProfile } from '../../src/hooks/useProfile';
import { useMarketplace } from '../../src/context/MarketplaceContext';
import { supabase } from '../../src/lib/supabase';

import { NIT_HOSTELS, NITHostel } from '../../src/constants/campus';

// ─── Types ───────────────────────────────────────────────────────────────────

type Mode = 'RENT' | 'SELL' | 'FREE' | null;
type Category = Exclude<ListingCategory, 'All'> | null;
type Hostel = NITHostel | null;

interface SelectedImage {
  uri: string;
  base64?: string | null;
  mimeType?: string;
}

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateHaveScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { refresh: refreshMarketplace } = useMarketplace();

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<Category>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [hostel, setHostel] = useState<Hostel>(null);
  const [selectedHostels, setSelectedHostels] = useState<string[]>([]); // [] = Everyone
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Prefill hostel with user's saved profile hostel if not yet set
  useEffect(() => {
    if (profile?.hostel && !hostel) {
      setHostel(profile.hostel as Hostel);
    }
  }, [profile?.hostel]);

  // ─── Photo Actions ──────────────────────────────────────────────────────────

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Camera permission is required to capture an item photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          base64: asset.base64,
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err: any) {
      console.warn('[CreateHave] Error taking photo:', err);
      Alert.alert('Camera Error', 'Could not open camera. Please try again.');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Permission to access your photo library is required to select an item image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          base64: asset.base64,
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err: any) {
      console.warn('[CreateHave] Error selecting image from gallery:', err);
      Alert.alert('Gallery Error', 'Could not open photo library. Please try again.');
    }
  };

  const handleRemovePhoto = () => {
    setSelectedImage(null);
  };

  const handlePhotoActionSheet = () => {
    Alert.alert(
      'Item Photo',
      'Choose how you want to add a photo for this listing.',
      [
        { text: 'Take Photo 📸', onPress: handleTakePhoto },
        { text: 'Choose from Gallery 🖼️', onPress: handlePickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ─── Form Validation ────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!itemName.trim()) newErrors.itemName = 'Item name is required.';
    if (!category) newErrors.category = 'Please select a category.';
    if (!mode) newErrors.mode = 'Please choose what you want to do with this item.';
    if ((mode === 'RENT' || mode === 'SELL') && !price.trim()) {
      newErrors.price =
        mode === 'RENT'
          ? 'Price per day is required for rental items.'
          : 'Selling price is required.';
    }
    if (price.trim() && isNaN(Number(price))) {
      newErrors.price = 'Price must be a valid number.';
    }
    if (!description.trim()) newErrors.description = 'Description is required.';
    if (!hostel) newErrors.hostel = 'Please select your hostel.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Form Submission ────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!user?.id) {
      Alert.alert(
        'Authentication Required',
        'You must be signed in to post a listing.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isSubmitting || isUploading) return;
    setIsSubmitting(true);

    let uploadedFilePath: string | null = null;
    let publicImageUrl: string | null = null;

    // 1. Upload photo if selected
    if (selectedImage) {
      try {
        setIsUploading(true);
        const fileExt = selectedImage.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const cleanExt = fileExt === 'png' ? 'png' : fileExt === 'webp' ? 'webp' : 'jpg';
        const contentType = selectedImage.mimeType || `image/${cleanExt}`;
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;
        uploadedFilePath = `${user.id}/${fileName}`;

        let fileBody: ArrayBuffer;
        if (selectedImage.base64) {
          fileBody = decode(selectedImage.base64);
        } else {
          const response = await fetch(selectedImage.uri);
          fileBody = await response.arrayBuffer();
        }

        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(uploadedFilePath, fileBody, {
            contentType,
            upsert: false,
          });

        if (uploadError) {
          console.error('[CreateHave] Supabase Storage upload error:', uploadError);
          Alert.alert(
            'Photo Upload Failed',
            `Could not upload the item photo (${uploadError.message}). Please try again.`
          );
          setIsSubmitting(false);
          setIsUploading(false);
          return;
        }

        // Retrieve public URL
        const { data: urlData } = supabase.storage
          .from('listing-images')
          .getPublicUrl(uploadedFilePath);

        publicImageUrl = urlData.publicUrl;
      } catch (uploadErr: any) {
        console.error('[CreateHave] Unexpected error during image upload:', uploadErr);
        Alert.alert(
          'Photo Upload Error',
          uploadErr instanceof Error
            ? uploadErr.message
            : 'An unexpected error occurred while uploading the photo.'
        );
        setIsSubmitting(false);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    // 2. Insert listing into public.listings
    try {
      const listingType =
        mode === 'RENT' ? 'rent' : mode === 'SELL' ? 'sell' : 'give';
      const numericPrice =
        mode === 'FREE' || !price.trim() ? null : Number(price.trim());

      const { data, error } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          title: itemName.trim(),
          category: category as string,
          listing_type: listingType,
          price: numericPrice,
          description: description.trim(),
          hostel: hostel as string,
          visibility: selectedHostels.length === 0 ? 'Everyone' : selectedHostels.join(', '),
          visibility_hostels: selectedHostels,
          image_url: publicImageUrl,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) {
        console.error('[CreateHave] Failed to insert listing into Supabase:', error);

        // Attempt rollback of uploaded image if database insert fails
        if (uploadedFilePath) {
          try {
            await supabase.storage.from('listing-images').remove([uploadedFilePath]);
          } catch (cleanupErr) {
            console.warn('[CreateHave] Image cleanup error after insert failure:', cleanupErr);
          }
        }

        Alert.alert(
          'Post Failed',
          error.message || 'Could not post your item. Please try again.'
        );
        return;
      }

      if (!data?.id) {
        Alert.alert(
          'Post Failed',
          'Failed to retrieve the new listing ID from the database.'
        );
        return;
      }

      try {
        await refreshMarketplace();
      } catch (refreshErr) {
        console.warn('[CreateHave] Failed to refresh feed after post:', refreshErr);
      }

      Alert.alert(
        'Item Posted! 🎉',
        'Your item is live on the I HAVE marketplace.',
        [
          {
            text: 'View Item',
            onPress: () => router.replace(`/listing/${data.id}`),
          },
        ]
      );
    } catch (err: any) {
      console.error('[CreateHave] Unexpected error during listing submission:', err);

      // Attempt rollback of uploaded image
      if (uploadedFilePath) {
        try {
          await supabase.storage.from('listing-images').remove([uploadedFilePath]);
        } catch (cleanupErr) {
          console.warn('[CreateHave] Image cleanup error:', cleanupErr);
        }
      }

      Alert.alert(
        'Post Error',
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while posting your item.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Post an Item',
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
          {/* Item Details */}
          <SectionHeader title="Item Details" />
          <View style={styles.fieldGroup}>
            <FieldLabel text="Item Name" required />
            <TextInput
              style={[styles.textInput, errors.itemName && styles.inputError]}
              placeholder="e.g. Casio fx-991EX Calculator"
              placeholderTextColor="#94A3B8"
              value={itemName}
              onChangeText={(t) => {
                setItemName(t);
                clearError('itemName');
              }}
              returnKeyType="next"
              maxLength={80}
            />
            {errors.itemName && <ErrorText text={errors.itemName} />}
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel text="Category" required />
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => {
                      setCategory(cat);
                      clearError('category');
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.category && <ErrorText text={errors.category} />}
          </View>

          {/* Mode */}
          <SectionHeader title="What do you want to do?" />
          <View style={styles.fieldGroup}>
            <View style={styles.modeRow}>
              <ModeCard
                icon="🔁"
                label="Rent"
                sublabel="Lend temporarily"
                selected={mode === 'RENT'}
                onPress={() => {
                  setMode('RENT');
                  clearError('mode');
                  clearError('price');
                }}
              />
              <ModeCard
                icon="🏷️"
                label="Sell"
                sublabel="Transfer ownership"
                selected={mode === 'SELL'}
                onPress={() => {
                  setMode('SELL');
                  clearError('mode');
                  clearError('price');
                }}
              />
              <ModeCard
                icon="🎁"
                label="Give Away"
                sublabel="It's free!"
                selected={mode === 'FREE'}
                onPress={() => {
                  setMode('FREE');
                  setPrice('');
                  clearError('mode');
                  clearError('price');
                }}
              />
            </View>
            {errors.mode && <ErrorText text={errors.mode} />}
          </View>

          {mode !== null && mode !== 'FREE' && (
            <View style={styles.fieldGroup}>
              <FieldLabel
                text={mode === 'RENT' ? 'Price per day' : 'Selling Price'}
                required
              />
              <View style={[styles.priceRow, errors.price && styles.inputError]}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={(t) => {
                    setPrice(t);
                    clearError('price');
                  }}
                  returnKeyType="next"
                  maxLength={6}
                />
                {mode === 'RENT' && (
                  <Text style={styles.priceSuffix}>/ day</Text>
                )}
              </View>
              {errors.price && <ErrorText text={errors.price} />}
            </View>
          )}

          {/* Description */}
          <SectionHeader title="More Details" />
          <View style={styles.fieldGroup}>
            <FieldLabel text="Description" required />
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                errors.description && styles.inputError,
              ]}
              placeholder="Describe the item — condition, size, any extra details..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={(t) => {
                setDescription(t);
                clearError('description');
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={400}
            />
            <Text style={styles.charCount}>{description.length}/400</Text>
            {errors.description && <ErrorText text={errors.description} />}
          </View>

          {/* Location & Visibility */}
          <SectionHeader title="Location" />
          <View style={styles.fieldGroup}>
            <FieldLabel text="Your Hostel" required />
            <View style={styles.chipGrid}>
              {NIT_HOSTELS.map((h) => {
                const selected = hostel === h;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => {
                      setHostel(h);
                      clearError('hostel');
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {h}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.hostel && <ErrorText text={errors.hostel} />}
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel text="Visible to" required />
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
              {selectedHostels.length === 0
                ? 'Visible to everyone on campus'
                : `Restricted to ${selectedHostels.length} hostel${selectedHostels.length > 1 ? 's' : ''}`}
            </Text>
            <View style={styles.chipGrid}>
              {/* Everyone option */}
              <TouchableOpacity
                key="Everyone"
                style={[
                  styles.chip,
                  selectedHostels.length === 0 && styles.chipSelected,
                ]}
                onPress={() => setSelectedHostels([])}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedHostels.length === 0 && styles.chipTextSelected,
                  ]}
                >
                  🌐 Everyone
                </Text>
              </TouchableOpacity>

              {/* Hostels options */}
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
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {isSelected ? `✓ ${h}` : h}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Photo Section */}
          <SectionHeader title="Photo (Optional)" />
          <View style={styles.fieldGroup}>
            {selectedImage ? (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={styles.previewActionBtn}
                    onPress={handlePhotoActionSheet}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.previewActionText}>🔄 Change Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.previewActionBtn, styles.previewDeleteBtn]}
                    onPress={handleRemovePhoto}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.previewDeleteText}>🗑️ Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.photoActionRow}>
                <TouchableOpacity
                  style={styles.photoActionButton}
                  onPress={handleTakePhoto}
                  activeOpacity={0.75}
                >
                  <Text style={styles.photoActionIcon}>📸</Text>
                  <Text style={styles.photoActionTitle}>Take Photo</Text>
                  <Text style={styles.photoActionSub}>Use camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoActionButton}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.75}
                >
                  <Text style={styles.photoActionIcon}>🖼️</Text>
                  <Text style={styles.photoActionTitle}>Choose Gallery</Text>
                  <Text style={styles.photoActionSub}>Select existing</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || isUploading) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || isUploading}
            activeOpacity={0.85}
          >
            {isUploading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonText}>Uploading Photo...</Text>
              </View>
            ) : isSubmitting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonText}>Posting Item...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>📤  Post Item</Text>
            )}
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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

function ModeCard({
  icon,
  label,
  sublabel,
  selected,
  onPress,
}: {
  icon: string;
  label: string;
  sublabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.modeCard, selected && styles.modeCardSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.modeCardIcon}>{icon}</Text>
      <Text
        style={[styles.modeCardLabel, selected && styles.modeCardLabelSelected]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.modeCardSublabel,
          selected && styles.modeCardSublabelSelected,
        ]}
      >
        {sublabel}
      </Text>
      {selected && (
        <View style={styles.modeCardCheck}>
          <Text style={styles.modeCardCheckText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  sectionHeader: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: Spacing.md,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fieldGroup: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 10,
  },
  requiredStar: { color: Colors.light.error },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FAFAFA',
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  inputError: {
    borderColor: Colors.light.error,
    backgroundColor: '#FFF5F5',
  },
  charCount: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: '#475569' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    position: 'relative',
    minHeight: 100,
  },
  modeCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: '#EFF6FF',
  },
  modeCardIcon: { fontSize: 24, marginBottom: 6 },
  modeCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  modeCardLabelSelected: { color: Colors.light.primary },
  modeCardSublabel: { fontSize: 10, color: '#94A3B8', textAlign: 'center' },
  modeCardSublabelSelected: { color: '#3B82F6' },
  modeCardCheck: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCardCheckText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.md,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 12,
  },
  priceSuffix: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    marginLeft: 4,
  },

  // Photo Action Buttons
  photoActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
  },
  photoActionIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  photoActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  photoActionSub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Photo Preview
  previewContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  previewImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#E2E8F0',
  },
  previewActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  previewActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  previewDeleteBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  previewDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },

  errorText: {
    fontSize: 12,
    color: Colors.light.error,
    marginTop: 6,
    fontWeight: '500',
  },
  submitButton: {
    marginHorizontal: Spacing.md,
    marginTop: 24,
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
