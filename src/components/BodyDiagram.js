import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, G } from 'react-native-svg';

const REGIONS = {
  Shoulders: { x: 95, y: 58, width: 110, height: 22, rx: 8 },
  Chest:     { x: 115, y: 84, width: 70, height: 40, rx: 6 },
  Arms:      { left: { x: 82, y: 80, width: 28, height: 70, rx: 10 }, right: { x: 190, y: 80, width: 28, height: 70, rx: 10 } },
  Core:      { x: 120, y: 128, width: 60, height: 42, rx: 6 },
  Legs:      { left: { x: 112, y: 178, width: 34, height: 90, rx: 10 }, right: { x: 154, y: 178, width: 34, height: 90, rx: 10 } },
};

const LABEL_POSITIONS = {
  Shoulders: { x: 40, y: 70, anchor: 'end' },
  Chest:     { x: 260, y: 104, anchor: 'start' },
  Arms:      { x: 40, y: 125, anchor: 'end' },
  Core:      { x: 260, y: 150, anchor: 'start' },
  Legs:      { x: 260, y: 225, anchor: 'start' },
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 122, b: 255 };
};

const getRegionColor = (region, data, colors) => {
  const info = data[region];
  if (!info || info.count === 0) return colors.border;
  const { r, g, b } = hexToRgb(colors.primary);
  const opacity = 0.2 + info.percentage * 0.8;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default function BodyDiagram({ data = {}, colors }) {
  const regionColor = (region) => getRegionColor(region, data, colors);

  return (
    <View style={styles.container}>
      <Svg width={300} height={300} viewBox="0 0 300 300">
        {/* Head */}
        <Circle cx={150} cy={30} r={22} fill={colors.border} />

        {/* Neck */}
        <Rect x={142} y={50} width={16} height={10} rx={4} fill={colors.border} />

        {/* Shoulders */}
        <Rect
          x={REGIONS.Shoulders.x} y={REGIONS.Shoulders.y}
          width={REGIONS.Shoulders.width} height={REGIONS.Shoulders.height}
          rx={REGIONS.Shoulders.rx}
          fill={regionColor('Shoulders')}
        />

        {/* Chest */}
        <Rect
          x={REGIONS.Chest.x} y={REGIONS.Chest.y}
          width={REGIONS.Chest.width} height={REGIONS.Chest.height}
          rx={REGIONS.Chest.rx}
          fill={regionColor('Chest')}
        />

        {/* Arms - Left */}
        <Rect
          x={REGIONS.Arms.left.x} y={REGIONS.Arms.left.y}
          width={REGIONS.Arms.left.width} height={REGIONS.Arms.left.height}
          rx={REGIONS.Arms.left.rx}
          fill={regionColor('Arms')}
        />
        {/* Arms - Right */}
        <Rect
          x={REGIONS.Arms.right.x} y={REGIONS.Arms.right.y}
          width={REGIONS.Arms.right.width} height={REGIONS.Arms.right.height}
          rx={REGIONS.Arms.right.rx}
          fill={regionColor('Arms')}
        />

        {/* Core */}
        <Rect
          x={REGIONS.Core.x} y={REGIONS.Core.y}
          width={REGIONS.Core.width} height={REGIONS.Core.height}
          rx={REGIONS.Core.rx}
          fill={regionColor('Core')}
        />

        {/* Legs - Left */}
        <Rect
          x={REGIONS.Legs.left.x} y={REGIONS.Legs.left.y}
          width={REGIONS.Legs.left.width} height={REGIONS.Legs.left.height}
          rx={REGIONS.Legs.left.rx}
          fill={regionColor('Legs')}
        />
        {/* Legs - Right */}
        <Rect
          x={REGIONS.Legs.right.x} y={REGIONS.Legs.right.y}
          width={REGIONS.Legs.right.width} height={REGIONS.Legs.right.height}
          rx={REGIONS.Legs.right.rx}
          fill={regionColor('Legs')}
        />
      </Svg>

      {/* Labels positioned around the body */}
      {Object.entries(LABEL_POSITIONS).map(([region, pos]) => {
        const info = data[region];
        const count = info ? info.count : 0;
        const isLeft = pos.anchor === 'end';
        return (
          <View
            key={region}
            style={[
              styles.label,
              { top: pos.y - 10, [isLeft ? 'left' : 'right']: isLeft ? pos.x - 75 : 300 - pos.x - 75 },
              isLeft ? styles.labelLeft : styles.labelRight,
            ]}
          >
            <Text style={[styles.labelName, { color: count > 0 ? colors.primary : colors.textSecondary }]}>
              {region}
            </Text>
            <Text style={[styles.labelCount, { color: colors.textSecondary }]}>
              {count > 0 ? `${count}x` : '--'}
            </Text>
          </View>
        );
      })}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Less</Text>
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((opacity, i) => {
          const { r, g, b } = hexToRgb(colors.primary);
          return (
            <View
              key={i}
              style={[styles.legendSquare, { backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})` }]}
            />
          );
        })}
        <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    width: 75,
  },
  labelLeft: {
    alignItems: 'flex-end',
  },
  labelRight: {
    alignItems: 'flex-start',
  },
  labelName: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelCount: {
    fontSize: 11,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  legendSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
});
