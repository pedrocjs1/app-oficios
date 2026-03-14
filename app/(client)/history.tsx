import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';

type CompletedJob = {
  id: string;
  agreed_price: number;
  confirmed_at: string;
  professional_photos?: string[];
  professionals: {
    users: {
      name: string;
      avatar_url: string | null;
    };
  };
  service_requests: {
    problem_type: string;
    categories: {
      name: string;
    };
  };
  reviews: { rating: number; comment: string }[];
};

export default function HistoryScreen() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [user?.id])
  );

  async function loadHistory() {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('jobs')
        .select(`
          *,
          professionals!jobs_professional_id_fkey(
            users!professionals_user_id_fkey(name, avatar_url)
          ),
          service_requests(problem_type, categories(name)),
          reviews(rating, comment)
        `)
        .eq('client_id', user.id)
        .eq('status', 'confirmed')
        .order('confirmed_at', { ascending: false });

      setJobs((data as CompletedJob[]) ?? []);
    } catch (e) {
      console.warn('Error loading history:', e);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }

  function renderStars(rating: number) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color={i <= rating ? COLORS.warning : COLORS.textMuted}
        />
      );
    }
    return stars;
  }

  function renderSkeletons() {
    return (
      <View style={styles.listContent}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.card, SHADOWS.sm]}>
            <View style={styles.cardHeader}>
              <View style={styles.skeletonAvatar} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={[styles.skeletonLine, { width: '60%' }]} />
                <View style={[styles.skeletonLine, { width: '40%' }]} />
              </View>
            </View>
            <View style={{ gap: 6, marginTop: 12 }}>
              <View style={[styles.skeletonLine, { width: '80%' }]} />
              <View style={[styles.skeletonLine, { width: '50%' }]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="clipboard-outline" size={48} color={COLORS.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No tenes trabajos completados aun</Text>
        <Text style={styles.emptySubtitle}>
          Cuando completes un trabajo, aparecera aqui
        </Text>
      </View>
    );
  }

  function renderJobCard({ item }: { item: CompletedJob }) {
    const profUser = item.professionals?.users;
    const category = item.service_requests?.categories?.name ?? '';
    const problemType = item.service_requests?.problem_type ?? '';
    const review = item.reviews?.[0];
    const photos = item.professional_photos ?? [];

    return (
      <TouchableOpacity
        style={[styles.card, SHADOWS.sm]}
        activeOpacity={0.7}
        onPress={() => router.push(`/(client)/job/${item.id}`)}
      >
        {/* Header: Professional info */}
        <View style={styles.cardHeader}>
          {profUser?.avatar_url ? (
            <Image source={{ uri: profUser.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {profUser?.name?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View style={styles.cardHeaderText}>
            <Text style={styles.profName} numberOfLines={1}>
              {profUser?.name ?? 'Profesional'}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          </View>
          <Text style={styles.priceText}>
            ${item.agreed_price?.toLocaleString('es-AR')}
          </Text>
        </View>

        {/* Problem type */}
        <Text style={styles.problemText} numberOfLines={2}>
          {problemType}
        </Text>

        {/* Photos thumbnails */}
        {photos.length > 0 && (
          <View style={styles.photosRow}>
            {photos.slice(0, 4).map((uri, idx) => (
              <Image key={idx} source={{ uri }} style={styles.photoThumb} />
            ))}
            {photos.length > 4 && (
              <View style={styles.morePhotos}>
                <Text style={styles.morePhotosText}>+{photos.length - 4}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer: date and rating */}
        <View style={styles.cardFooter}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.dateText}>
              {item.confirmed_at
                ? new Date(item.confirmed_at).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : ''}
            </Text>
          </View>
          {review ? (
            <View style={styles.starsRow}>{renderStars(review.rating)}</View>
          ) : (
            <Text style={styles.noReviewText}>Sin resena</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de pedidos</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        renderSkeletons()
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.secondary,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardHeaderText: {
    flex: 1,
  },
  profName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  priceText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.success,
  },
  problemText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 12,
    lineHeight: 18,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  photoThumb: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.sm,
  },
  morePhotos: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotosText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  noReviewText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  // Skeleton
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.borderLight,
    marginRight: 12,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.borderLight,
  },
});
