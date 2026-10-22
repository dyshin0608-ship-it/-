import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import type { BodyRegion } from '../lib/drugs';
import { colors, spacing, type } from '../theme';

const BASE_FILL = '#E8EEF7';
const BASE_STROKE = '#B9CBE4';
const MARK_FILL = '#F9A8A8';
const MARK_STROKE = colors.danger;

type Props = {
  /** 빨갛게 칠할 영역. */
  regions: BodyRegion[];
  height?: number;
};

/**
 * 약이 쓰이는 몸의 부위를 그림으로 보여 준다.
 *
 * 그림은 설명을 돕는 보조 수단이다. 근거가 되는 문장은 바로 아래 효능효과
 * 원문이고, 그림은 거기에 적힌 부위만 칠한다.
 */
export function BodyMap({ regions, height = 240 }: Props) {
  const on = (region: BodyRegion) => regions.includes(region) || regions.includes('skin');
  const skin = (region: BodyRegion) => ({
    fill: on(region) ? MARK_FILL : BASE_FILL,
    stroke: on(region) ? MARK_STROKE : BASE_STROKE,
    strokeWidth: 1.6,
    strokeLinejoin: 'round' as const,
  });
  const detail = (region: BodyRegion) => ({
    fill: regions.includes(region) ? MARK_STROKE : BASE_STROKE,
  });
  const limbs = skin('limbs');

  return (
    <View style={styles.wrap}>
      <Svg width={height * 0.47} height={height} viewBox="0 0 140 300">
        {/* 다리 */}
        <Path d="M44 196 h26 l-3 86 c-1 7 -13 7 -14 0 z" {...limbs} />
        <Path d="M96 196 h-26 l3 86 c1 7 13 7 14 0 z" {...limbs} />
        {/* 팔 */}
        <Path d="M34 74 c-10 3 -15 11 -16 21 l-6 70 c-1 8 12 9 13 1 l14 -68 z" {...limbs} />
        <Path d="M106 74 c10 3 15 11 16 21 l6 70 c1 8 -12 9 -13 1 l-14 -68 z" {...limbs} />
        {/* 몸통 */}
        <Path d="M39 162 h62 l-5 34 h-52 z" {...skin('pelvis')} />
        <Path d="M36 124 h68 l-3 38 h-62 z" {...skin('abdomen')} />
        <Path
          d="M48 68 h44 c9 0 16 5 18 13 l2 43 h-84 l2 -43 c2 -8 9 -13 18 -13 z"
          {...skin('chest')}
        />
        <Rect x="63" y="52" width="14" height="18" {...skin('neck')} />
        {/* 머리 */}
        <Ellipse cx="49" cy="32" rx="4.5" ry="7.5" {...skin('ears')} />
        <Ellipse cx="91" cy="32" rx="4.5" ry="7.5" {...skin('ears')} />
        <Ellipse cx="70" cy="30" rx="19.5" ry="23" {...skin('head')} />
        {/* 눈·코·입 */}
        <Circle cx="63" cy="26" r="2.3" {...detail('eyes')} />
        <Circle cx="77" cy="26" r="2.3" {...detail('eyes')} />
        <Ellipse cx="70" cy="34" rx="2.5" ry="3.2" {...detail('nose')} />
        <Rect x="64" y="42" width="12" height="4.4" rx="2.2" {...detail('mouth')} />
      </Svg>
      <Text style={styles.caption}>빨갛게 표시된 곳에 쓰는 약입니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  caption: { ...type.caption, color: colors.textSecondary },
});
