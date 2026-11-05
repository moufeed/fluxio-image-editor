import type { Provider } from '@angular/core';

import { AnnotationInteractionController } from './annotation-interaction.controller';
import { BatchExportController } from './batch-export.controller';
import { BootstrapController } from './bootstrap.controller';
import { CloseController } from './close.controller';
import { CompareController } from './compare.controller';
import { EditorModeCoordinator } from './editor-mode.coordinator';
import { EditorPresentationStore } from './editor-presentation.store';
import { EditorShellContext } from './editor-shell.context';
import { EditorUiStore } from './editor-ui.store';
import { ExportController } from './export.controller';
import { KeyboardController } from './keyboard.controller';
import { ModeLifecycleController } from './mode-lifecycle.controller';
import { ToolbarController } from './toolbar.controller';
import { ColorPickerTool } from './tools/color-picker.tool';
import { CropTool } from './tools/crop.tool';
import { DrawingTool } from './tools/drawing.tool';
import { ImageAnnotationTool } from './tools/image-annotation.tool';
import { PathTool } from './tools/path.tool';
import { RasterPreviewTool } from './tools/raster-preview.tool';
import { ShapesTool } from './tools/shapes.tool';
import { TemplatesTool } from './tools/templates.tool';
import { TextTool } from './tools/text.tool';
import { TransformTool } from './tools/transform.tool';
import { WatermarkTool } from './tools/watermark.tool';
import { RulersTool } from './tools/rulers.tool';

/** Component-scoped providers for the editor shell composition root. */
export function provideEditorShell(): Provider[] {
  return [
    EditorUiStore,
    EditorShellContext,
    EditorModeCoordinator,
    AnnotationInteractionController,
    EditorPresentationStore,
    RasterPreviewTool,
    CropTool,
    TransformTool,
    TextTool,
    ShapesTool,
    DrawingTool,
    PathTool,
    ImageAnnotationTool,
    WatermarkTool,
    TemplatesTool,
    ColorPickerTool,
    RulersTool,
    ExportController,
    BatchExportController,
    CompareController,
    BootstrapController,
    ModeLifecycleController,
    ToolbarController,
    KeyboardController,
    CloseController,
  ];
}
