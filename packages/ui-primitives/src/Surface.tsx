import { StyleSheet, View, type ViewProps } from 'react-native';
import { frost } from './tokens';

export type SurfaceVariant = 'void' | 'obsidian' | 'graphite';

export interface SurfaceProps extends ViewProps {
  variant?: SurfaceVariant;
}

/** Design Law rule 2: flat backgrounds only — no gradients here. */
export function Surface({ variant = 'obsidian', style, ...rest }: SurfaceProps) {
  return <View style={[styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  void: { backgroundColor: frost.void },
  obsidian: { backgroundColor: frost.obsidian },
  graphite: { backgroundColor: frost.graphite },
});
