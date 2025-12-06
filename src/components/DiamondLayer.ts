import { ScatterplotLayer } from '@deck.gl/layers'
import type { ScatterplotLayerProps } from '@deck.gl/layers'

// Custom fragment shader that renders diamonds instead of circles
// Uses GLSL ES 1.0 for WebGL 1 compatibility (mobile devices)
const fs = `\
precision highp float;

varying vec4 vFillColor;

void main(void) {
  // Diamond shape: |x| + |y| <= 1
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float dist = abs(uv.x) + abs(uv.y);

  // Use alpha blending instead of discard for better mobile GPU compatibility
  float alpha = 1.0 - step(1.0, dist);

  if (alpha < 0.01) {
    discard;
  }

  gl_FragColor = vec4(vFillColor.rgb, vFillColor.a * alpha);
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
