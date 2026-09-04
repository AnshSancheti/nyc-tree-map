/**
 * TreeLayer: a ScatterplotLayer whose fill color is computed on the GPU.
 *
 * Each tree carries three static instance attributes (onset, peak, drop day
 * with its per-tree offset already applied) and a static peak color. The only
 * thing that changes per frame is the `currentDOY` uniform, so advancing the
 * animation never touches a vertex buffer.
 *
 * The color math mirrors `getTreeColor` in utils/colors.ts. Keep the two in
 * sync; the unit test in utils/treeColor.test.ts checks them against each other.
 */

import { ScatterplotLayer } from '@deck.gl/layers'
import type { ScatterplotLayerProps } from '@deck.gl/layers'
import type { Accessor, DefaultProps } from '@deck.gl/core'
import type { ShaderModule } from '@luma.gl/shadertools'

type Rgb = [number, number, number]
type Timing = [number, number, number]

export type TreeLayerProps<DataT = unknown> = ScatterplotLayerProps<DataT> & {
  /** Day of year driving the phenology color. Uniform; changing it is free. */
  currentDOY?: number
  /** Draw squares (true) or circles (false). */
  square?: boolean
  /** [onset, peak, drop] per tree. */
  getTiming?: Accessor<DataT, Timing>
  /** Peak foliage RGB per tree. */
  getPeakColor?: Accessor<DataT, Rgb>
}

const uniformBlock = /* glsl */ `\
uniform phenologyUniforms {
  float currentDOY;
  float square;
} phenology;
`

const phenologyUniforms = {
  name: 'phenology',
  vs: uniformBlock,
  fs: uniformBlock,
  uniformTypes: {
    currentDOY: 'f32',
    square: 'f32',
  },
} as const satisfies ShaderModule

// Runs inside DECKGL_FILTER_COLOR in the vertex shader, right after deck.gl
// assigns vFillColor (and again for vLineColor, which we do not draw).
const colorInjection = /* glsl */ `\
{
  float d = phenology.currentDOY;
  float onset = instanceTiming.x;
  float peak = instanceTiming.y;
  float drop = instanceTiming.z;
  vec4 dimGreen = vec4(74.0, 90.0, 74.0, 200.0) / 255.0;
  vec4 brownGray = vec4(42.0, 42.0, 42.0, 150.0) / 255.0;
  vec4 peakColor = vec4(instancePeakColors, 1.0);
  vec4 c;
  if (d < onset) {
    c = dimGreen;
  } else if (d < peak) {
    float t = (d - onset) / max(peak - onset, 0.001);
    c = mix(dimGreen, peakColor, t * t);
  } else if (d < drop) {
    float t = (d - peak) / max(drop - peak, 0.001);
    float eased = 1.0 - (1.0 - t) * (1.0 - t);
    c = mix(peakColor, brownGray, eased);
  } else {
    float t = clamp((d - drop) / 7.0, 0.0, 1.0);
    c = mix(brownGray, vec4(0.0), t);
  }
  color = vec4(c.rgb, c.a * layer.opacity);
}
`

// Fragment shader: deck.gl's scatterplot fragment with one change, the
// distance metric switches between circle (length) and square (max-norm)
// based on a uniform. This replaces the old #define trick that mobile shader
// compilers rejected.
const fragmentShader = /* glsl */ `\
#version 300 es
#define SHADER_NAME tree-layer-fragment-shader
precision highp float;
in vec4 vFillColor;
in vec4 vLineColor;
in vec2 unitPosition;
in float innerUnitRadius;
in float outerRadiusPixels;
out vec4 fragColor;
void main(void) {
  geometry.uv = unitPosition;
  float unitDist = phenology.square > 0.5
    ? max(abs(unitPosition.x), abs(unitPosition.y))
    : length(unitPosition);
  float distToCenter = unitDist * outerRadiusPixels;
  float inShape = scatterplot.antialiasing
    ? smoothedge(distToCenter, outerRadiusPixels)
    : step(distToCenter, outerRadiusPixels);
  if (inShape == 0.0) {
    discard;
  }
  if (scatterplot.filled < 0.5) {
    discard;
  }
  fragColor = vFillColor;
  fragColor.a *= inShape;
  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`

const defaultProps: DefaultProps<TreeLayerProps> = {
  currentDOY: { type: 'number', value: 0 },
  square: true,
  getTiming: { type: 'accessor', value: [0, 0, 0] },
  getPeakColor: { type: 'accessor', value: [0, 0, 0] },
  // Fill/line colors come from the shader; keep deck's own color attributes
  // constant so it never allocates or uploads a per-instance color buffer.
  getFillColor: { type: 'accessor', value: [0, 0, 0, 0] },
  getLineColor: { type: 'accessor', value: [0, 0, 0, 0] },
  stroked: false,
}

export class TreeLayer<DataT = unknown> extends ScatterplotLayer<DataT, TreeLayerProps<DataT>> {
  static layerName = 'TreeLayer'
  static defaultProps = defaultProps

  getShaders() {
    const shaders = super.getShaders()
    return {
      ...shaders,
      fs: fragmentShader,
      modules: [...shaders.modules, phenologyUniforms],
      inject: {
        ...shaders.inject,
        'vs:#decl': 'in vec3 instanceTiming;\nin vec3 instancePeakColors;\n',
        'vs:DECKGL_FILTER_COLOR': colorInjection,
      },
    }
  }

  initializeState() {
    super.initializeState()
    this.getAttributeManager()!.addInstanced({
      instanceTiming: {
        size: 3,
        type: 'float32',
        accessor: 'getTiming',
      },
      instancePeakColors: {
        size: 3,
        type: 'unorm8',
        accessor: 'getPeakColor',
        defaultValue: [0, 0, 0],
      },
    })
  }

  draw(params: { uniforms: Record<string, unknown> }) {
    const model = (this.state as { model: { shaderInputs: { setProps: (p: unknown) => void } } }).model
    model.shaderInputs.setProps({
      phenology: {
        currentDOY: this.props.currentDOY ?? 0,
        square: this.props.square ? 1 : 0,
      },
    })
    super.draw(params)
  }
}
