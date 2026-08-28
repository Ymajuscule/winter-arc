import Svg, { Path } from 'react-native-svg';
import type { IconProps } from './FlameIcon';

export type ChevronDirection = 'left' | 'right' | 'up' | 'down';

const ROTATION: Record<ChevronDirection, number> = { right: 0, down: 90, left: 180, up: 270 };

export function ChevronIcon({
  size = 24,
  color = '#7FB7D9',
  direction = 'right',
}: IconProps & { direction?: ChevronDirection }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: [{ rotate: `${ROTATION[direction]}deg` }] }}
    >
      <Path
        d="M9 5l7 7-7 7"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
