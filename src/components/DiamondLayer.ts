import { ScatterplotLayer } from '@deck.gl/layers'
import type { ScatterplotLayerProps } from '@deck.gl/layers'

export class SquareLayer<DataT = unknown> extends ScatterplotLayer<DataT> {
  static layerName = 'SquareLayer'

  getShaders() {
    const shaders = super.getShaders()
    return {
      ...shaders,
      inject: {
        // Redefine smoothedge to always return 1.0 = no circle clipping = square
        'fs:#decl': `
          #define smoothedge(x, y) 1.0
        `
      }
    }
  }
}

// Keep DiamondLayer as alias for backwards compatibility
export const DiamondLayer = SquareLayer
export type DiamondLayerProps<DataT = unknown> = ScatterplotLayerProps<DataT>
