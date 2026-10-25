import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Listing, ItemMode } from '../types/listing';
import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/layout';

interface ListingCardProps {
  item: Listing;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ListingCard({ item, onPress, onEdit, onDelete }: ListingCardProps) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/listing/${item.id}`);
    }
  };

  const renderModeBadge = (mode: ItemMode) => {
    switch (mode) {
      case 'RENT':
        return (
          <View style={[styles.badge, styles.badgeRent]}>
            <Text style={styles.badgeRentText}>FOR RENT</Text>
          </View>
        );
      case 'SELL':
        return (
          <View style={[styles.badge, styles.badgeSell]}>
            <Text style={styles.badgeSellText}>FOR SALE</Text>
          </View>
        );
      case 'FREE':
        return (
          <View style={[styles.badge, styles.badgeFree]}>
            <Text style={styles.badgeFreeText}>FREE</Text>
          </View>
        );
    }
  };

  const renderStatusBadge = () => {
    if (!item.status || item.status === 'active') return null;
    switch (item.status) {
      case 'rented':
        return (
          <View style={[styles.badge, styles.badgeStatusRented]}>
            <Text style={styles.badgeStatusRentedText}>RENTED</Text>
          </View>
        );
      case 'sold':
        return (
          <View style={[styles.badge, styles.badgeStatusSold]}>
            <Text style={styles.badgeStatusSoldText}>SOLD</Text>
          </View>
        );
      case 'given':
        return (
          <View style={[styles.badge, styles.badgeStatusGiven]}>
            <Text style={styles.badgeStatusGivenText}>GIVEN</Text>
          </View>
        );
      case 'cancelled':
        return (
          <View style={[styles.badge, styles.badgeStatusCancelled]}>
            <Text style={styles.badgeStatusCancelledText}>CANCELLED</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const hasImage = !!item.image_url && !imgError;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={handlePress}
    >
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          {renderModeBadge(item.mode)}
          {renderStatusBadge()}
        </View>
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
      </View>

      <View style={styles.cardMain}>
        {hasImage ? (
          <Image
            source={{ uri: item.image_url! }}
            style={styles.itemImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.itemGlyph}>{item.icon}</Text>
            <Text style={styles.placeholderLabel}>PHOTO</Text>
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.itemPrice}>{item.price}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationPin}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
              {item.hostel}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.itemDescription} numberOfLines={2}>
        {item.description}
      </Text>

      {(onEdit || onDelete) && (
        <View style={styles.actionRow}>
          {onEdit && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>✏️</Text>
              <Text style={styles.actionTextEdit}>Edit</Text>
            </TouchableOpacity>
          )}
          {onEdit && onDelete && <View style={styles.actionDivider} />}
          {onDelete && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>🗑️</Text>
              <Text style={styles.actionTextDelete}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  badgeRent: { backgroundColor: '#EFF6FF' },
  badgeRentText: { fontSize: 10, fontWeight: '700', color: '#1D4ED8', letterSpacing: 0.5 },
  badgeSell: { backgroundColor: '#ECFDF5' },
  badgeSellText: { fontSize: 10, fontWeight: '700', color: '#047857', letterSpacing: 0.5 },
  badgeFree: { backgroundColor: '#FAF5FF' },
  badgeFreeText: { fontSize: 10, fontWeight: '700', color: '#7E22CE', letterSpacing: 0.5 },
  badgeStatusRented: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' },
  badgeStatusRentedText: { fontSize: 10, fontWeight: '700', color: '#C2410C', letterSpacing: 0.5 },
  badgeStatusSold: { backgroundColor: '#FDF2F8', borderWidth: 1, borderColor: '#FBCFE8' },
  badgeStatusSoldText: { fontSize: 10, fontWeight: '700', color: '#BE185D', letterSpacing: 0.5 },
  badgeStatusGiven: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  badgeStatusGivenText: { fontSize: 10, fontWeight: '700', color: '#15803D', letterSpacing: 0.5 },
  badgeStatusCancelled: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  badgeStatusCancelledText: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 },
  timeAgo: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  itemImage: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
    backgroundColor: '#E2E8F0',
  },
  imagePlaceholder: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  itemGlyph: {
    fontSize: 26,
    marginBottom: 2,
  },
  placeholderLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.light.textMuted,
    letterSpacing: 0.5,
  },
  cardInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  locationPin: {
    fontSize: 11,
    marginRight: 2,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textMuted,
    flexShrink: 1,
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textMuted,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: Spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  actionIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  actionTextEdit: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  actionDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },
  actionTextDelete: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
});

