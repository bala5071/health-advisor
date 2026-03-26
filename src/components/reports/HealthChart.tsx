import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Rect, Polyline, Text as SvgText } from 'react-native-svg';
import Card from '../common/Card';
import { useTheme } from '../../theme/useTheme';

export type ChartPoint = { x: string; y: number };

export type ChartSeries = {
  name: string;
  type: 'line' | 'bar';
  data: ChartPoint[];
  color?: string;
};

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const PAD = { top: 20, left: 45, right: 20, bottom: 40 };

const innerW = CHART_WIDTH - PAD.left - PAD.right;
const innerH = CHART_HEIGHT - PAD.top - PAD.bottom;

export default function HealthChart({
  title,
  series,
}: {
  title: string;
  series: ChartSeries[];
}) {
  const theme = useTheme();

  const allData = useMemo(() => series.flatMap((s) => s.data), [series]);
  const labels = useMemo(
    () => Array.from(new Set(allData.map((d) => d.x))),
    [allData],
  );
  const maxY = useMemo(
    () => Math.max(...allData.map((d) => d.y), 1),
    [allData],
  );

  const toX = (index: number) =>
    PAD.left + (index / Math.max(labels.length - 1, 1)) * innerW;

  const toXBar = (index: number) =>
    PAD.left + (index / labels.length) * innerW;

  const toY = (value: number) =>
    PAD.top + innerH - (value / maxY) * innerH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: Math.round(t * maxY),
    y: PAD.top + innerH - t * innerH,
  }));

  return (
    <Card>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <View style={styles.chart}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Y axis ticks */}
          {yTicks.map((tick, idx) => (
            <React.Fragment key={`tick-${idx}`}>
              <Line
                x1={PAD.left}
                y1={tick.y}
                x2={PAD.left + innerW}
                y2={tick.y}
                stroke={theme.text}
                strokeOpacity={0.1}
                strokeWidth={1}
              />
              <SvgText
                x={PAD.left - 6}
                y={tick.y + 4}
                fontSize={8}
                fill={theme.text}
                textAnchor="end"
              >
                {tick.value}
              </SvgText>
            </React.Fragment>
          ))}

          {/* X axis labels */}
          {labels.map((label, idx) => (
            <SvgText
              key={`label-${idx}`}
              x={toX(idx)}
              y={PAD.top + innerH + 16}
              fontSize={8}
              fill={theme.text}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          ))}

          {/* Axes */}
          <Line
            x1={PAD.left} y1={PAD.top}
            x2={PAD.left} y2={PAD.top + innerH}
            stroke={theme.text} strokeOpacity={0.3} strokeWidth={1}
          />
          <Line
            x1={PAD.left} y1={PAD.top + innerH}
            x2={PAD.left + innerW} y2={PAD.top + innerH}
            stroke={theme.text} strokeOpacity={0.3} strokeWidth={1}
          />

          {/* Series */}
          {series.map((s, seriesIdx) => {
            if (s.type === 'bar') {
              const barW = (innerW / labels.length) * 0.6;
              return s.data.map((point, i) => {
                const idx = labels.indexOf(point.x);
                const barH = (point.y / maxY) * innerH;
                return (
                  <Rect
                    key={`bar-${seriesIdx}-${i}`}
                    x={toXBar(idx) + (innerW / labels.length) * 0.2}
                    y={toY(point.y)}
                    width={barW}
                    height={barH}
                    fill={s.color ?? theme.secondary}
                    opacity={0.55}
                  />
                );
              });
            } else {
              const points = s.data
                .map((point) => {
                  const idx = labels.indexOf(point.x);
                  return `${toX(idx)},${toY(point.y)}`;
                })
                .join(' ');
              return (
                <Polyline
                  key={`line-${seriesIdx}`}
                  points={points}
                  fill="none"
                  stroke={s.color ?? theme.primary}
                  strokeWidth={2}
                />
              );
            }
          })}
        </Svg>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  chart: {
    height: 160,
  },
});