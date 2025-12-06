import { ScatterplotLayer } from '@deck.gl/layers'
import type { ScatterplotLayerProps } from '@deck.gl/layers'

// Custom fragment shader that renders squares instead of circles
// Point sprites are already square - we just output the color without clipping
// deck.gl 9.x uses WebGL 2, so we use GLSL 300 es
const fs = `#version 300 es
precision highp float;

uniform float opacity;

in vec4 vFillColor;

out vec4 fragColor;

void main(void) {
  // Output fill color directly - no circle clipping = square shape
  fragColor = vec4(vFillColor.rgb, vFillColor.a * opacity);
}
`

export class SquareLayer<DataT = unknown> extends ScatterplotLayer<DataT> {
  static layerName = 'SquareLayer'

  getShaders() {
    const shaders = super.getShaders()
    return {
      ...shaders,
      fs,
    }
  }
}

// Keep DiamondLayer as alias for backwards compatibility
export const DiamondLayer = SquareLayer
export type DiamondLayerProps<DataT = unknown> = ScatterplotLayerProps<DataT>
