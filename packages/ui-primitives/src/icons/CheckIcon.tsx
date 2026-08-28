import Svg, { Path } from 'react-native-svg';
import type { IconProps } from './FlameIcon';

export function CheckIcon({ size = 24, color = '#7FB7D9' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12.5 9 17.5 20 6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
