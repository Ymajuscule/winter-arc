import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import { Text } from './Text';
import { border, frost, motion, spacing, typography } from './tokens';

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

export interface RadarAxis {
  /** Short all-caps label — Design Law rule 7's small-caps label above a number. */
  label: string;
  /** 0-100. */
  value: number;
}

export interface StatRadarProps {
  axes: readonly RadarAxis[];
  /** Overall width/height of the chart square, labels included. */
  size?: number;
  /** Accent for the value polygon — the active palette's `ice`, normally. */
  accent?: string;
}

/** Rings drawn behind the value polygon, as fractions of the full radius. */
const RING_STEPS = [0.25, 0.5, 0.75, 1] as const;

function polygonPoints(
  axisCount: number,
  radiusFor: (index: number) => number,
  cx: number,
  cy: number,
): string {
  'worklet';
  let out = '';
  for (let i = 0; i < axisCount; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axisCount;
    const r = radiusFor(i);
    out += `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)} `;
  }
  return out.trim();
}

/**
 * CDC §28 — the profile's radar chart over the 7 stats.
 *
 * Design Law notes, since a chart is where generic-looking UI usually creeps
 * back in: the rings and spokes are hairlines at the same `border.color` as
 * every other divider in the app, not a grey grid; the value polygon is a
 * flat accent fill at low opacity with a 1px stroke, not a gradient; there
 * is no axis-label box, no legend, and no tooltip. Labels sit outside the
 * outer ring in the same small-caps mono the rest of the app uses for
 * labels, each with its value beneath it in mono — rule 7, the number is
 * the hero, the label is small above (here: below) it.
 *
 * The polygon grows from the centre once on mount over `motion.duration.hero`
 * with out-expo easing (rule 5). It does not spring, and it does not re-run
 * on every value change — only the shape interpolates.
 */
export function StatRadar({ axes, size = 260, accent = frost.ice }: StatRadarProps) {
  // Room for a label line and a value line outside the outer ring.
  const labelGutter = 34;
  const radius = size / 2 - labelGutter;
  const cx = size / 2;
  const cy = size / 2;
  const count = axes.length;

  const values = useMemo(() => axes.map((a) => Math.max(0, Math.min(100, a.value))), [axes]);

  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = withTiming(1, {
      duration: motion.duration.hero,
      easing: Easing.bezier(...motion.easing.outExpo),
    });
  }, [grow]);

  const animatedProps = useAnimatedProps(() => {
    const t = grow.value;
    return {
      points: polygonPoints(count, (i) => radius * ((values[i] ?? 0) / 100) * t, cx, cy),
    };
  }, [count, radius, cx, cy, values]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {RING_STEPS.map((step) => (
          <Polygon
            key={step}
            points={polygonPoints(count, () => radius * step, cx, cy)}
            fill="none"
            stroke={border.color}
            strokeWidth={border.width}
          />
        ))}

        {axes.map((axis, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
          return (
            <Line
              key={axis.label}
              x1={cx}
              y1={cy}
              x2={cx + radius * Math.cos(angle)}
              y2={cy + radius * Math.sin(angle)}
              stroke={border.color}
              strokeWidth={border.width}
            />
          );
        })}

        <AnimatedPolygon
          animatedProps={animatedProps}
          fill={accent}
          fillOpacity={0.14}
          stroke={accent}
          strokeWidth={1}
          strokeLinejoin="round"
        />

        {axes.map((axis, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
          const r = radius * ((values[i] ?? 0) / 100);
          return (
            <Circle
              key={axis.label}
              cx={cx + r * Math.cos(angle)}
              cy={cy + r * Math.sin(angle)}
              r={2}
              fill={accent}
            />
          );
        })}
      </Svg>

      {/*
        Labels live in RN Text, not SVG Text: the design system's `Text`
        carries the loaded font families and the small-caps tracking, and
        react-native-svg's Text would need all of that re-specified by hand.
      */}
      {axes.map((axis, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
        const lr = radius + 16;
        return (
          <View
            key={axis.label}
            pointerEvents="none"
            style={[
              styles.axisLabel,
              {
                left: cx + lr * Math.cos(angle) - labelGutter,
                top: cy + lr * Math.sin(angle) - 14,
                width: labelGutter * 2,
              },
            ]}
          >
            <Text variant="label" color="fog" numberOfLines={1}>
              {axis.label}
            </Text>
            <Text variant="mono" color="ghost" style={styles.axisValue}>
              {String(Math.round(values[i] ?? 0)).padStart(2, '0')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * CDC §28's other view of the same data — one horizontal bar per stat, for
 * the detail list under the radar. Deliberately not `XPBar`: that one is a
 * progress track with its own cosmetic variants (CDC §59), this is a
 * measurement, and conflating them would mean an XP cosmetic silently
 * restyling the stats page.
 */
export function StatBar({
  label,
  value,
  accent = frost.ice,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.barRow}>
      <Text variant="label" color="fog" style={styles.barLabel}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${clamped}%`, backgroundColor: accent }]} />
      </View>
      <Text variant="mono" color="ghost" style={styles.barValue}>
        {String(Math.round(clamped)).padStart(3, '0')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  axisLabel: { position: 'absolute', alignItems: 'center' },
  axisValue: { fontSize: typography.size.label },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  barLabel: { width: 92 },
  barTrack: {
    flex: 1,
    height: 4,
    backgroundColor: frost.graphite,
    borderWidth: border.width,
    borderColor: border.color,
    overflow: 'hidden',
  },
  barFill: { height: '100%' },
  barValue: { width: 32, textAlign: 'right' },
});
