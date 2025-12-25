import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl } from '../constants'
import { supabase } from '../lib/supabase'
import { MainStackParamList } from '../navigation'

type Props = NativeStackScreenProps<MainStackParamList, 'CuratedListDetail'>

interface CuratedGame {
  id: number
  name: string
  cover_url: string | null
}

export default function CuratedListDetailScreen({ navigation, route }: Props) {
  const { listTitle, gameIds } = route.params

  const [games, setGames] = useState<CuratedGame[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchGames = async () => {
      if (!gameIds || gameIds.length === 0) {
        setGames([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const { data, error } = await supabase
          .from('games_cache')
          .select('id, name, cover_url')
          .in('id', gameIds)

        if (error) throw error

        // Preserve order from gameIds array
        const gamesMap = new Map(data?.map((g) => [g.id, g]) || [])
        const orderedGames = gameIds
          .map((id) => gamesMap.get(id))
          .filter(Boolean) as CuratedGame[]

        setGames(orderedGames)
      } catch (err) {
        console.error('Failed to fetch curated list games:', err)
        setGames([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchGames()
  }, [gameIds])

  const handleGamePress = (gameId: number) => {
    navigation.navigate('GameDetail', { gameId })
  }

  const renderGame = ({ item }: { item: CuratedGame }) => {
    return (
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => handleGamePress(item.id)}
        activeOpacity={0.8}
      >
        {item.cover_url ? (
          <Image
            source={{ uri: getIGDBImageUrl(item.cover_url) }}
            style={styles.gameCover}
          />
        ) : (
          <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
            <Ionicons name="game-controller-outline" size={24} color={Colors.textDim} />
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{listTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : games.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="game-controller-outline" size={48} color={Colors.textDim} />
          <Text style={styles.emptyText}>No Games Found</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          renderItem={renderGame}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          contentContainerStyle={styles.gamesGrid}
          columnWrapperStyle={styles.gamesRow}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  gamesGrid: {
    padding: Spacing.lg,
  },
  gamesRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  gameCard: {
    width: '31%',
    aspectRatio: 3 / 4,
  },
  gameCover: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  gameCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
