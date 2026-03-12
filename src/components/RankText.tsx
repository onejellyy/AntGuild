import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  text: string;
  fill: string;
  stroke: string;
  fontSize?: number;
}

// 8-direction offsets that simulate a hard stroke outline.
// Each offset renders a copy of the text in the stroke color behind the fill layer.
const S = 2; // stroke radius in px
const OFFSETS: [number, number][] = [
  [-S, -S], [0, -S], [S, -S],
  [-S,  0],          [S,  0],
  [-S,  S], [0,  S], [S,  S],
];

export default function RankText({ text, fill, stroke, fontSize = 14 }: Props) {
  const baseStyle = {
    fontSize,
    fontWeight: '900' as const,
    lineHeight: fontSize * 1.25,
  };

  return (
    <View style={{ alignSelf: 'flex-start' }}>
      {/* Stroke layer — 8 copies positioned at offsets */}
      {OFFSETS.map(([x, y], i) => (
        <Text
          key={i}
          style={[
            baseStyle,
            {
              position: 'absolute',
              left: x,
              top: y,
              color: stroke,
            },
          ]}
          selectable={false}
        >
          {text}
        </Text>
      ))}
      {/* Fill layer — sits on top, sizes the container */}
      <Text style={[baseStyle, { color: fill }]}>{text}</Text>
    </View>
  );
}
