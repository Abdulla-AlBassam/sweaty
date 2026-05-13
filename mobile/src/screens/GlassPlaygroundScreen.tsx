import { View, Text, Image, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GlassSurface, GlassCapsule, GlassSheet, GlassTokens } from '../ui/glass'
import { Colors } from '../constants/colors'
import { Typography } from '../constants/fonts'

const SAMPLE_ARTWORK =
  'https://cdn2.steamgriddb.com/hero/5b359e020d0c4726dd6876f6e6500648.png'

export function GlassPlaygroundScreen() {
  return (
    <View style={styles.root}>
      <Image source={{ uri: SAMPLE_ARTWORK }} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.dimmer]} />

      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.header}>GLASS PLAYGROUND</Text>

          <GlassCapsule style={styles.row}>
            <Text style={styles.label}>Search games, users, lists…</Text>
          </GlassCapsule>

          <View style={styles.segmentRow}>
            <GlassCapsule style={styles.segment}>
              <Text style={styles.segmentLabel}>Friends</Text>
            </GlassCapsule>
            <GlassCapsule style={styles.segment}>
              <Text style={styles.segmentLabel}>You</Text>
            </GlassCapsule>
          </View>

          <GlassSurface style={styles.card}>
            <Text style={styles.cardTitle}>Profile plate</Text>
            <Text style={styles.cardBody}>
              Avatar, name, stats, and favourites sit on this floating glass plate
              over the banner image.
            </Text>
          </GlassSurface>

          <View style={styles.pillRow}>
            <GlassCapsule height={32} style={styles.smallPill}>
              <Text style={styles.smallLabel}>236 followers</Text>
            </GlassCapsule>
            <GlassCapsule height={32} style={styles.smallPill}>
              <Text style={styles.smallLabel}>54 following</Text>
            </GlassCapsule>
          </View>

          <View style={{ height: 200 }} />

          <GlassSheet style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>QUICK LOG</Text>
            <GlassCapsule style={{ marginTop: 16 }}>
              <Text style={styles.label}>Search for a game…</Text>
            </GlassCapsule>
          </GlassSheet>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  dimmer: { backgroundColor: 'rgba(0,0,0,0.25)' },
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 16 },
  header: {
    ...Typography.sectionTitle,
    color: GlassTokens.vibrancy.brand,
    letterSpacing: 2,
    marginBottom: 8,
  },
  row: { width: '100%' },
  label: { color: Colors.accentSoft, fontFamily: 'Geist-Regular', fontSize: 15 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, height: 38, alignItems: 'center' },
  segmentLabel: {
    color: GlassTokens.vibrancy.primary,
    fontFamily: 'Geist-Medium',
    fontSize: 14,
  },
  card: { padding: 18 },
  cardTitle: {
    ...Typography.sectionTitle,
    color: GlassTokens.vibrancy.brand,
    marginBottom: 6,
  },
  cardBody: { color: Colors.accentSoft, fontSize: 14, lineHeight: 20 },
  pillRow: { flexDirection: 'row', gap: 8 },
  smallPill: { paddingHorizontal: 12 },
  smallLabel: {
    color: GlassTokens.vibrancy.primary,
    fontFamily: 'Geist-Medium',
    fontSize: 12,
  },
  sheet: { marginTop: 32 },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: GlassTokens.stroke.edge,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    ...Typography.sectionTitle,
    color: GlassTokens.vibrancy.brand,
    letterSpacing: 2,
    textAlign: 'center',
  },
})
