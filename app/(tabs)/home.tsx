import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/components/AuthProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RecentScan = {
  id: string;
  productName: string;
  verdict: 'APPROVED' | 'CAUTION' | 'AVOID' | 'UNKNOWN';
  timeAgo: string;
  dietaryScore: number;
};

const formatTimeAgo = (ts: number) => {
  const mins = Math.max(1, Math.floor((Date.now() - ts) / (1000 * 60)));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  const loadRecentScans = useCallback(async () => {
    try {
      if (!user?.id) {
        setRecentScans([]);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const repos = require('../../src/database/repositories') as typeof import('../../src/database/repositories');
      const rows = await repos.ScanRepository.getScans(user.id);
      const mapped = (rows as any[])
        .slice(0, 8)
        .map((r: any) => {
          let parsed: any = null;
          try {
            parsed = typeof r?.data === 'string' ? JSON.parse(r.data) : r?.data;
          } catch {
            parsed = null;
          }
          const createdAt = typeof r?._raw?.created_at === 'number' ? r._raw.created_at : Date.now();
          const verdict = String(parsed?.recommendation?.verdict || parsed?.verdict || 'UNKNOWN').toUpperCase();
          const normalized =
            verdict === 'APPROVED' || verdict === 'CAUTION' || verdict === 'AVOID' ? verdict : 'UNKNOWN';
          return {
            id: String(r?.id),
            productName: String(parsed?.visionResult?.productName || 'Unknown product'),
            verdict: normalized as RecentScan['verdict'],
            timeAgo: formatTimeAgo(createdAt),
            dietaryScore: Number(parsed?.nutritionResult?.dietaryScore ?? parsed?.dietaryScore ?? 0),
          };
        });
      setRecentScans(mapped);
    } catch {
      setRecentScans([]);
    }
  }, [user?.id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadRecentScans();
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [loadRecentScans]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecentScans();
    setRefreshing(false);
  }, [loadRecentScans]);

  const greetingName = useMemo(() => {
    const email = String(user?.email || 'friend');
    const raw = email.split('@')[0] || 'friend';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [user?.email]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [],
  );

  const scansToday = recentScans.length;
  const approvedCount = recentScans.filter((scan) => scan.verdict === 'APPROVED').length;
  const cautionCount = recentScans.filter((scan) => scan.verdict === 'CAUTION').length;
  const avoidCount = recentScans.filter((scan) => scan.verdict === 'AVOID').length;
  const statCardWidth = (screenWidth - 32 - 12) / 2;

  const verdictBadgeStyle = (verdict: RecentScan['verdict']) => {
    if (verdict === 'APPROVED') return [styles.verdictBadge, styles.verdictApproved];
    if (verdict === 'CAUTION') return [styles.verdictBadge, styles.verdictCaution];
    if (verdict === 'AVOID') return [styles.verdictBadge, styles.verdictAvoid];
    return [styles.verdictBadge, styles.verdictUnknown];
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}> 
          <Text allowFontScaling style={styles.greeting}>{greeting}, {greetingName}</Text>
          <Text allowFontScaling style={styles.greetingDate}>{todayDate}</Text>
        </View>

        <Pressable style={styles.scanButton} onPress={() => router.push('/scan/capture')}>
          <View style={styles.scanButtonIconWrap}>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.scanButtonText}>Scan a Product</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.75)" />
        </Pressable>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { width: statCardWidth }]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#007AFF' }]}>
              <Ionicons name="stats-chart" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.statNumber}>{scansToday}</Text>
            <Text style={styles.statLabel}>Scans Today</Text>
          </View>
          <View style={[styles.statCard, { width: statCardWidth }]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#34C759' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.statNumber}>{approvedCount}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={[styles.statCard, { width: statCardWidth }]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FF9500' }]}>
              <Ionicons name="warning" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.statNumber}>{cautionCount}</Text>
            <Text style={styles.statLabel}>Caution</Text>
          </View>
          <View style={[styles.statCard, { width: statCardWidth }]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FF3B30' }]}>
              <Ionicons name="close-circle" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.statNumber}>{avoidCount}</Text>
            <Text style={styles.statLabel}>Avoid</Text>
          </View>
        </View>

        <Text allowFontScaling style={styles.sectionTitle}>Recent Scans</Text>
        {loading ? (
          <View style={styles.loadingCard}>
            <Text style={styles.scanRowTime}>Loading…</Text>
          </View>
        ) : recentScans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>{'\u{1F50D}'}</Text>
            <Text style={styles.emptyTitle}>No scans yet</Text>
            <Text style={styles.emptyText}>Tap Scan to get started.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {recentScans.slice(0, 3).map((scan, index) => (
              <React.Fragment key={scan.id}>
                <Pressable style={styles.scanRow} onPress={() => router.push(`/scan/${encodeURIComponent(scan.id)}`)}>
                  <View
                    style={[
                      styles.scanRowIconCircle,
                      {
                        backgroundColor:
                          scan.verdict === 'APPROVED'
                            ? '#34C759'
                            : scan.verdict === 'CAUTION'
                              ? '#FF9500'
                              : scan.verdict === 'AVOID'
                                ? '#FF3B30'
                                : '#8E8E93',
                      },
                    ]}
                  >
                    <Ionicons name="document-text" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.scanRowContent}>
                    <Text style={styles.scanRowName} numberOfLines={1}>{scan.productName}</Text>
                    <View
                      style={[
                        styles.scanRowMeta,
                      ]}
                    >
                      <Text style={verdictBadgeStyle(scan.verdict)}>{scan.verdict}</Text>
                      <Text style={styles.scanRowMetaDot}>•</Text>
                      <Text style={styles.scanRowTime}>{scan.timeAgo}</Text>
                      <Text style={styles.scanRowMetaDot}>•</Text>
                      <Text style={styles.scanRowScore}>Score {Math.round(scan.dietaryScore)}</Text>
                    </View>
                  </View>
                </Pressable>
                {index < Math.min(recentScans.length, 3) - 1 ? <View style={styles.scanRowSeparator} /> : null}
              </React.Fragment>
            ))}
          </View>
        )}

        <Text allowFontScaling style={styles.sectionTitle}>This Week</Text>
        <View style={[styles.card, styles.thisWeekCard]}>
          <Pressable style={styles.thisWeekRow} onPress={() => router.push('/(tabs)/reports')}>
            <View style={styles.thisWeekIconCircle}><Ionicons name="stats-chart" size={20} color="#FFFFFF" /></View>
            <View style={styles.thisWeekContent}>
              <Text style={styles.thisWeekTitle}>Weekly Report</Text>
              <Text style={styles.thisWeekSub}>View your nutrition trends</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    lineHeight: 34,
  },
  greetingDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '400',
  },
  scanButton: {
    marginHorizontal: 16,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#34C759',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginBottom: 4,
  },
  scanButtonIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2EBD52',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scanButtonText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    lineHeight: 38,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: 'hidden',
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  scanRowSeparator: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginLeft: 62,
  },
  scanRowIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scanRowContent: {
    flex: 1,
  },
  scanRowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 3,
  },
  scanRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  verdictBadge: {
    fontSize: 11,
    fontWeight: '700',
    borderRadius: 6,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  verdictApproved: { color: '#1E7D36', backgroundColor: '#E9F8EE' },
  verdictCaution: { color: '#B06A00', backgroundColor: '#FFF4E5' },
  verdictAvoid: { color: '#B42318', backgroundColor: '#FFECEC' },
  verdictUnknown: { color: '#8E8E93', backgroundColor: '#F2F2F7' },
  scanRowTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  scanRowMetaDot: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  scanRowScore: {
    fontSize: 12,
    color: '#8E8E93',
  },
  thisWeekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  thisWeekIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#5856D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  thisWeekContent: {
    flex: 1,
  },
  thisWeekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  thisWeekSub: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  thisWeekCard: {
    marginBottom: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
});
