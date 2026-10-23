import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { colors, iconSize } from '../theme';

/**
 * 아이콘 하나. 전부 24x24 격자에 선 두께 2로 그려서 굵기와 끝모양이 통일된다.
 * 이모지를 쓰지 않는 이유는 기기·OS마다 모양이 달라지기 때문이다.
 */
export type IconName =
  | 'bell'
  | 'bell-off'
  | 'plus'
  | 'chevron-right'
  | 'clock'
  | 'calendar'
  | 'close'
  | 'trash'
  | 'alert'
  | 'check-circle'
  | 'help'
  | 'refresh'
  | 'pill'
  | 'box'
  | 'box-check'
  | 'box-x'
  | 'box-question'
  | 'home'
  | 'history'
  | 'settings'
  | 'document'
  | 'share'
  | 'lock';

type Props = {
  name: IconName;
  size?: keyof typeof iconSize | number;
  color?: string;
};

export function Icon({ name, size = 'md', color = colors.text }: Props) {
  const px = typeof size === 'number' ? size : iconSize[size];
  const stroke = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={px} height={px} viewBox="0 0 24 24">
      {name === 'bell' && (
        <>
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...stroke} />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" {...stroke} />
        </>
      )}
      {name === 'bell-off' && (
        <>
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" {...stroke} />
          <Path d="M18.63 13A17.9 17.9 0 0 1 18 8M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" {...stroke} />
          <Path d="M18 8a6 6 0 0 0-9.33-5" {...stroke} />
          <Line x1="2" y1="2" x2="22" y2="22" {...stroke} />
        </>
      )}
      {name === 'plus' && (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...stroke} />
          <Line x1="5" y1="12" x2="19" y2="12" {...stroke} />
        </>
      )}
      {name === 'chevron-right' && <Path d="M9 18l6-6-6-6" {...stroke} />}
      {name === 'document' && (
        <>
          <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" {...stroke} />
          <Path d="M14 3v5h5" {...stroke} />
          <Path d="M9 13h6M9 17h4" {...stroke} />
        </>
      )}
      {name === 'share' && (
        <>
          <Path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" {...stroke} />
          <Path d="M12 3v13M8 7l4-4 4 4" {...stroke} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x="4" y="10" width="16" height="11" rx="2" {...stroke} />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3" {...stroke} />
        </>
      )}
      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="9" {...stroke} />
          <Path d="M12 7v5l3 2" {...stroke} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="2" {...stroke} />
          <Path d="M16 3v4M8 3v4M3 11h18" {...stroke} />
        </>
      )}
      {name === 'close' && (
        <>
          <Line x1="18" y1="6" x2="6" y2="18" {...stroke} />
          <Line x1="6" y1="6" x2="18" y2="18" {...stroke} />
        </>
      )}
      {name === 'trash' && (
        <>
          <Path d="M3 6h18" {...stroke} />
          <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" {...stroke} />
          <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...stroke} />
        </>
      )}
      {name === 'alert' && (
        <>
          <Path
            d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            {...stroke}
          />
          <Path d="M12 9v4M12 17h.01" {...stroke} />
        </>
      )}
      {name === 'check-circle' && (
        <>
          <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" {...stroke} />
          <Path d="M22 4 12 14.01l-3-3" {...stroke} />
        </>
      )}
      {name === 'help' && (
        <>
          <Circle cx="12" cy="12" r="9" {...stroke} />
          <Path d="M9.6 9.3a2.5 2.5 0 0 1 4.86.83c0 1.66-2.5 2.5-2.5 2.5M12 17h.01" {...stroke} />
        </>
      )}
      {name === 'refresh' && (
        <>
          <Path d="M21 4v6h-6" {...stroke} />
          <Path d="M3 20v-6h6" {...stroke} />
          <Path d="M4.4 9a8 8 0 0 1 13.2-3L21 10M3 14l3.4 4A8 8 0 0 0 19.6 15" {...stroke} />
        </>
      )}
      {name === 'home' && (
        <>
          <Path d="M3 10.5 12 3l9 7.5" {...stroke} />
          <Path d="M5.5 9.4V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.4" {...stroke} />
        </>
      )}
      {name === 'history' && (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="3" {...stroke} />
          <Path d="M16 3v4M8 3v4M3 11h18" {...stroke} />
          <Path d="M8.6 15.6l1.6 1.6 3.2-3.2" {...stroke} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx="12" cy="12" r="3.2" {...stroke} />
          <Path d="M19.4 14.4a1.6 1.6 0 0 0 .32 1.76l.06.06a2 2 0 1 1-2.82 2.82l-.06-.06a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-1 1.46V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9.1 19.4a1.6 1.6 0 0 0-1.76.32l-.06.06a2 2 0 1 1-2.82-2.82l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.46-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9.1a1.6 1.6 0 0 0-.32-1.76l-.06-.06a2 2 0 1 1 2.82-2.82l.06.06a1.6 1.6 0 0 0 1.76.32H9.1a1.6 1.6 0 0 0 1-1.46V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.46 1.6 1.6 0 0 0 1.76-.32l.06-.06a2 2 0 1 1 2.82 2.82l-.06.06a1.6 1.6 0 0 0-.32 1.76V9.1a1.6 1.6 0 0 0 1.46 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.46 1z" {...stroke} />
        </>
      )}
      {/* 복용 표시: 빈 네모 → 먹음(체크) / 못 먹음(X) / 모름(물음표) */}
      {name === 'box' && <Rect x="3.5" y="3.5" width="17" height="17" rx="4.5" {...stroke} />}
      {name === 'box-check' && (
        <>
          <Rect x="3.5" y="3.5" width="17" height="17" rx="4.5" {...stroke} />
          <Path d="M8 12.3l2.8 2.8L16.2 9.6" {...stroke} />
        </>
      )}
      {name === 'box-x' && (
        <>
          <Rect x="3.5" y="3.5" width="17" height="17" rx="4.5" {...stroke} />
          <Path d="M9 9l6 6M15 9l-6 6" {...stroke} />
        </>
      )}
      {name === 'box-question' && (
        <>
          <Rect x="3.5" y="3.5" width="17" height="17" rx="4.5" {...stroke} />
          <Path d="M9.8 9.6a2.3 2.3 0 0 1 4.4 .8c0 1.5-2.2 2.1-2.2 2.1" {...stroke} />
          <Path d="M12 16.4h.01" {...stroke} />
        </>
      )}
      {name === 'pill' && (
        <>
          {/* 또박 마크와 같은 모양: 비스듬한 캡슐 + 오른쪽 아래 시계.
              모든 좌표가 0~24 안에 들어가야 잘리지 않는다. */}
          <G transform="rotate(-45 9 9)">
            <Rect x="5" y="2" width="8" height="14" rx="4" {...stroke} />
            <Line x1="5" y1="9" x2="13" y2="9" {...stroke} />
          </G>
          <Circle cx="16.5" cy="16.5" r="5.5" {...stroke} fill={colors.bg} />
          <Path d="M16.5 13.6V16.5h2.3" {...stroke} />
        </>
      )}
    </Svg>
  );
}
