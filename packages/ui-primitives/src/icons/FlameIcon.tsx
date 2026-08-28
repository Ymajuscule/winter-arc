import Svg, { Path } from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: string;
}

/** Design Law rule 3: custom thin-stroke SVG, 24x24, single color — never emoji. */
export function FlameIcon({ size = 24, color = '#7FB7D9' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c2.6 2.9 4.2 5.6 4.2 8.6a4.2 4.2 0 1 1-8.4 0c0-1.2.4-2.2 1.1-3.1.1 1.1.9 1.7 1.6 1.6-.7-1.9.2-3.7 1.5-7.1Z"
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
