import { ScatterplotLayer } from '@deck.gl/layers'
import type { ScatterplotLayerProps } from '@deck.gl/layers'

// Custom fragment shader that renders diamonds instead of circles
const fs = `#version 300 es
precision highp float;

in vec4 vFillColor;

out vec4 fragColor;

void main(void) {
  // Get distance from center in diamond coordinates (rotated 45 degrees)
  // Diamond shape: |x| + |y| <= 1
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float dist = abs(uv.x) + abs(uv.y);

  if (dist > 1.0) {
    discard;
  }

  fragColor = vFillColor;
}
`

export class DiamondLayer<DataT = unknown> extends ScatterplotLayer<DataT> {
  static layerName = 'DiamondLayer'

  getShaders() {
    const shaders = super.getShaders()
    return {
      ...shaders,
      fs,
    }
  }
}

export type DiamondLayerProps<DataT = unknown> = ScatterplotLayerProps<DataT>
