import { Component, inject } from '@angular/core';

import { EditorPresentationStore } from '../../editor-shell/editor-presentation.store';
import { FluxioAdjustmentsControls } from '../../tool-controls/adjustments-controls/adjustments-controls';
import { FluxioColorOverlayControls } from '../../tool-controls/color-overlay-controls/color-overlay-controls';
import { FluxioFillControls } from '../../tool-controls/fill-controls/fill-controls';
import { FluxioCropControls } from '../../tool-controls/crop-controls/crop-controls';
import { FluxioCropMaskControls } from '../../tool-controls/crop-mask-controls/crop-mask-controls';
import { FluxioDrawingControls } from '../../tool-controls/drawing-controls/drawing-controls';
import { FluxioEffectsControls } from '../../tool-controls/effects-controls/effects-controls';
import { FluxioEmojiControls } from '../../tool-controls/emoji-controls/emoji-controls';
import { FluxioFiltersControls } from '../../tool-controls/filters-controls/filters-controls';
import { FluxioFocusControls } from '../../tool-controls/focus-controls/focus-controls';
import { FluxioRedactControls } from '../../tool-controls/redact-controls/redact-controls';
import { FluxioFrameControls } from '../../tool-controls/frame-controls/frame-controls';
import { FluxioImageOverlayControls } from '../../tool-controls/image-overlay-controls/image-overlay-controls';
import { FluxioPathControls } from '../../tool-controls/path-controls/path-controls';
import { FluxioShapesControls } from '../../tool-controls/shapes-controls/shapes-controls';
import { FluxioTemplatesControls } from '../../tool-controls/templates-controls/templates-controls';
import { FluxioTextControls } from '../../tool-controls/text-controls/text-controls';
import { FluxioTransformControls } from '../../tool-controls/transform-controls/transform-controls';
import { FluxioWatermarkControls } from '../../tool-controls/watermark-controls/watermark-controls';
import { FluxioRulersControls } from '../../tool-controls/rulers-controls/rulers-controls';

/**
 * Active-tool inspector content. Each tool control is @defer-loaded so inactive
 * tools stay out of the initial editor chunk.
 */
@Component({
  selector: 'fluxio-tool-controls-host',
  imports: [
    FluxioCropControls,
    FluxioTransformControls,
    FluxioAdjustmentsControls,
    FluxioEffectsControls,
    FluxioFiltersControls,
    FluxioFocusControls,
    FluxioRedactControls,
    FluxioCropMaskControls,
    FluxioColorOverlayControls,
    FluxioFillControls,
    FluxioFrameControls,
    FluxioTextControls,
    FluxioEmojiControls,
    FluxioShapesControls,
    FluxioDrawingControls,
    FluxioPathControls,
    FluxioImageOverlayControls,
    FluxioWatermarkControls,
    FluxioRulersControls,
    FluxioTemplatesControls,
  ],
  templateUrl: './tool-controls-host.html',
  host: {
    class: 'fluxio-tool-controls-host',
    style: 'display: contents',
  },
})
export class ToolControlsHostComponent {
  protected readonly presentation = inject(EditorPresentationStore);
}
