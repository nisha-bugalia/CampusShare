import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';

export default function CreateScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>What do you want to post?</Text>
        <Text style={styles.subheading}>
          Choose the type of post you'd like to create on CampusShare.
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        {/* I HAVE card */}
        <TouchableOpacity
          style={[styles.card, styles.haveCard]}
          activeOpacity={0.82}
          onPress={() => router.push('/create/have')}
        >
          <View style={styles.cardIconWrapper}>
            <Text style={styles.cardIcon}>📦</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardLabelRow}>
              <View style={[styles.badge, styles.haveBadge]}>
                <Text style={styles.haveBadgeText}>I HAVE</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>I HAVE SOMETHING</Text>
            <Text style={styles.cardDescription}>
              I want to lend, rent, sell, or give away an item to another student.
            </Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </TouchableOpacity>

        {/* I NEED card */}
        <TouchableOpacity
          style={[styles.card, styles.needCard]}
          activeOpacity={0.82}
          onPress={() => router.push('/create/need')}
        >
          <View style={styles.cardIconWrapper}>
            <Text style={styles.cardIcon}>🔍</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardLabelRow}>
              <View style={[styles.badge, styles.needBadge]}>
                <Text style={styles.needBadgeText}>I NEED</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>I NEED SOMETHING</Text>
            <Text style={styles.cardDescription}>
              I'm looking for an item from another student on campus.
            </Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerNote}>
        Your post will be visible to all students on campus.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 36,
    paddingBottom: 28,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 8,
    lineHeight: 34,
  },
  subheading: {
    fontSize: 14,
    color: Colors.light.textMuted,
    lineHeight: 21,
  },

  // Cards
  cardsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  haveCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    shadowColor: '#1E3A8A',
  },
  needCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    shadowColor: '#B45309',
  },
  cardIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardIcon: {
    fontSize: 26,
  },
  cardBody: {
    flex: 1,
  },
  cardLabelRow: {
    marginBottom: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  haveBadge: {
    backgroundColor: '#DBEAFE',
  },
  haveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.8,
  },
  needBadge: {
    backgroundColor: '#FDE68A',
  },
  needBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  cardDescription: {
    fontSize: 12,
    color: Colors.light.textMuted,
    lineHeight: 17,
  },
  cardArrow: {
    fontSize: 18,
    color: Colors.light.textMuted,
    marginLeft: 8,
  },

  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 32,
    paddingHorizontal: Spacing.lg,
    lineHeight: 18,
  },
});