import { ScatterplotLayer } from '@deck.gl/layers'
import type { ScatterplotLayerProps } from '@deck.gl/layers'

export class SquareLayer<DataT = unknown> extends ScatterplotLayer<DataT> {
  static layerName = 'SquareLayer'

  getShaders() {
    const shaders = super.getShaders()
    return {
      ...shaders,
      inject: {
        // Override smoothedge to always return 1.0 = no circle clipping = square
        // Use minimal syntax for mobile shader compiler compatibility
        'fs:#decl': '#define smoothedge(edge, aa) 1.0\n'
      }
    }
  }
}

// Keep DiamondLayer as alias for backwards compatibility
export const DiamondLayer = SquareLayer
export type DiamondLayerProps<DataT = unknown> = ScatterplotLayerProps<DataT>
