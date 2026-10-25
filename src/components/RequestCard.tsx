import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { RequestItem } from '../types/listing';
import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/layout';

interface RequestCardProps {
  item: RequestItem;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function RequestCard({ item, onPress, onEdit, onDelete }: RequestCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/request/${item.id}`);
    }
  };

  const renderUrgencyBadge = () => {
    if (item.urgency === 'Urgent') {
      return (
        <View style={[styles.badge, styles.badgeUrgent]}>
          <Text style={styles.badgeUrgentText}>URGENT</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgeNeeded]}>
        <Text style={styles.badgeNeededText}>I NEED</Text>
      </View>
    );
  };

  const renderStatusBadge = () => {
    if (!item.status || item.status === 'active') return null;
    if (item.status === 'fulfilled') {
      return (
        <View style={[styles.badge, styles.badgeStatusFulfilled]}>
          <Text style={styles.badgeStatusFulfilledText}>FULFILLED</Text>
        </View>
      );
    }
    if (item.status === 'cancelled') {
      return (
        <View style={[styles.badge, styles.badgeStatusCancelled]}>
          <Text style={styles.badgeStatusCancelledText}>CANCELLED</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={handlePress}
    >
      {/* Card Header: Badge + Time */}
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          {renderUrgencyBadge()}
          {renderStatusBadge()}
        </View>
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
      </View>

      {/* Card Main: Icon + Info */}
      <View style={styles.cardMain}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.itemGlyph}>{item.icon}</Text>
          <Text style={styles.placeholderLabel}>REQUEST</Text>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.budgetOffer}>
            Budget: <Text style={styles.budgetHighlight}>{item.budget}</Text>
          </Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationPin}>📍</Text>
            <Text style={styles.locationText}>{item.hostel}</Text>
          </View>
        </View>
      </View>

      {/* Description preview */}
      <Text style={styles.itemDescription} numberOfLines={2}>
        {item.description}
      </Text>

      {/* Requester footer */}
      <View style={styles.requesterRow}>
        <View style={styles.requesterAvatar}>
          <Text style={styles.requesterAvatarText}>
            {item.requesterName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.requesterText} numberOfLines={2} ellipsizeMode="tail">
          <Text style={styles.requesterName}>{item.requesterName}</Text>
          {item.requesterBranch ? (
            <Text style={styles.requesterBranch}>  •  {item.requesterBranch}</Text>
          ) : null}
        </Text>
      </View>

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
  badgeUrgent: {
    backgroundColor: '#FEF2F2',
  },
  badgeUrgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  badgeNeeded: {
    backgroundColor: '#FFFBEB',
  },
  badgeNeededText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  badgeStatusFulfilled: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeStatusFulfilledText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.5,
  },
  badgeStatusCancelled: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeStatusCancelledText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  timeAgo: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  imagePlaceholder: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
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
  budgetOffer: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginBottom: 4,
  },
  budgetHighlight: {
    fontWeight: '700',
    color: '#B45309',
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
    marginBottom: Spacing.sm,
  },
  requesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: Spacing.xs,
  },
  requesterAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    flexShrink: 0,
  },
  requesterAvatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  requesterText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  requesterName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  requesterBranch: {
    fontSize: 12,
    color: Colors.light.textMuted,
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