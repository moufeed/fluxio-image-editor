import { Component, inject } from '@angular/core';

import type { ResizeSizePreset } from 'fluxio-image-editor/core';

import { ToolbarController } from '../../editor-shell/toolbar.controller';
import { TransformTool } from '../../editor-shell/tools/transform.tool';
import { ImmediateToolActionsComponent } from '../../chrome/tool-actions/immediate-tool-actions';
import { ToolControlsBase } from '../tool-controls-base';

@Component({
  selector: 'fluxio-transform-controls',
  imports: [ImmediateToolActionsComponent],
  templateUrl: './transform-controls.html',
})
export class FluxioTransformControls extends ToolControlsBase {
  private readonly transformTool = inject(TransformTool);
  private readonly toolbarController = inject(ToolbarController);

  protected readonly rotateMode = this.presentation.rotateMode;
  protected readonly resizeMode = this.presentation.resizeMode;
  protected readonly allowArbitraryAngle = this.presentation.allowArbitraryAngle;
  protected readonly arbitraryAngle = this.presentation.arbitraryAngle;
  protected readonly resizeWidth = this.presentation.resizeWidth;
  protected readonly resizeHeight = this.presentation.resizeHeight;
  protected readonly resizeLock = this.presentation.resizeLock;
  protected readonly resizePresetId = this.presentation.resizePresetId;
  protected readonly resizeSizePresets = this.presentation.resizeSizePresets;
  protected readonly designImageLocked = this.presentation.designImageLocked;

  protected actionIconPath(actionId: string): string | null {
    return this.toolbarController.actionIconPath(actionId);
  }

  protected onRotate(): void {
    void this.transformTool.rotate();
  }
  protected onFlipH(): void {
    void this.transformTool.flipHorizontal();
  }
  protected onFlipV(): void {
    void this.transformTool.flipVertical();
  }
  protected onAngleInput(value: number): void {
    this.transformTool.setAngle(value);
  }
  protected flushAngle(): void {
    this.transformTool.flushAngle();
  }
  protected closeRotateMode(): void {
    this.transformTool.closeRotate();
  }
  protected resizePresetLabel(preset: ResizeSizePreset): string {
    if (preset.labelKey) {
      const translated = this.t(preset.labelKey);
      if (translated !== preset.labelKey) {
        return translated;
      }
    }
    return preset.label;
  }

  protected onResizePreset(presetId: string): void {
    this.transformTool.applySizePreset(presetId);
  }
  protected onResizeWidthInput(value: number): void {
    this.transformTool.setResizeWidth(value);
  }
  protected onResizeHeightInput(value: number): void {
    this.transformTool.setResizeHeight(value);
  }
  protected flushResize(): void {
    this.transformTool.flushResize();
  }
  protected onResizeLockChange(locked: boolean): void {
    this.transformTool.setResizeLock(locked);
  }
  protected onDesignImageLockChange(locked: boolean): void {
    void this.transformTool.setImageLocked(locked);
  }
  protected closeResizeMode(): void {
    this.transformTool.closeResize();
  }
}
